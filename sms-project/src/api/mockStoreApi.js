/**
 * Mock Store API for development
 */

export const updateStoreAdditionalInfo = async (storeId, additionalData) => {
  // 개발 환경에서 Mock 응답 반환
  console.log('Mock API: updateStoreAdditionalInfo', storeId, additionalData);
  
  // 실제 API와 같은 응답 구조 반환
  return {
    success: true,
    data: {
      id: storeId,
      ...additionalData,
      updated_at: new Date().toISOString()
    }
  };
};

export const updateStore = async (storeId, storeData) => {
  console.log('Mock API: updateStore', storeId, storeData);
  
  return {
    success: true,
    data: {
      store: {
        id: storeId,
        ...storeData,
        updated_at: new Date().toISOString()
      }
    }
  };
};