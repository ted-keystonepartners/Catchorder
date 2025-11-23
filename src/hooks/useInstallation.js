/**
 * 설치 링크 관련 커스텀 훅
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  sendInstallationUrl, 
  getInstallationStatus, 
  completeInstallation,
  resendInstallationUrl,
  cleanupExpiredLinks
} from '../api/installationApi.js';
import { useUIStore } from '../context/uiStore.js';

/**
 * 설치 링크 관련 훅
 * @param {string} storeId - 매장 ID (선택사항)
 * @returns {Object} 설치 관련 상태 및 액션들
 */
export const useInstallation = (storeId = null) => {
  const [status, setStatus] = useState(null);
  const [link, setLink] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [polling, setPolling] = useState(false);

  const { showSuccess, showError, showInfo } = useUIStore();
  const pollingIntervalRef = useRef(null);

  /**
   * 설치 링크 상태 조회
   * @returns {Promise<boolean>}
   */
  const fetchStatus = useCallback(async () => {
    if (!storeId) {
      setStatus(null);
      setLink(null);
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await getInstallationStatus(storeId);

      if (response.success) {
        setStatus(response.data);
        setLink(response.data.activeLink);
        return true;
      } else {
        setError(response.error);
        showError('설치 링크 상태를 불러오는데 실패했습니다.');
        return false;
      }
    } catch (err) {
      console.error('Fetch installation status error:', err);
      const errorMsg = '설치 링크 상태 조회 중 오류가 발생했습니다.';
      setError(errorMsg);
      showError(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  }, [storeId, showError]);

  /**
   * 설치 URL 발송
   * @param {Object} options - 발송 옵션
   * @returns {Promise<Object|null>}
   */
  const sendUrl = async (options = {}) => {
    if (!storeId) {
      showError('매장 정보가 필요합니다.');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await sendInstallationUrl(storeId, options);

      if (response.success) {
        showSuccess('설치 링크가 발송되었습니다.');
        
        // 상태 새로고침
        await fetchStatus();
        
        // 폴링 시작
        startPolling();
        
        return response.data;
      } else {
        setError(response.error);
        showError('설치 링크 발송에 실패했습니다.');
        return null;
      }
    } catch (err) {
      console.error('Send installation URL error:', err);
      const errorMsg = '설치 링크 발송 중 오류가 발생했습니다.';
      setError(errorMsg);
      showError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * 설치 링크 재발송
   * @param {string} linkId - 링크 ID
   * @returns {Promise<boolean>}
   */
  const resendUrl = async (linkId) => {
    setLoading(true);
    setError(null);

    try {
      const response = await resendInstallationUrl(linkId);

      if (response.success) {
        showSuccess('설치 링크가 재발송되었습니다.');
        
        // 상태 새로고침
        await fetchStatus();
        
        return true;
      } else {
        setError(response.error);
        showError('설치 링크 재발송에 실패했습니다.');
        return false;
      }
    } catch (err) {
      console.error('Resend installation URL error:', err);
      const errorMsg = '설치 링크 재발송 중 오류가 발생했습니다.';
      setError(errorMsg);
      showError(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * 설치 완료 처리
   * @param {string} token - 설치 토큰
   * @param {Object} signupData - 가입 데이터
   * @returns {Promise<Object|null>}
   */
  const completeSetup = async (token, signupData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await completeInstallation(token, signupData);

      if (response.success) {
        showSuccess('설치가 완료되었습니다.');
        
        // 폴링 중지
        stopPolling();
        
        // 상태 새로고침
        if (storeId) {
          await fetchStatus();
        }
        
        return response.data;
      } else {
        setError(response.error);
        showError('설치 완료 처리에 실패했습니다.');
        return null;
      }
    } catch (err) {
      console.error('Complete installation error:', err);
      const errorMsg = '설치 완료 처리 중 오류가 발생했습니다.';
      setError(errorMsg);
      showError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * 상태 폴링 시작
   * @param {number} interval - 폴링 간격 (밀리초)
   */
  const startPolling = (interval = 30000) => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    setPolling(true);
    pollingIntervalRef.current = setInterval(() => {
      fetchStatus();
    }, interval);
  };

  /**
   * 상태 폴링 중지
   */
  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setPolling(false);
  };

  /**
   * 만료된 링크 정리
   * @returns {Promise<boolean>}
   */
  const cleanup = async () => {
    setLoading(true);

    try {
      const response = await cleanupExpiredLinks();

      if (response.success) {
        if (response.data.cleanedCount > 0) {
          showInfo(`${response.data.cleanedCount}개의 만료된 링크를 정리했습니다.`);
        }
        
        // 상태 새로고침
        if (storeId) {
          await fetchStatus();
        }
        
        return true;
      } else {
        showError('링크 정리에 실패했습니다.');
        return false;
      }
    } catch (err) {
      console.error('Cleanup expired links error:', err);
      showError('링크 정리 중 오류가 발생했습니다.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * 에러 클리어
   */
  const clearError = () => {
    setError(null);
  };

  /**
   * 전체 초기화
   */
  const reset = () => {
    setStatus(null);
    setLink(null);
    setError(null);
    stopPolling();
  };

  /**
   * 링크 상태 확인
   * @returns {Object}
   */
  const getLinkStatus = () => {
    if (!link) {
      return {
        hasActiveLink: false,
        isExpired: false,
        isCompleted: false,
        canResend: false,
        canSend: true
      };
    }

    const now = new Date();
    const expiresAt = new Date(link.expiresAt);
    const isExpired = expiresAt <= now;
    const isCompleted = link.status === 'COMPLETED';

    return {
      hasActiveLink: !isExpired && !isCompleted,
      isExpired,
      isCompleted,
      canResend: !isExpired && !isCompleted,
      canSend: isExpired || isCompleted,
      sentAt: link.sentAt,
      expiresAt: link.expiresAt,
      resendCount: link.resendCount || 0
    };
  };

  /**
   * 링크 만료까지 남은 시간 (분 단위)
   * @returns {number}
   */
  const getTimeUntilExpiry = () => {
    if (!link || !link.expiresAt) return 0;
    
    const now = new Date();
    const expiresAt = new Date(link.expiresAt);
    const diffMs = expiresAt - now;
    
    return Math.max(0, Math.floor(diffMs / (1000 * 60))); // 분 단위
  };

  /**
   * 링크 유효성 검사
   * @param {string} token - 토큰
   * @returns {boolean}
   */
  const isValidToken = (token) => {
    if (!token || typeof token !== 'string') return false;
    
    // UUID 형식 검증
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(token);
  };

  // storeId가 변경되면 상태 조회
  useEffect(() => {
    if (storeId) {
      fetchStatus();
    } else {
      reset();
    }
  }, [storeId, fetchStatus]);

  // 컴포넌트 언마운트 시 폴링 정리
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  // 설치 완료 시 폴링 자동 중지
  useEffect(() => {
    if (link && link.status === 'COMPLETED') {
      stopPolling();
    }
  }, [link]);

  return {
    // 상태
    status,
    link,
    loading,
    error,
    polling,

    // 기본 액션
    fetchStatus,
    sendUrl,
    resendUrl,
    completeInstallation: completeSetup,

    // 폴링 액션
    startPolling,
    stopPolling,

    // 유틸리티 액션
    cleanup,
    clearError,
    reset,

    // 헬퍼 함수
    getLinkStatus,
    getTimeUntilExpiry,
    isValidToken
  };
};