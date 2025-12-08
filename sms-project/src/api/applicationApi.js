import { apiClient } from './client.js';

// 신청 제출 (외부용 - 인증 불필요)
export const submitApplication = async (applicationData) => {
  try {
    const response = await apiClient.post('/api/applications', applicationData, {
      skipAuth: true // 인증 헤더 제외
    });
    return response;
  } catch (error) {
    console.error('신청 제출 실패:', error);
    throw error;
  }
};

// 신청 목록 조회 (어드민용)
export const getApplications = async (params = {}) => {
  try {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `/api/applications?${queryString}` : '/api/applications';
    const response = await apiClient.get(url);
    return response;
  } catch (error) {
    console.error('신청 목록 조회 실패:', error);
    throw error;
  }
};

// 신청 상태 업데이트 (어드민용)
export const updateApplication = async (id, updateData) => {
  try {
    const response = await apiClient.patch(`/api/applications/${id}`, updateData);
    return response;
  } catch (error) {
    console.error('신청 상태 업데이트 실패:', error);
    throw error;
  }
};

// 신청 삭제 (어드민용)
export const deleteApplication = async (id) => {
  try {
    const response = await apiClient.delete(`/api/applications/${id}`);
    return response;
  } catch (error) {
    console.error('신청 삭제 실패:', error);
    throw error;
  }
};

// 요청유형 라벨
export const REQUEST_TYPE_LABELS = {
  SIGNUP: '가입신청',
  MEETING: '미팅신청',
  MENU: '메뉴신청'
};

// 결제유형 라벨
export const PAYMENT_TYPE_LABELS = {
  PREPAID: '선불형',
  POSTPAID: '후불형'
};

// 상태 라벨
export const STATUS_LABELS = {
  PENDING: '대기중',
  APPROVED: '승인',
  REJECTED: '거절'
};

// 상태 색상
export const STATUS_COLORS = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700'
};