/**
 * AWS Lambda 인증 API
 */
import { apiClient } from './client.js';

export const login = async (email, password) => {
  return await apiClient.post('/api/auth/login', { email, password }, { requireAuth: false });
};

export const validateToken = async () => {
  return await apiClient.get('/api/auth/me');
};

export const logout = async () => {
  // AWS에는 로그아웃 API가 없으므로 클라이언트에서만 처리
  return {
    success: true
  };
};

export const getCurrentUser = async () => {
  return await apiClient.get('/api/auth/me');
};

// 사용하지 않는 함수들 (AWS Lambda에 구현되지 않음)
export const changePassword = async () => {
  return {
    success: false,
    error: '현재 지원하지 않는 기능입니다.'
  };
};

export const updateProfile = async () => {
  return {
    success: false,
    error: '현재 지원하지 않는 기능입니다.'
  };
};