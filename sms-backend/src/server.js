/**
 * Express 서버 메인 파일
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// 미들웨어
import { requestLogger } from './middleware/logger.js';
import { errorHandler } from './middleware/errorHandler.js';

// 라우트
import authRoutes from './routes/auth.js';
import storeRoutes from './routes/stores.js';
import activityRoutes from './routes/activities.js';
import installationRoutes from './routes/installation.js';
import uploadRoutes from './routes/upload.js';

// 환경 변수 로드
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS 설정
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:3000',
      'https://your-frontend-domain.com'
    ];
    // Lambda 환경에서는 origin이 없을 수 있음
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  exposedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// OPTIONS 요청 처리 (preflight)
app.options('*', cors(corsOptions));

// 기본 미들웨어
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 로깅 미들웨어
app.use(requestLogger);

// 헬스 체크 엔드포인트
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'SMS Backend API Server is running!',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// API 라우트 마운트
app.use('/api/auth', authRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/installation', installationRoutes);
app.use('/api/upload', uploadRoutes);

// 404 핸들러
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `엔드포인트를 찾을 수 없습니다: ${req.method} ${req.originalUrl}`,
      details: {}
    },
    timestamp: new Date().toISOString()
  });
});

// 에러 핸들러 (마지막에 등록)
app.use(errorHandler);

// Lambda 환경이 아닐 때만 서버 시작
if (process.env.AWS_LAMBDA_FUNCTION_NAME === undefined) {
  app.listen(PORT, () => {
    console.log('🚀=================================🚀');
    console.log(`🚀 SMS Backend Server Started! 🚀`);
    console.log('🚀=================================🚀');
    console.log(`📡 Server running on http://localhost:${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📊 Mock Database: ${process.env.USE_MOCK_DB === 'true' ? 'Enabled' : 'Disabled'}`);
    console.log('🚀=================================🚀');
    console.log('📋 Available Endpoints:');
    console.log('   GET  / - Health check');
    console.log('   POST /api/auth/login - User login');
  console.log('   GET  /api/stores - Store list');
  console.log('   GET  /api/stores/:id - Store details');
  console.log('   POST /api/activities - Create activity');
  console.log('   POST /api/installation/send-url - Send URL');
  console.log('   POST /api/upload/stores - Upload stores');
    console.log('🚀=================================🚀');
  });
}

// Export for Lambda
export default app;

// 프로세스 종료 시 정리 작업
process.on('SIGINT', () => {
  console.log('\n🛑 Server is shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Server is shutting down gracefully...');
  process.exit(0);
});