/**
 * 통합 API 클라이언트
 * 모든 API 호출을 표준화하고 중복 코드를 제거
 */
import { useAuthStore } from '../context/authStore.js';
import { logger } from '../utils/logger.js';
import { API_ERRORS, getHttpErrorMessage } from '../constants/messages.js';

/**
 * @typedef {import('../types/api.js').ApiResponse} ApiResponse
 */

/**
 * API 요청 옵션
 * @typedef {Object} RequestOptions
 * @property {'GET'|'POST'|'PUT'|'PATCH'|'DELETE'} [method='GET'] - HTTP 메서드
 * @property {Object<string, string>} [headers] - 추가 헤더
 * @property {any} [body] - 요청 본문
 * @property {boolean} [requireAuth=true] - 인증 필요 여부
 * @property {number} [timeout=30000] - 타임아웃 (ms)
 * @property {number} [retries=3] - 재시도 횟수
 */

class ApiClient {
  constructor() {
    // 개발/프로덕션 모두 AWS API Gateway 직접 연결
    this.baseURL = import.meta.env.VITE_API_BASE || 'https://l0dtib1m19.execute-api.ap-northeast-2.amazonaws.com/dev';
    this.defaultTimeout = Number(import.meta.env.VITE_SESSION_TIMEOUT) || 30000; // 기본 30초
    this.defaultHeaders = {
      'Content-Type': 'application/json'
    };
  }

  /**
   * 인증 헤더 생성
   * @returns {Object} Authorization 헤더
   */
  getAuthHeaders() {
    const { token } = useAuthStore.getState();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  /**
   * 요청 옵션 구성
   * @param {RequestOptions} options - 요청 옵션
   * @returns {Object} fetch 옵션
   */
  buildRequestOptions(options = {}) {
    const {
      method = 'GET',
      headers = {},
      body,
      requireAuth = true,
      timeout = this.defaultTimeout
    } = options;

    const requestHeaders = {
      ...this.defaultHeaders,
      ...(requireAuth ? this.getAuthHeaders() : {}),
      ...headers
    };


    const requestOptions = {
      method,
      headers: requestHeaders,
      signal: AbortSignal.timeout(timeout)
    };

    // body 처리
    if (body) {
      if (typeof body === 'object' && !(body instanceof FormData)) {
        requestOptions.body = JSON.stringify(body);
      } else {
        requestOptions.body = body;
        // FormData인 경우 Content-Type 제거 (브라우저가 자동 설정)
        if (body instanceof FormData) {
          delete requestOptions.headers['Content-Type'];
        }
      }
    }

    return requestOptions;
  }

  /**
   * 응답 처리
   * @param {Response} response - fetch 응답
   * @returns {Promise<ApiResponse>} 표준화된 응답
   */
  async handleResponse(response) {
    try {
      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          data: null,
          error: data.error || data.message || `HTTP ${response.status}: ${response.statusText}`
        };
      }

      return {
        success: true,
        data: data.data || data,
        error: null
      };
    } catch {
      return {
        success: false,
        data: null,
        error: response.ok 
          ? 'Invalid JSON response' 
          : `HTTP ${response.status}: ${response.statusText}`
      };
    }
  }

  /**
   * 기본 요청 메서드
   * @param {string} endpoint - API 엔드포인트
   * @param {RequestOptions} options - 요청 옵션
   * @returns {Promise<ApiResponse>} API 응답
   */
  async request(endpoint, options = {}) {
    const maxRetries = options.retries !== undefined ? options.retries : 3; // 재시도 3회로 증가
    // Lambda Cold Start 대응: 첫 재시도 시 더 긴 대기시간
    const initialDelay = 1500; // 1.5초로 증가
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const url = `${this.baseURL}${endpoint}`;
        const requestOptions = this.buildRequestOptions(options);

        const response = await fetch(url, requestOptions);
        const result = await this.handleResponse(response);

        // 500 에러이고 재시도 가능한 경우에만 재시도
        if (!result.success && response.status === 500 && attempt < maxRetries) {
          // Lambda Cold Start 대응: 더 긴 초기 대기시간
          const delay = attempt === 0 ? initialDelay : Math.pow(2, attempt) * 1000; // 1.5s, 2s, 4s
          await this.delay(delay);
          continue;
        }

        // 재시도 후 성공 시 조용히 반환
        if (result.success && attempt > 0) {
          return result;
        }

        // 최종 실패 시 처리
        if (!result.success && attempt === maxRetries) {
          // 500 에러는 warn으로 조용히 처리 (Lambda Cold Start 문제)
          if (response.status === 500) {
            logger.warn(`API 500 에러 (Lambda Cold Start): ${endpoint}`);
          } else {
            // 다른 에러는 error로 출력
            logger.error(`API 최종 실패: ${endpoint}`, { status: response.status, error: result.error });
          }
        }

        return result;
      } catch (error) {
        // 네트워크 오류이고 재시도 가능한 경우
        if (attempt < maxRetries && (error.name === 'TypeError' || error.name === 'AbortError')) {
          const delay = attempt === 0 ? initialDelay : Math.pow(2, attempt) * 500;
          await this.delay(delay);
          continue;
        }

        // API Request Failed
        
        if (error.name === 'AbortError') {
          logger.warn(`API 타임아웃: ${endpoint}`);
          return {
            success: false,
            data: null,
            error: API_ERRORS.TIMEOUT_ERROR
          };
        }

        logger.error(`API 요청 실패: ${endpoint}`, error);
        return {
          success: false,
          data: null,
          error: error.message || API_ERRORS.NETWORK_ERROR
        };
      }
    }
  }

  /**
   * 지연 함수
   * @param {number} ms - 지연 시간 (밀리초)
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * GET 요청
   * @param {string} endpoint - API 엔드포인트
   * @param {Object} params - 쿼리 파라미터
   * @param {RequestOptions} options - 추가 옵션
   * @returns {Promise<ApiResponse>}
   */
  async get(endpoint, params = {}, options = {}) {
    const searchParams = new URLSearchParams();
    
    // 쿼리 파라미터 처리
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        if (Array.isArray(value)) {
          value.forEach(v => searchParams.append(key, v));
        } else if (typeof value === 'object') {
          // 객체인 경우 JSON 문자열로 변환
          searchParams.append(key, JSON.stringify(value));
        } else {
          searchParams.append(key, value);
        }
      }
    });

    const queryString = searchParams.toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;

    return this.request(url, { ...options, method: 'GET' });
  }

  /**
   * POST 요청
   * @param {string} endpoint - API 엔드포인트
   * @param {any} body - 요청 본문
   * @param {RequestOptions} options - 추가 옵션
   * @returns {Promise<ApiResponse>}
   */
  async post(endpoint, body = null, options = {}) {
    return this.request(endpoint, { ...options, method: 'POST', body });
  }

  /**
   * PUT 요청
   * @param {string} endpoint - API 엔드포인트
   * @param {any} body - 요청 본문
   * @param {RequestOptions} options - 추가 옵션
   * @returns {Promise<ApiResponse>}
   */
  async put(endpoint, body = null, options = {}) {
    return this.request(endpoint, { ...options, method: 'PUT', body });
  }

  /**
   * PATCH 요청
   * @param {string} endpoint - API 엔드포인트
   * @param {any} body - 요청 본문
   * @param {RequestOptions} options - 추가 옵션
   * @returns {Promise<ApiResponse>}
   */
  async patch(endpoint, body = null, options = {}) {
    return this.request(endpoint, { ...options, method: 'PATCH', body });
  }

  /**
   * DELETE 요청
   * @param {string} endpoint - API 엔드포인트
   * @param {RequestOptions} options - 추가 옵션
   * @returns {Promise<ApiResponse>}
   */
  async delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

// 싱글톤 인스턴스 생성
export const apiClient = new ApiClient();

// 편의 함수들
export const { get, post, put, patch, delete: del } = apiClient;

/**
 * 동시 실행 제한 유틸리티
 * Lambda Cold Start 문제 해결을 위한 동시 요청 수 제한
 * @param {Array} items - 처리할 항목들
 * @param {Function} fn - 각 항목에 대해 실행할 비동기 함수
 * @param {number} limit - 동시 실행 제한 수 (기본값: 2로 감소)
 * @param {number} delayMs - 각 배치 사이 지연시간 (기본값: 200ms로 증가)
 * @returns {Promise<Array>} 처리 결과 배열
 */
export async function limitConcurrency(items, fn, limit = 2, delayMs = 200) {
  const results = [];
  
  for (let i = 0; i < items.length; i += limit) {
    const batch = items.slice(i, i + limit);
    
    // 현재 배치 처리 (각 항목 사이에도 약간의 지연 추가)
    const batchResults = await Promise.all(
      batch.map((item, index) => 
        new Promise(async (resolve) => {
          // 배치 내 각 요청 사이 50ms 지연
          if (index > 0) {
            await new Promise(r => setTimeout(r, index * 50));
          }
          try {
            const result = await fn(item);
            resolve(result);
          } catch (error) {
            resolve({ error, item });
          }
        })
      )
    );
    
    results.push(...batchResults);
    
    // 다음 배치 전 지연 (마지막 배치 제외)
    if (i + limit < items.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  return results;
}

/**
 * 순차적 실행 유틸리티
 * 각 요청을 순차적으로 처리하며 지연시간 추가
 * @param {Array} items - 처리할 항목들
 * @param {Function} fn - 각 항목에 대해 실행할 비동기 함수
 * @param {number} delayMs - 각 요청 사이 지연시간 (기본값: 50ms)
 * @returns {Promise<Array>} 처리 결과 배열
 */
export async function sequentialExecute(items, fn, delayMs = 50) {
  const results = [];
  
  for (let i = 0; i < items.length; i++) {
    try {
      const result = await fn(items[i]);
      results.push(result);
    } catch (error) {
      results.push({ error, item: items[i] });
    }
    
    // 다음 요청 전 지연 (마지막 항목 제외)
    if (i < items.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  return results;
}

// 기본 익스포트
export default apiClient;