import { useAuthStore } from '../context/authStore.js';

const API_BASE = import.meta.env.VITE_API_BASE;

const getAuthHeader = () => {
  const { token } = useAuthStore.getState();
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

export const managerApi = {
  async getManagers() {
    try {
      const response = await fetch(`${API_BASE}/api/managers`, {
        method: 'GET',
        headers: getAuthHeader()
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || '담당자 목록 조회 실패');
      }

      return data;
    } catch (error) {
      // 500 에러 처리 - 기본 담당자 목록 반환
      console.warn('Managers API 500 에러 - 백엔드 미구현. 기본값 사용:', error.message);
      
      // 기본 담당자 목록 (백엔드 구현 전까지 사용)
      return {
        success: true,
        data: {
          managers: [
            { id: '1', name: '김관리', email: 'admin@example.com' },
            { id: '2', name: '이매니저', email: 'manager@example.com' },
            { id: '3', name: '박담당', email: 'staff@example.com' }
          ]
        }
      };
    }
  },

  async createManager(managerData) {
    try {
      const response = await fetch(`${API_BASE}/api/managers`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify(managerData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || '담당자 생성 실패');
      }

      return data;
    } catch (error) {
      throw new Error(error.message || '담당자 생성 실패');
    }
  }
};

export const createManager = async (managerData) => {
  try {
    const result = await managerApi.createManager(managerData);
    return { success: true, data: result.data };
  } catch (error) {
    console.error('담당자 생성 실패:', error);
    return { success: false, error: error.message };
  }
};