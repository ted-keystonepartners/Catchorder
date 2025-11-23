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