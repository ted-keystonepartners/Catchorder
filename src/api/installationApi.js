/**
 * AWS Lambda SMS 발송 API
 */
import { apiClient } from './client.js';

export const installationApi = {
  async sendInstallationUrl(storeId) {
    const result = await apiClient.post('/api/installation/send-url', { store_id: storeId });
    if (result.success) {
      return result;
    } else {
      throw new Error(result.error || 'SMS 발송 실패');
    }
  },

  async getInstallationStatus(storeId) {
    const result = await apiClient.get(`/api/installation/status/${storeId}`);
    if (result.success) {
      return result;
    } else {
      throw new Error(result.error || '가입 상태 조회 실패');
    }
  },

  async completeInstallation(token, signupData) {
    const result = await apiClient.post('/api/installation/complete', {
      token,
      agreement: signupData.agreement,
      desired_install_date: signupData.desired_install_date
    }, { requireAuth: false });
    
    if (result.success) {
      return result;
    } else {
      throw new Error(result.error || '가입 완료 실패');
    }
  }
};

// 래퍼 함수들
export const sendInstallationUrl = async (storeId, options = {}) => {
  try {
    // 먼저 동의서 링크 생성 API 호출
    const consentResult = await apiClient.post('/api/consent/create-link', { storeId });
    
    if (consentResult.success) {
      return {
        success: true,
        data: {
          url: consentResult.data.consent_url,
          token: consentResult.data.token,
          expiresAt: consentResult.data.expires_at,
          message: consentResult.data.message
        }
      };
    } else {
      // 동의서 링크 생성 실패시 기존 설치 링크로 폴백
      const result = await installationApi.sendInstallationUrl(storeId);
      return {
        success: true,
        data: result.data
      };
    }
  } catch (error) {
    // 에러시 기존 설치 링크로 폴백
    try {
      const result = await installationApi.sendInstallationUrl(storeId);
      return {
        success: true,
        data: result.data
      };
    } catch (fallbackError) {
      return {
        success: false,
        error: error.message
      };
    }
  }
};

export const getInstallationStatus = async (storeId) => {
  try {
    // 백엔드 consent-responses API가 500 에러를 반환하므로 직접 호출하지 않음
    // 기존 설치 링크 상태만 확인
    const result = await installationApi.getInstallationStatus(storeId);
    return {
      success: true,
      data: result.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

export const completeInstallation = async (token, signupData) => {
  try {
    const result = await installationApi.completeInstallation(token, signupData);
    return {
      success: true,
      data: result.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// 사용하지 않는 함수들 (AWS Lambda에 구현되지 않음)
export const resendInstallationUrl = async (linkId) => {
  return {
    success: false,
    error: '현재 지원하지 않는 기능입니다.'
  };
};

export const cleanupExpiredLinks = async () => {
  return {
    success: false,
    error: '현재 지원하지 않는 기능입니다.'
  };
};