/**
 * API 유틸리티 함수들
 * 에러 처리, 응답 변환 등 공통 기능
 */

import { logger } from '../utils/logger.js';
import { getErrorMessage } from '../constants/messages.js';

/**
 * API 호출 래퍼 - 에러 처리 표준화
 * @param {Function} apiCall - 실행할 API 함수
 * @param {string} operation - 작업 설명 (로깅용)
 * @returns {Promise<Object>} 표준화된 응답
 */
export const apiWrapper = async (apiCall, operation = 'API 호출') => {
  try {
    logger.debug(`${operation} 시작`);
    const startTime = Date.now();
    
    const result = await apiCall();
    
    const duration = Date.now() - startTime;
    logger.debug(`${operation} 완료 (${duration}ms)`);
    
    // 이미 표준 형식인 경우
    if (result.hasOwnProperty('success')) {
      return result;
    }
    
    // 표준 형식으로 변환
    return {
      success: true,
      data: result.data || result,
      error: null
    };
  } catch (error) {
    logger.error(`${operation} 실패`, error);
    
    // 이미 처리된 에러인 경우
    if (error.success === false) {
      return error;
    }
    
    // 새로운 에러 처리
    return {
      success: false,
      data: null,
      error: getErrorMessage(error)
    };
  }
};

/**
 * 여러 API 호출을 병렬로 실행
 * @param {Array<Function>} apiCalls - API 함수 배열
 * @returns {Promise<Array>} 결과 배열
 */
export const parallelApiCalls = async (apiCalls) => {
  try {
    const results = await Promise.allSettled(apiCalls.map(call => call()));
    
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        logger.error(`병렬 API 호출 실패 (인덱스: ${index})`, result.reason);
        return {
          success: false,
          data: null,
          error: getErrorMessage(result.reason)
        };
      }
    });
  } catch (error) {
    logger.error('병렬 API 호출 중 오류', error);
    return apiCalls.map(() => ({
      success: false,
      data: null,
      error: getErrorMessage(error)
    }));
  }
};

/**
 * 조건부 API 호출
 * @param {boolean} condition - 실행 조건
 * @param {Function} apiCall - API 함수
 * @param {any} defaultValue - 조건 미충족 시 기본값
 * @returns {Promise<any>} API 결과 또는 기본값
 */
export const conditionalApiCall = async (condition, apiCall, defaultValue = null) => {
  if (!condition) {
    return {
      success: true,
      data: defaultValue,
      error: null
    };
  }
  
  return apiWrapper(apiCall);
};

/**
 * 재시도 로직이 포함된 API 호출
 * @param {Function} apiCall - API 함수
 * @param {number} maxRetries - 최대 재시도 횟수
 * @param {number} delay - 재시도 간 지연 시간 (ms)
 * @returns {Promise<Object>} API 결과
 */
export const retryableApiCall = async (apiCall, maxRetries = 3, delay = 1000) => {
  let lastError = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await apiCall();
      
      if (result.success || attempt === maxRetries) {
        return result;
      }
      
      lastError = result.error;
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        logger.error(`재시도 실패 (${maxRetries}회 시도)`, error);
        return {
          success: false,
          data: null,
          error: getErrorMessage(error)
        };
      }
      
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
    }
  }
  
  return {
    success: false,
    data: null,
    error: getErrorMessage(lastError)
  };
};

/**
 * 캐시된 API 호출
 * @param {string} cacheKey - 캐시 키
 * @param {Function} apiCall - API 함수
 * @param {number} ttl - 캐시 유효 시간 (ms)
 * @returns {Promise<Object>} 캐시된 또는 새로운 API 결과
 */
const cache = new Map();

export const cachedApiCall = async (cacheKey, apiCall, ttl = 60000) => {
  // 캐시 확인
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < ttl) {
    logger.debug(`캐시 히트: ${cacheKey}`);
    return cached.data;
  }
  
  // API 호출
  const result = await apiWrapper(apiCall, `캐시된 API 호출: ${cacheKey}`);
  
  // 성공 시 캐시 저장
  if (result.success) {
    cache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
    
    // 캐시 만료 타이머
    setTimeout(() => {
      cache.delete(cacheKey);
      logger.debug(`캐시 만료: ${cacheKey}`);
    }, ttl);
  }
  
  return result;
};

/**
 * 캐시 초기화
 */
export const clearCache = (cacheKey = null) => {
  if (cacheKey) {
    cache.delete(cacheKey);
    logger.debug(`캐시 삭제: ${cacheKey}`);
  } else {
    cache.clear();
    logger.debug('전체 캐시 초기화');
  }
};

/**
 * 페이지네이션 처리
 * @param {Function} apiCall - API 함수
 * @param {number} page - 페이지 번호
 * @param {number} limit - 페이지당 항목 수
 * @returns {Promise<Object>} 페이지네이션된 결과
 */
export const paginatedApiCall = async (apiCall, page = 1, limit = 10) => {
  const result = await apiWrapper(apiCall, `페이지네이션 API 호출 (페이지: ${page})`);
  
  if (!result.success) {
    return result;
  }
  
  // 전체 데이터에서 페이지네이션 처리
  const data = Array.isArray(result.data) ? result.data : [];
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  
  return {
    success: true,
    data: {
      items: data.slice(startIndex, endIndex),
      total: data.length,
      page,
      limit,
      totalPages: Math.ceil(data.length / limit),
      hasNext: endIndex < data.length,
      hasPrev: page > 1
    },
    error: null
  };
};

/**
 * 응답 데이터 변환
 * @param {Object} response - API 응답
 * @param {Function} transformer - 변환 함수
 * @returns {Object} 변환된 응답
 */
export const transformResponse = (response, transformer) => {
  if (!response.success) {
    return response;
  }
  
  try {
    return {
      ...response,
      data: transformer(response.data)
    };
  } catch (error) {
    logger.error('응답 변환 실패', error);
    return {
      success: false,
      data: null,
      error: '데이터 변환 중 오류가 발생했습니다.'
    };
  }
};

/**
 * 빈 응답 처리
 * @param {Object} response - API 응답
 * @param {any} defaultValue - 기본값
 * @returns {Object} 처리된 응답
 */
export const handleEmptyResponse = (response, defaultValue = []) => {
  if (!response.success) {
    return response;
  }
  
  if (!response.data || 
      (Array.isArray(response.data) && response.data.length === 0) ||
      (typeof response.data === 'object' && Object.keys(response.data).length === 0)) {
    return {
      ...response,
      data: defaultValue
    };
  }
  
  return response;
};