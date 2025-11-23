import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = 3001;
const JWT_SECRET = 'your-jwt-secret-key';

// Middleware
app.use(cors());
app.use(express.json());

// Mock users database (passwords are plain text for simplicity)
const users = [
  {
    id: 'user1',
    email: 'admin@example.com',
    password: 'password123',
    name: '관리자',
    role: 'ADMIN'
  },
  {
    id: 'user2',
    email: 'user1@example.com',
    password: 'password123',
    name: '일반 사용자',
    role: 'USER'
  },
  {
    id: 'admin1',
    email: 'admin@catchtable.co.kr',
    password: 'catchtable1!',
    name: '캐치테이블 관리자',
    role: 'ADMIN'
  }
];

// Mock stores database
const stores = [
  {
    id: '1',
    name: '토스트 카페',
    address: '서울시 강남구 역삼동 123-45',
    phone: '02-1234-5678',
    status: 'SIGNUP_COMPLETED',
    ownerId: 'user1',
    createdAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: '2',
    name: '미스터 피자',
    address: '서울시 서초구 서초동 456-78',
    phone: '02-2345-6789',
    status: 'ADOPTION_CONFIRMED',
    ownerId: 'user1',
    createdAt: '2024-01-02T00:00:00.000Z'
  },
  {
    id: '3',
    name: '한우마을',
    address: '서울시 송파구 잠실동 789-12',
    phone: '02-3456-7890',
    status: 'IN_PROGRESS',
    ownerId: 'user2',
    createdAt: '2024-01-03T00:00:00.000Z'
  },
  {
    id: '4',
    name: '스시 야마다',
    address: '서울시 광진구 건대입구 321-54',
    phone: '02-4567-8901',
    status: 'PRE_INTRODUCTION',
    ownerId: null,
    createdAt: '2024-01-04T00:00:00.000Z'
  },
  {
    id: '5',
    name: '파스타 하우스',
    address: '서울시 마포구 홍대 987-65',
    phone: '02-5678-9012',
    status: 'IN_PROGRESS',
    ownerId: 'user1',
    createdAt: '2024-01-05T00:00:00.000Z'
  },
  {
    id: 'ed582fca-44fc-4206-86d1-1f8590dfe05e',
    name: '테스트 매장',
    address: '서울시 테스트구 테스트동 123-45',
    phone: '02-9999-0000',
    status: 'SIGNUP_COMPLETED',
    ownerId: 'user1',
    createdAt: '2024-01-06T00:00:00.000Z'
  }
];

// Data storage paths
const DATA_DIR = path.join(process.cwd(), 'data');
const CONSENT_LINKS_FILE = path.join(DATA_DIR, 'consent-links.json');
const CONSENT_RESPONSES_FILE = path.join(DATA_DIR, 'consent-responses.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load existing data or create empty files
const loadConsentLinks = () => {
  if (fs.existsSync(CONSENT_LINKS_FILE)) {
    try {
      const data = fs.readFileSync(CONSENT_LINKS_FILE, 'utf8');
      return new Map(Object.entries(JSON.parse(data)));
    } catch (error) {
      console.error('Error loading consent links:', error);
      return new Map();
    }
  }
  return new Map();
};

const loadConsentResponses = () => {
  if (fs.existsSync(CONSENT_RESPONSES_FILE)) {
    try {
      const data = fs.readFileSync(CONSENT_RESPONSES_FILE, 'utf8');
      return new Map(Object.entries(JSON.parse(data)));
    } catch (error) {
      console.error('Error loading consent responses:', error);
      return new Map();
    }
  }
  return new Map();
};

// Save data to files
const saveConsentLinks = (consentLinks) => {
  try {
    const data = Object.fromEntries(consentLinks);
    fs.writeFileSync(CONSENT_LINKS_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving consent links:', error);
  }
};

const saveConsentResponses = (consentResponses) => {
  try {
    const data = Object.fromEntries(consentResponses);
    fs.writeFileSync(CONSENT_RESPONSES_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving consent responses:', error);
  }
};

// Initialize data storage
let consentLinks = loadConsentLinks();
let consentResponses = loadConsentResponses();

// Helper function to generate consent link
const generateConsentLink = (storeId) => {
  // Check if store already has an active link
  const existingLink = Array.from(consentLinks.values())
    .find(link => link.store_id === storeId && link.is_active);
  
  if (existingLink) {
    console.log(`📋 기존 링크 반환: ${existingLink.consent_url}`);
    return existingLink;
  }

  const token = `consent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const linkData = {
    link_id: `link_${Date.now()}`,
    token: token,
    store_id: storeId,
    consent_url: `http://localhost:5173/consent/${token}`,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
    is_active: true
  };
  
  consentLinks.set(token, linkData);
  saveConsentLinks(consentLinks);
  return linkData;
};

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Login
app.post('/api/auth/login', (req, res) => {
  try {
    console.log('🔍 로그인 요청 데이터:', req.body);
    const { email, password } = req.body;
    console.log('🔍 추출된 데이터:', { email, password: password ? '***' : 'undefined' });

    if (!email || !password) {
      console.log('❌ 이메일 또는 비밀번호 누락');
      return res.status(400).json({ message: '이메일과 비밀번호를 입력해주세요.' });
    }

    const user = users.find(u => u.email === email);
    if (!user) {
      console.log(`❌ 사용자를 찾을 수 없음: ${email}`);
      return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    console.log('🔍 사용자 정보:', { email: user.email, storedPassword: user.password, inputPassword: password });
    if (password !== user.password) {
      console.log('❌ 비밀번호 불일치');
      return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role,
        name: user.name 
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// Get current user
app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = users.find(u => u.id === req.user.userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role
  });
});

// Get stores
app.get('/api/stores', authenticateToken, (req, res) => {
  try {
    // For admin users, return all stores
    // For regular users, return only their assigned stores
    let filteredStores = stores;
    
    if (req.user.role !== 'ADMIN') {
      filteredStores = stores.filter(store => store.ownerId === req.user.userId);
    }

    res.json(filteredStores);
  } catch (error) {
    console.error('Get stores error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// Get store by ID
app.get('/api/stores/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const store = stores.find(s => s.id === id);

    if (!store) {
      return res.status(404).json({ message: '매장을 찾을 수 없습니다.' });
    }

    // Check authorization
    if (req.user.role !== 'ADMIN' && store.ownerId !== req.user.userId) {
      return res.status(403).json({ message: '접근 권한이 없습니다.' });
    }

    res.json(store);
  } catch (error) {
    console.error('Get store error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// === CONSENT FORM API ENDPOINTS ===

// Create consent link (Admin only)
app.post('/api/consent/create-link', authenticateToken, (req, res) => {
  try {
    const { storeId } = req.body;
    
    if (!storeId) {
      return res.status(400).json({ message: '매장 ID가 필요합니다.' });
    }

    // Check if store exists
    const store = stores.find(s => s.id === storeId);
    if (!store) {
      return res.status(404).json({ message: '매장을 찾을 수 없습니다.' });
    }

    // Generate consent link
    const linkData = generateConsentLink(storeId);
    
    console.log(`📝 동의서 링크 생성됨: ${linkData.consent_url}`);
    
    res.json({
      data: {
        link_id: linkData.link_id,
        token: linkData.token,
        consent_url: linkData.consent_url,
        expires_at: linkData.expires_at,
        message: "링크를 복사해서 고객에게 전달하세요"
      }
    });

  } catch (error) {
    console.error('Create consent link error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// Get consent form data by storeId (Public - no auth required)  
app.get('/api/consent/form/:storeId', (req, res) => {
  try {
    const { storeId } = req.params;
    
    if (!storeId) {
      return res.status(400).json({ success: false, message: '매장 ID가 필요합니다.' });
    }

    // Find store data
    const store = stores.find(s => s.id === storeId);
    if (!store) {
      return res.status(404).json({ success: false, message: '매장 정보를 찾을 수 없습니다.' });
    }

    const formData = {
      link_id: `link_${storeId}`,
      token: storeId,
      store_name: store.name,
      store_phone: store.phone,
      owner_name: "김영업", // Mock owner name
      form_fields: {
        respondent_name: "",
        respondent_phone: "",
        respondent_position: "",
        remote_install_date: "",
        remote_install_time: "",
        table_count: "",
        sticker_type: "",
        design_type: "",
        preferred_color: "",
        terms_agreement: false
      }
    };

    console.log(`📖 동의서 폼 조회 (storeId): ${storeId} - ${store.name}`);
    
    res.json({ success: true, data: formData });

  } catch (error) {
    console.error('Get consent form error:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// Get consent form data by token (Public - no auth required) - Legacy support
app.get('/api/consent/form/token/:token', (req, res) => {
  try {
    const { token } = req.params;
    
    if (!token) {
      return res.status(400).json({ message: '토큰이 필요합니다.' });
    }

    // Find consent link
    const linkData = consentLinks.get(token);
    if (!linkData) {
      return res.status(404).json({ message: '유효하지 않거나 만료된 링크입니다.' });
    }

    // Check if expired
    if (new Date() > new Date(linkData.expires_at)) {
      return res.status(410).json({ message: '만료된 링크입니다.' });
    }

    // Find store data
    const store = stores.find(s => s.id === linkData.store_id);
    if (!store) {
      return res.status(404).json({ message: '매장 정보를 찾을 수 없습니다.' });
    }

    const formData = {
      link_id: linkData.link_id,
      token: linkData.token,
      store_name: store.name,
      store_phone: store.phone,
      owner_name: "김영업", // Mock owner name
      form_fields: {
        respondent_name: "",
        respondent_phone: "",
        respondent_position: "",
        remote_install_date: "",
        table_count: "",
        sticker_type: "",
        design_type: "",
        preferred_color: "",
        terms_agreement: false
      }
    };

    console.log(`📖 동의서 폼 조회: ${token}`);
    
    res.json({ data: formData });

  } catch (error) {
    console.error('Get consent form error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// Submit consent form (Public - no auth required)
app.post('/api/consent/submit', (req, res) => {
  try {
    const { token, store_id, ...formData } = req.body;
    
    // token과 store_id 중 하나를 사용 (고정 URL 방식에서는 token이 storeId)
    const storeIdToUse = token || store_id;
    
    if (!storeIdToUse) {
      return res.status(400).json({ success: false, message: '매장 ID가 필요합니다.' });
    }

    // Find store data
    const store = stores.find(s => s.id === storeIdToUse);
    if (!store) {
      return res.status(404).json({ success: false, message: '매장 정보를 찾을 수 없습니다.' });
    }

    // Validate required fields
    const requiredFields = [
      'respondent_name',
      'respondent_phone', 
      'respondent_position',
      'remote_install_date',
      'remote_install_time',
      'table_count',
      'sticker_type',
      'design_type',
      'terms_agreement'
    ];

    for (const field of requiredFields) {
      if (!formData[field] || formData[field] === '') {
        return res.status(400).json({ success: false, message: `${field} 필드가 필요합니다.` });
      }
    }

    // Create response record
    const responseId = `response_${Date.now()}`;
    const responseData = {
      response_id: responseId,
      link_id: `link_${storeIdToUse}`,
      token: storeIdToUse,
      store_id: storeIdToUse,
      ...formData,
      submitted_at: new Date().toISOString()
    };

    // Store response
    consentResponses.set(responseId, responseData);
    saveConsentResponses(consentResponses);

    console.log(`✅ 동의서 제출 완료: ${responseId}`, {
      store_id: storeIdToUse,
      store_name: store.name,
      respondent: formData.respondent_name,
      phone: formData.respondent_phone
    });

    res.json({
      success: true,
      data: {
        response_id: responseId,
        submitted_at: responseData.submitted_at
      }
    });

  } catch (error) {
    console.error('Submit consent form error:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// Get consent responses for a store (Admin only)
app.get('/api/stores/:storeId/consent-responses', authenticateToken, (req, res) => {
  try {
    const { storeId } = req.params;
    
    // Check if store exists
    const store = stores.find(s => s.id === storeId);
    if (!store) {
      return res.status(404).json({ message: '매장을 찾을 수 없습니다.' });
    }

    // Check authorization
    if (req.user.role !== 'ADMIN' && store.ownerId !== req.user.userId) {
      return res.status(403).json({ message: '접근 권한이 없습니다.' });
    }

    // Find all responses for this store
    const responses = Array.from(consentResponses.values())
      .filter(response => response.store_id === storeId)
      .map(response => ({
        response_id: response.response_id,
        respondent_name: response.respondent_name,
        respondent_phone: response.respondent_phone,
        respondent_position: response.respondent_position,
        remote_install_date: response.remote_install_date,
        remote_install_time: response.remote_install_time,
        table_count: response.table_count,
        sticker_type: response.sticker_type,
        design_type: response.design_type,
        preferred_color: response.preferred_color,
        terms_agreement: response.terms_agreement,
        note: response.note || '',
        submitted_at: response.submitted_at,
        link_id: response.link_id,
        token: response.token,
        store_id: response.store_id
      }))
      .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));

    // Find link info for this store
    const linkInfo = Array.from(consentLinks.values())
      .find(link => link.store_id === storeId);

    const result = {
      responses: responses,
      total_count: responses.length,
      link_info: linkInfo ? {
        created_at: linkInfo.created_at,
        expires_at: linkInfo.expires_at,
        is_active: linkInfo.is_active && new Date() < new Date(linkInfo.expires_at)
      } : null
    };

    console.log(`📊 동의서 현황 조회: Store ${storeId}, ${responses.length}개 응답`);
    
    res.json({ data: result });

  } catch (error) {
    console.error('Get consent responses error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: '서버 오류가 발생했습니다.' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'API endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📝 Available endpoints:`);
  console.log(`   POST /api/auth/login`);
  console.log(`   GET  /api/auth/me`);
  console.log(`   GET  /api/stores`);
  console.log(`   GET  /api/stores/:id`);
  console.log(`   GET  /api/health`);
  console.log(`\n📋 Consent Form endpoints:`);
  console.log(`   POST /api/consent/create-link (Auth required)`);
  console.log(`   GET  /api/consent/form/:token (Public)`);
  console.log(`   POST /api/consent/submit (Public)`);
  console.log(`   GET  /api/stores/:storeId/consent-responses (Auth required)`);
  console.log(`\n👤 Test accounts:`);
  console.log(`   Admin: admin@example.com / password123`);
  console.log(`   User:  user1@example.com / password123`);
});