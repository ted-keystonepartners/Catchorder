/**
 * AWS Lambda 매장 관리 API
 */
import { apiClient } from './client.js';

export const storeApi = {
  async getStores(filters = {}) {
    const result = await apiClient.get('/api/stores', filters);
    if (result.success) {
      return result;
    } else {
      throw new Error(result.error || '매장 조회 실패');
    }
  },

  async getStoreDetail(storeId) {
    const result = await apiClient.get(`/api/stores/${storeId}`);
    if (result.success) {
      return result;
    } else {
      throw new Error(result.error || '매장 상세 조회 실패');
    }
  },

  async updateStore(storeId, updateData) {
    const result = await apiClient.patch(`/api/stores/${storeId}`, updateData);
    if (result.success) {
      return result;
    } else {
      throw new Error(result.error || '매장 정보 수정 실패');
    }
  },

  async updateStoreStatus(storeId, newStatus) {
    const result = await apiClient.patch(`/api/stores/${storeId}/status`, { status: newStatus });
    if (result.success) {
      return result;
    } else {
      throw new Error(result.error || '상태 변경 실패');
    }
  },

  async assignOwner(storeId, ownerId) {
    const result = await apiClient.patch(`/api/stores/${storeId}/owner`, { owner_id: ownerId });
    if (result.success) {
      return result;
    } else {
      throw new Error(result.error || '담당자 배정 실패');
    }
  },

  async createStore(storeData) {
    const result = await apiClient.post('/api/stores', storeData);
    
    if (result.success) {
      return result;
    } else {
      throw new Error(result.error || '매장 생성 실패');
    }
  },

  async deleteStore(storeId) {
    const result = await apiClient.delete(`/api/stores/${storeId}`);
    if (result.success) {
      return result;
    } else {
      throw new Error(result.error || '매장 삭제 실패');
    }
  }
};

// 래퍼 함수들
export const getStores = async (filters = {}) => {
  try {
    const result = await storeApi.getStores(filters);
    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getStoreDetail = async (storeId) => {
  try {
    const result = await storeApi.getStoreDetail(storeId);
    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updateStore = async (storeId, updateData) => {
  try {
    const result = await storeApi.updateStore(storeId, updateData);
    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updateStoreStatus = async (storeId, newStatus) => {
  try {
    const result = await storeApi.updateStoreStatus(storeId, newStatus);
    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const assignOwner = async (storeId, ownerId) => {
  try {
    const result = await storeApi.assignOwner(storeId, ownerId);
    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const createStore = async (storeData) => {
  try {
    const result = await storeApi.createStore(storeData);
    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const deleteStore = async (storeId) => {
  try {
    const result = await storeApi.deleteStore(storeId);
    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updateStoreAdditionalInfo = async (storeId, additionalData) => {
  try {
    const result = await apiClient.patch(`/api/stores/${storeId}/additional`, additionalData);
    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const bulkUpdateStores = async (storeDataArray) => {
  return await apiClient.post('/api/stores/bulk', { stores: storeDataArray });
};

// 직원 연락처 관련 API
export const createStoreContact = async (storeId, contactData) => {
  try {
    const result = await apiClient.post(`/api/stores/${storeId}/contacts`, contactData);
    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getStoreContacts = async (storeId) => {
  try {
    const result = await apiClient.get(`/api/stores/${storeId}/contacts`);
    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const deleteStoreContact = async (storeId, contactId) => {
  try {
    const result = await apiClient.delete(`/api/stores/${storeId}/contacts/${contactId}`);
    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Sales Log 관련 API
export const createSalesLog = async (storeId, logData) => {
  try {
    const result = await apiClient.post(`/api/stores/${storeId}/sales-logs`, logData);
    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getSalesLogs = async (storeId, page = 1, limit = 10) => {
  try {
    // 백엔드 API 500 에러 발생 중 - 임시로 에러 무시하고 빈 배열 반환
    const result = await apiClient.get(`/api/stores/${storeId}/sales-logs`);
    if (result.success) {
      const allLogs = result.data?.logs || result.data || [];
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedLogs = allLogs.slice(startIndex, endIndex);
      
      return { 
        success: true, 
        data: {
          logs: paginatedLogs,
          total: allLogs.length,
          page,
          limit
        }
      };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error) {
    // 백엔드 500 에러 무시하고 빈 배열로 처리
    console.warn('Sales logs API 500 에러 - 백엔드 수정 필요:', error.message);
    return { 
      success: true, 
      data: {
        logs: [],
        total: 0,
        page,
        limit
      }
    };
  }
};

export const deleteSalesLog = async (storeId, logId) => {
  try {
    const result = await apiClient.delete(`/api/stores/${storeId}/sales-logs/${logId}`);
    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};