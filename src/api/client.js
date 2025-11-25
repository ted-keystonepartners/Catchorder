/**
 * 통합 API 클라이언트
 * 모든 API 호출을 표준화하고 중복 코드를 제거
 */
import { useAuthStore } from '../context/authStore.js';

/**
 * API 응답 표준 인터페이스
 * @typedef {Object} ApiResponse
 * @property {boolean} success - 성공 여부
 * @property {any} data - 응답 데이터
 * @property {string} error - 에러 메시지
 */

/**
 * API 요청 옵션
 * @typedef {Object} RequestOptions
 * @property {string} method - HTTP 메서드
 * @property {Object} headers - 추가 헤더
 * @property {any} body - 요청 본문
 * @property {boolean} requireAuth - 인증 필요 여부
 * @property {number} timeout - 타임아웃 (ms)
 */

class ApiClient {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_BASE || 'https://mk04952lrj.execute-api.ap-northeast-2.amazonaws.com/dev';
    this.defaultTimeout = 30000; // 30초
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
          error: data.error?.message || data.message || `HTTP ${response.status}: ${response.statusText}`
        };
      }

      return {
        success: true,
        data: data.data || data,
        error: null
      };
    } catch (parseError) {
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
    const maxRetries = options.retries || 2;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const url = `${this.baseURL}${endpoint}`;
        const requestOptions = this.buildRequestOptions(options);

        const response = await fetch(url, requestOptions);
        const result = await this.handleResponse(response);

        // 500 에러이고 재시도 가능한 경우
        if (!result.success && response.status === 500 && attempt < maxRetries) {
          console.warn(`API 500 Error (attempt ${attempt + 1}): ${endpoint}, retrying...`);
          await this.delay(Math.pow(2, attempt) * 500); // 지수 백오프: 500ms, 1s, 2s
          continue;
        }

        if (!result.success) {
          console.error(`API Error: ${endpoint}`, result.error);
        }

        return result;
      } catch (error) {
        // 네트워크 오류이고 재시도 가능한 경우
        if (attempt < maxRetries && (error.name === 'TypeError' || error.name === 'AbortError')) {
          console.warn(`Network Error (attempt ${attempt + 1}): ${endpoint}, retrying...`);
          await this.delay(Math.pow(2, attempt) * 500);
          continue;
        }

        console.error(`API Request Failed: ${endpoint}`, error);
        
        if (error.name === 'AbortError') {
          return {
            success: false,
            data: null,
            error: '요청 시간이 초과되었습니다.'
          };
        }

        return {
          success: false,
          data: null,
          error: error.message || '네트워크 오류가 발생했습니다.'
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

// 기본 익스포트
export default apiClient;