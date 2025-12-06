/**
 * 일정 관리 API
 */

import { apiClient, sequentialExecute } from './client.js';

/**
 * 일정 추가
 * @param {string} storeId - 매장 ID
 * @param {Object} scheduleData - 일정 데이터
 * @param {string} scheduleData.visit_date - 방문 날짜 (YYYY-MM-DD)
 * @param {string} scheduleData.visit_time - 방문 시간 (HH:MM)
 * @param {string} scheduleData.visit_purpose - 방문 목적
 * @param {string} scheduleData.visit_type - 방문 타입 (first|repeat)
 * @returns {Promise<Object>} 생성된 일정 정보
 */
export const createSchedule = async (storeId, scheduleData) => {
  if (!storeId) {
    throw new Error('매장 ID가 필요합니다.');
  }


  const submitData = {
    store_id: storeId,
    visit_date: scheduleData.visit_date,
    visit_time: scheduleData.visit_time,
    visit_purpose: scheduleData.visit_purpose,
    visit_type: scheduleData.visit_type
  };

  const result = await apiClient.post('/api/schedules', submitData);

  if (result.success) {
    return result.data;
  } else {
    throw new Error(result.error || '일정 추가에 실패했습니다.');
  }
};

/**
 * 일정 조회
 * @param {string} storeId - 매장 ID
 * @param {string} month - 조회할 월 (YYYY-MM, 선택사항)
 * @returns {Promise<Array>} 일정 목록
 */
export const getSchedules = async (storeId, month) => {
  if (!storeId) {
    throw new Error('매장 ID가 필요합니다.');
  }


  const url = month 
    ? `/api/schedules/${storeId}?month=${month}`
    : `/api/schedules/${storeId}`;

  const result = await apiClient.get(url);

  if (result.success) {
    return result.data?.schedules || result.data || [];
  } else {
    throw new Error(result.error || '일정 조회에 실패했습니다.');
  }
};

/**
 * 일정 수정
 * @param {string} scheduleId - 일정 ID
 * @param {Object} scheduleData - 수정할 일정 데이터
 * @param {string} scheduleData.visit_date - 방문 날짜 (YYYY-MM-DD)
 * @param {string} scheduleData.visit_time - 방문 시간 (HH:MM)
 * @param {string} scheduleData.visit_purpose - 방문 목적
 * @param {string} scheduleData.visit_type - 방문 타입 (first|repeat)
 * @param {string} scheduleData.status - 일정 상태 (선택사항)
 * @returns {Promise<Object>} 수정된 일정 정보
 */
export const updateSchedule = async (scheduleId, scheduleData) => {
  if (!scheduleId) {
    throw new Error('일정 ID가 필요합니다.');
  }


  const result = await apiClient.put(`/api/schedules/update/${scheduleId}`, scheduleData);

  if (result.success) {
    return result.data;
  } else {
    throw new Error(result.error || '일정 수정에 실패했습니다.');
  }
};

/**
 * 일정 삭제
 * @param {string} scheduleId - 일정 ID
 * @param {string} storeId - 매장 ID
 * @returns {Promise<Object>} 삭제 결과
 */
export const deleteSchedule = async (scheduleId, storeId) => {
  if (!scheduleId) {
    throw new Error('일정 ID가 필요합니다.');
  }

  if (!storeId) {
    throw new Error('매장 ID가 필요합니다.');
  }

  const result = await apiClient.delete(`/api/schedules/delete/${scheduleId}?storeId=${storeId}`);
  
  if (!result.success) {
    throw new Error(result.error?.message || '일정 삭제에 실패했습니다.');
  }
  
  return result.data;
};

/**
 * 방문 타입 라벨
 */
export const VISIT_TYPE_LABELS = {
  first: '첫방문',
  repeat: '재방문'
};

/**
 * 방문 타입 옵션
 */
export const VISIT_TYPE_OPTIONS = [
  { value: 'first', label: '첫방문' },
  { value: 'repeat', label: '재방문' }
];

/**
 * 모든 매장의 일정 조회
 * ADMIN 사용자는 /api/schedules/all 엔드포인트를 사용
 * @param {Array} stores - 매장 목록 (ADMIN이 아닌 경우 사용)
 * @param {string} month - 조회할 월 (YYYY-MM)
 * @param {boolean} isAdmin - 관리자 여부
 * @returns {Promise<Array>} 모든 매장의 일정 목록
 */
export const getAllSchedules = async (stores, month, isAdmin = false) => {
  // ADMIN 사용자는 전체 일정 조회 API 사용
  if (isAdmin) {
    try {
      const url = `/api/schedules/all?month=${month}`;
      const result = await apiClient.get(url);
      
      if (result.success) {
        const schedules = result.data?.schedules || result.data || [];
        // stores 데이터에서 매장명 매핑
        const schedulesWithStoreName = schedules.map(schedule => {
          // 다양한 ID 필드로 매장 찾기
          const store = stores.find(s => {
            const storeId = s.store_id || s.storeId || s.id || s.seq;
            const scheduleStoreId = schedule.store_id || schedule.storeId;
            return String(storeId) === String(scheduleStoreId);
          });
          
          // 매장명 우선순위: API 응답 -> store 객체 -> 기본값
          const storeName = schedule.store_name || 
                          schedule.storeName || 
                          store?.store_name || 
                          store?.storeName || 
                          store?.name || 
                          '매장명 없음';
          
          // 담당자 정보도 포함
          const ownerId = schedule.owner_id || schedule.ownerId || store?.owner_id || store?.ownerId;
          
          return {
            ...schedule,
            store_name: storeName,
            owner_id: ownerId
          };
        });
        return schedulesWithStoreName;
      } else {
        return [];
      }
    } catch (error) {
      return [];
    }
  }
  
  // 일반 사용자는 기존 로직 사용 (개별 매장 조회)
  if (!stores || stores.length === 0) {
    return [];
  }

  try {
    // 일정이 있을 가능성이 높은 매장만 필터링 (선택적)
    // 또는 처음 10개 매장만 조회하여 성능 개선
    const targetStores = stores.slice(0, 10); // 최대 10개 매장만 조회
    
    // Lambda Cold Start 대응: 순차 실행으로 변경
    const scheduleResults = await sequentialExecute(
      targetStores,
      async (store) => {
        const storeId = store.store_id || store.id;
        const storeName = store.store_name || store.name;
        
        if (!storeId) {
          return [];
        }
        
        try {
          const schedules = await getSchedules(storeId, month);
          // 각 일정에 매장 정보 추가
          if (Array.isArray(schedules) && schedules.length > 0) {
            return schedules.map(schedule => ({
              ...schedule,
              store_id: storeId,
              store_name: storeName
            }));
          }
          return [];
        } catch (error) {
          // 개별 매장 실패는 조용히 처리 - 에러 로그 없음
          return [];
        }
      },
      100  // 각 요청 사이 100ms 지연
    );
    
    // 에러가 있는 결과 필터링 및 평탄화
    const allSchedules = scheduleResults
      .filter(result => !result.error && Array.isArray(result))
      .flat();
    
    return allSchedules;
  } catch (error) {
    // 전체 일정 조회 실패 시 빈 배열 반환
    return [];
  }
};