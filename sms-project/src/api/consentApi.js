/**
 * 동의서 시스템 API - 고유 링크 방식
 * 매장별 고정된 링크를 사용하는 간단한 구조
 */

import { apiClient } from './client.js';

/**
 * 매장별 고유 동의서 링크 생성
 * @param {string} storeId - 매장 ID
 * @returns {string} 고유 동의서 링크
 */
export const createConsentLink = async (storeId) => {
  if (!storeId) {
    throw new Error('매장 ID가 필요합니다.');
  }

  // 매장 ID 기반으로 고유 링크 생성
  const consentUrl = `${window.location.origin}/consent/${storeId}`;
  
  
  return {
    link_id: `link_${storeId}`,
    token: storeId,
    consent_url: consentUrl,
    expires_at: null, // 무제한
    message: "링크를 복사해서 고객에게 전달하세요"
  };
};

/**
 * 매장 정보 조회 (공개 API - JWT 인증 불필요)
 * @param {string} storeId - 매장 ID (URL에서 받은 storeId 파라미터)
 * @returns {Promise<Object>} 매장 정보 및 폼 필드
 */
export const getConsentForm = async (storeId) => {
  if (!storeId) {
    throw new Error('매장 ID가 필요합니다.');
  }

  console.log('🚀 동의서 폼 요청 - Store ID:', storeId);

  // 공개 API이므로 JWT 인증 비활성화
  const result = await apiClient.get(`/api/consent/form/${storeId}`, {}, { requireAuth: false });
  
  console.log('📦 API 응답 원본:', result);
  console.log('📦 API 응답 data 상세:', JSON.stringify(result.data, null, 2));
  
  if (!result) {
    console.error('❌ API 응답이 없습니다');
    throw new Error('서버로부터 응답을 받지 못했습니다.');
  }
  
  if (!result.success) {
    console.error('❌ API 에러 응답:', result.error);
    throw new Error(result.error || '매장 정보 조회에 실패했습니다.');
  }
  
  if (result.success) {
    
    // 담당자 정보 처리
    let ownerName = result.data?.owner_name || result.data?.manager_name;
    
    const formattedData = {
      link_id: result.data?.link_id,
      store_id: storeId,
      store_name: result.data?.store_name,
      store_phone: result.data?.store_phone,
      owner_name: ownerName || '담당자명 없음',
      form_fields: result.data?.form_fields || {
        respondent_name: "",
        respondent_phone: "",
        respondent_position: "",
        remote_install_date: "",
        remote_install_time: "",
        table_count: "",
        sticker_type: "",
        design_type: "",
        preferred_color: "",
        terms_agreement: false
      },
      has_existing_data: result.data?.has_existing_data || false,
      last_submitted_at: result.data?.last_submitted_at || null
    };
    
    console.log('✅ 포맷된 데이터:', formattedData);
    return formattedData;
  } else {
    throw new Error(result.error || '매장 정보 조회에 실패했습니다.');
  }
};

/**
 * 동의서 제출 (공개 API - JWT 인증 불필요)
 * @param {string} storeId - 매장 ID (URL에서 받은 storeId 파라미터)
 * @param {Object} formData - 제출할 폼 데이터
 * @returns {Promise<Object>} 제출 결과
 */
export const submitConsentForm = async (storeId, formData) => {
  if (!storeId) {
    throw new Error('매장 ID가 필요합니다.');
  }


  // 고정 URL 방식으로 store_id 전송
  const submitData = {
    store_id: storeId,
    respondent_name: formData.respondent_name,
    respondent_phone: formData.respondent_phone,
    respondent_position: formData.respondent_position,
    remote_install_date: formData.remote_install_date,
    remote_install_time: formData.remote_install_time,
    table_count: formData.table_count,
    sticker_type: formData.sticker_type,
    design_type: formData.design_type,
    preferred_color: formData.preferred_color || '', // 빈 값이라도 필드는 보내기
    terms_agreement: formData.terms_agreement
  };

  // 공개 API이므로 JWT 인증 비활성화
  const result = await apiClient.post('/api/consent/submit', submitData, { requireAuth: false }); // 🔥 JWT 인증 비활성화

  if (result.success) {
    return {
      response_id: result.data?.response_id,
      submitted_at: result.data?.submitted_at
    };
  } else {
    throw new Error(result.error || '동의서 제출에 실패했습니다.');
  }
};

/**
 * 매장의 동의서 응답 목록 조회 (관리자 API - JWT 인증 필요)
 * @param {string} storeId - 매장 ID
 * @param {number} page - 페이지 번호 (기본값: 1)
 * @param {number} limit - 페이지당 항목 수 (기본값: 10)
 * @returns {Promise<Object>} 응답 목록
 */
export const getConsentResponses = async (storeId, page = 1, limit = 10) => {
  if (!storeId) {
    throw new Error('매장 ID가 필요합니다.');
  }

  try {
    // 백엔드 pagination 버그로 인해 파라미터 제거
    const result = await apiClient.get(`/api/stores/${storeId}/consent-responses`);
    
    if (result.success) {
      // 프론트엔드에서 pagination 처리
      const allResponses = result.data?.responses || result.data || [];
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedResponses = allResponses.slice(startIndex, endIndex);
      
      return {
        total: allResponses.length,
        responses: paginatedResponses,
        page: page,
        limit: limit,
        totalPages: Math.ceil(allResponses.length / limit)
      };
    } else {
      // API 실패 시 에러 throw (catch 블록에서 처리됨)
      throw new Error(result.error || '응답 목록 조회에 실패했습니다.');
    }
  } catch (error) {
    // 500 에러 처리 - 빈 배열 반환 (콘솔 경고 제거)
    // 백엔드 API가 구현되지 않은 것으로 알려진 상태이므로 조용히 실패
    return {
      total: 0,
      responses: [],
      page: page,
      limit: limit,
      totalPages: 0
    };
  }
};

/**
 * 링크 상태별 표시용 라벨
 */
export const CONSENT_STATUS = {
  NOT_SENT: { code: 'not_sent', label: '미발송', color: 'bg-gray-100 text-gray-700' },
  SENT: { code: 'sent', label: '발송완료', color: 'bg-blue-100 text-blue-700' },
  COMPLETED: { code: 'completed', label: '제출완료', color: 'bg-green-100 text-green-700' }
};

/**
 * 동의서 링크 상태 판단
 * @param {boolean} hasLink - 링크 생성 여부
 * @param {number} responseCount - 응답 개수
 * @returns {Object} 상태 정보
 */
export const getConsentStatus = (hasLink, responseCount = 0) => {
  if (!hasLink) {
    return CONSENT_STATUS.NOT_SENT;
  } else if (responseCount > 0) {
    return CONSENT_STATUS.COMPLETED;
  } else {
    return CONSENT_STATUS.SENT;
  }
};

/**
 * 동의서 URL 유효성 검사
 * @param {string} storeId - 매장 ID
 * @returns {boolean} 유효 여부
 */
export const isValidStoreId = (storeId) => {
  // 간단한 검증 로직
  return storeId && storeId.length > 0 && storeId !== 'undefined' && storeId !== 'null';
};

/**
 * 동의서 데이터 초기화 (개발용 - 관리자 API, JWT 인증 필요)
 */
export const clearConsentData = async () => {
  const result = await apiClient.delete('/api/consent/clear');
  
  if (result.success) {
    return result.data;
  } else {
    throw new Error(result.error || '데이터 초기화에 실패했습니다.');
  }
};

/**
 * 전체 동의서 응답 개수 확인 (관리자 API - JWT 인증 필요)
 * @returns {Promise<number>} 총 응답 개수
 */
export const getTotalResponseCount = async () => {
  try {
    const result = await apiClient.get('/api/consent/count');
    
    if (result.success) {
      return result.data?.total || 0;
    } else {
      // 응답 개수 조회 실패 시 0 반환
      return 0;
    }
  } catch (error) {
    // 응답 개수 조회 API 오류 시 0 반환
    return 0;
  }
};