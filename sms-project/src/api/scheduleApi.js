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
 * 모든 사용자가 /api/schedules/all 엔드포인트 사용 (백엔드에서 권한별 필터링)
 * @param {string} month - 조회할 월 (YYYY-MM)
 * @returns {Promise<Array>} 모든 매장의 일정 목록
 */
export const getAllSchedules = async (month) => {
  try {
    const url = `/api/schedules/all?month=${month}`;
    const result = await apiClient.get(url);
    
    if (result.success) {
      // API 응답에 이미 store_name, owner_name이 포함되어 있음
      const schedules = result.data?.schedules || result.data || [];
      return schedules;
    } else {
      return [];
    }
  } catch (error) {
    console.error('일정 조회 실패:', error);
    return [];
  }
};