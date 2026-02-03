/**
 * 대리점 관리 API
 */

import { apiClient } from './client.js';

/**
 * 대리점 목록 조회 (관리자 전용)
 * stores API에 type=agencies 쿼리 파라미터로 대리점 목록 조회
 * @returns {Promise<Object>} 대리점 목록
 */
export const getAgencies = async () => {
  try {
    const result = await apiClient.get('/api/stores', { type: 'agencies' });

    if (result.success) {
      return {
        success: true,
        data: result.data?.agencies || [],
        total: result.data?.total || 0
      };
    } else {
      throw new Error(result.error || '대리점 목록 조회에 실패했습니다.');
    }
  } catch (error) {
    console.error('대리점 목록 조회 실패:', error);
    throw error;
  }
};
