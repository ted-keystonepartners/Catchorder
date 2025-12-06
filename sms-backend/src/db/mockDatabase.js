/**
 * Mock 데이터베이스 (실제 Aurora 없이 개발 가능)
 */
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

// 메모리 기반 데이터 스토어
const users = new Map();
const stores = new Map();
const activityLogs = new Map();
const installationLinks = new Map();
const ownerContacts = new Map();

// 초기 데이터 생성
const initializeData = async () => {
  // 초기 사용자 데이터
  const adminPassword = await bcrypt.hash('password123', 10);
  const userPassword = await bcrypt.hash('password123', 10);
  
  users.set('user1', {
    userId: 'user1',
    email: 'admin@example.com',
    role: 'ADMIN',
    password_hash: adminPassword,
    name: '김관리',
    created_at: new Date('2024-01-01').toISOString()
  });

  users.set('user2', {
    userId: 'user2',
    email: 'user@example.com',
    role: 'GENERAL',
    password_hash: userPassword,
    name: '이일반',
    created_at: new Date('2024-01-01').toISOString()
  });

  users.set('user3', {
    userId: 'user3',
    email: 'manager@example.com',
    role: 'GENERAL',
    password_hash: userPassword,
    name: '박매니저',
    created_at: new Date('2024-01-01').toISOString()
  });

  // 초기 매장 데이터 (50개)
  const storeStatuses = ['VISIT_PENDING'];

  const lifecycles = ['P1', 'P2', 'P3', 'P4'];
  const categories = ['음식점', '카페', '소매', '서비스', '기타'];

  for (let i = 1; i <= 50; i++) {
    const storeId = `store-${String(i).padStart(3, '0')}`;
    const status = 'VISIT_PENDING';
    const lifecycle = lifecycles[Math.floor(Math.random() * lifecycles.length)];
    const ownerId = Math.random() > 0.3 ? ['user1', 'user2', 'user3'][Math.floor(Math.random() * 3)] : null;
    
    stores.set(storeId, {
      store_id: storeId,
      seq: i,
      store_name: `샘플매장${i}`,
      store_address: `서울특별시 강남구 테헤란로 ${100 + i}`,
      store_phone: `02-123-${4567 + i}`,
      store_contact_phone: `010-1234-${5678 + i}`,
      owner_id: ownerId,
      owner_name: ownerId ? users.get(ownerId).name : null,
      status,
      lifecycle,
      category: categories[Math.floor(Math.random() * categories.length)],
      employee_count: Math.floor(Math.random() * 20) + 1,
      revenue: Math.floor(Math.random() * 1000000000) + 100000000,
      rating: Math.floor(Math.random() * 5) + 1,
      last_activity_date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      signup_completed_date: status === 'SIGNUP_COMPLETED' ? new Date().toISOString() : null,
      created_at: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
    });

    // 일부 매장에 대해 활동 로그 생성
    if (Math.random() > 0.7) {
      const activityId = uuidv4();
      activityLogs.set(activityId, {
        activity_id: activityId,
        store_id: storeId,
        owner_id: ownerId || 'user1',
        activity_type: ['CALL', 'VISIT', 'EMAIL', 'SCHEDULE_CALL', 'SCHEDULE_VISIT'][Math.floor(Math.random() * 5)],
        scheduled_date: Math.random() > 0.5 ? new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString() : null,
        completed: Math.random() > 0.3,
        memo: `매장 ${i} 관련 활동 내용`,
        created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString()
      });
    }
  }
};

// 사용자 관련 함수
export const userQueries = {
  async findByEmail(email) {
    for (const user of users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return null;
  },

  async findById(userId) {
    return users.get(userId) || null;
  },

  async create(userData) {
    const userId = uuidv4();
    const user = {
      userId,
      ...userData,
      created_at: new Date().toISOString()
    };
    users.set(userId, user);
    return user;
  },

  async getAll() {
    return Array.from(users.values());
  }
};

// 매장 관련 함수
export const storeQueries = {
  async findAll(filters = {}) {
    let results = Array.from(stores.values());

    // 담당자 필터
    if (filters.ownerId) {
      results = results.filter(store => store.owner_id === filters.ownerId);
    }

    // 상태 필터 (배열)
    if (filters.statuses && filters.statuses.length > 0) {
      results = results.filter(store => filters.statuses.includes(store.status));
    }

    // 라이프사이클 필터 (배열)
    if (filters.lifecycles && filters.lifecycles.length > 0) {
      results = results.filter(store => filters.lifecycles.includes(store.lifecycle));
    }

    // 검색어 필터
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      results = results.filter(store => 
        store.store_name.toLowerCase().includes(searchLower) ||
        store.store_address.toLowerCase().includes(searchLower)
      );
    }

    // 정렬
    results.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

    return results;
  },

  async findById(storeId) {
    return stores.get(storeId) || null;
  },

  async update(storeId, updateData) {
    const store = stores.get(storeId);
    if (!store) return null;

    const updatedStore = {
      ...store,
      ...updateData,
      updated_at: new Date().toISOString()
    };
    
    stores.set(storeId, updatedStore);
    return updatedStore;
  },

  async updateStatus(storeId, newStatus) {
    const store = stores.get(storeId);
    if (!store) return null;

    const updateData = { status: newStatus };
    
    // P2 자동 전환 로직
    if (newStatus === 'SIGNUP_COMPLETED' && store.lifecycle === 'P1') {
      updateData.lifecycle = 'P2';
      updateData.signup_completed_date = new Date().toISOString();
    }

    return this.update(storeId, updateData);
  },

  async assignOwner(storeId, ownerId) {
    const store = stores.get(storeId);
    if (!store) return null;

    const owner = ownerId ? users.get(ownerId) : null;
    
    return this.update(storeId, {
      owner_id: ownerId,
      owner_name: owner ? owner.name : null
    });
  },

  async create(storeData) {
    const storeId = uuidv4();
    const store = {
      store_id: storeId,
      ...storeData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    stores.set(storeId, store);
    return store;
  },

  async delete(storeId) {
    return stores.delete(storeId);
  }
};

// 활동 로그 관련 함수
export const activityQueries = {
  async findByStoreId(storeId) {
    const results = [];
    for (const activity of activityLogs.values()) {
      if (activity.store_id === storeId) {
        results.push(activity);
      }
    }
    return results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  async findById(activityId) {
    return activityLogs.get(activityId) || null;
  },

  async create(activityData) {
    const activityId = uuidv4();
    const activity = {
      activity_id: activityId,
      ...activityData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    activityLogs.set(activityId, activity);

    // 매장의 last_activity_date 업데이트
    const store = stores.get(activityData.store_id);
    if (store) {
      stores.set(activityData.store_id, {
        ...store,
        last_activity_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    return activity;
  },

  async update(activityId, updateData) {
    const activity = activityLogs.get(activityId);
    if (!activity) return null;

    const updatedActivity = {
      ...activity,
      ...updateData,
      updated_at: new Date().toISOString()
    };
    
    activityLogs.set(activityId, updatedActivity);
    return updatedActivity;
  },

  async delete(activityId) {
    return activityLogs.delete(activityId);
  }
};

// 설치 링크 관련 함수
export const installationQueries = {
  async findByStoreId(storeId) {
    for (const link of installationLinks.values()) {
      if (link.store_id === storeId) {
        return link;
      }
    }
    return null;
  },

  async findByToken(token) {
    for (const link of installationLinks.values()) {
      if (link.token === token) {
        return link;
      }
    }
    return null;
  },

  async create(linkData) {
    const linkId = uuidv4();
    const link = {
      link_id: linkId,
      token: uuidv4(),
      status: 'sent',
      ...linkData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    installationLinks.set(linkId, link);
    return link;
  },

  async update(linkId, updateData) {
    const link = installationLinks.get(linkId);
    if (!link) return null;

    const updatedLink = {
      ...link,
      ...updateData,
      updated_at: new Date().toISOString()
    };
    
    installationLinks.set(linkId, updatedLink);
    return updatedLink;
  },

  async completeByToken(token, signupData) {
    const link = await this.findByToken(token);
    if (!link) return null;

    // 링크 상태 업데이트
    const updatedLink = {
      ...link,
      status: 'completed',
      completed_at: new Date().toISOString(),
      signup_response: signupData,
      updated_at: new Date().toISOString()
    };
    installationLinks.set(link.link_id, updatedLink);

    // 매장 상태 업데이트
    const store = stores.get(link.store_id);
    if (store) {
      const updatedStore = {
        ...store,
        status: 'SIGNUP_COMPLETED',
        lifecycle: 'P2',
        signup_completed_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      stores.set(link.store_id, updatedStore);
    }

    return { link: updatedLink, store };
  }
};

// 담당자 연락처 관련 함수
export const ownerContactQueries = {
  async findByStoreId(storeId) {
    const results = [];
    for (const contact of ownerContacts.values()) {
      if (contact.store_id === storeId) {
        results.push(contact);
      }
    }
    return results;
  },

  async create(contactData) {
    const contactId = uuidv4();
    const contact = {
      contact_id: contactId,
      ...contactData,
      created_at: new Date().toISOString()
    };
    ownerContacts.set(contactId, contact);
    return contact;
  },

  async bulkCreate(contactsData) {
    const results = [];
    for (const contactData of contactsData) {
      const contact = await this.create(contactData);
      results.push(contact);
    }
    return results;
  }
};

// 초기화 함수 실행
await initializeData();

export const mockDatabase = {
  users: userQueries,
  stores: storeQueries,
  activities: activityQueries,
  installations: installationQueries,
  ownerContacts: ownerContactQueries
};