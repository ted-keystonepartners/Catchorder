/**
 * 캐치테이블로 API 클라이언트
 * - 일반 URL(/api)과 비즈전용 URL(/v1/api) 자동 분기
 * - Content-Type 자동 결정
 * - 401 시 토큰 갱신 후 1회 재시도
 */
import {
  GENERAL_API_BASE,
  BIZ_API_BASE,
  GENERAL_URL_PATHS,
  CONTENT_TYPE_MAP
} from './constants.mjs';
import { ensureValidToken } from './tokenManager.mjs';

/**
 * 경로가 일반 URL에 해당하는지 확인
 * @param {string} path - API 경로
 * @returns {boolean}
 */
function isGeneralPath(path) {
  return GENERAL_URL_PATHS.some(p => path.startsWith(p));
}

/**
 * 경로에 맞는 Base URL 결정
 * @param {string} path - API 경로
 * @returns {string} Base URL
 */
function getBaseUrl(path) {
  return isGeneralPath(path) ? GENERAL_API_BASE : BIZ_API_BASE;
}

/**
 * 경로에 맞는 Content-Type 결정
 * @param {string} method - HTTP 메서드
 * @param {string} path - API 경로
 * @returns {string} Content-Type
 */
function getContentType(method, path) {
  if (method === 'GET' || method === 'DELETE') {
    return 'application/json';
  }

  // formUrlEncoded 패턴 확인 (와일드카드 매칭)
  for (const pattern of CONTENT_TYPE_MAP.formUrlEncoded) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '[^/]+') + '');
    if (regex.test(path)) {
      return 'application/x-www-form-urlencoded';
    }
  }

  // json 패턴 확인
  for (const pattern of CONTENT_TYPE_MAP.json) {
    if (path.startsWith(pattern)) {
      return 'application/json';
    }
  }

  // 기본값
  return 'application/json';
}

/**
 * 요청 body를 Content-Type에 맞게 변환
 * @param {Object} body - 요청 데이터
 * @param {string} contentType - Content-Type
 * @returns {string} 변환된 body
 */
function serializeBody(body, contentType) {
  if (!body) return undefined;

  if (contentType === 'application/x-www-form-urlencoded') {
    return new URLSearchParams(body).toString();
  }

  return JSON.stringify(body);
}

/**
 * 캐치테이블로 API 호출
 * @param {Object} options
 * @param {string} options.method - HTTP 메서드
 * @param {string} options.path - API 경로 (예: /menu/categories)
 * @param {Object} [options.body] - 요청 본문
 * @param {Object} [options.params] - URL 경로 파라미터 치환용
 * @param {string} options.token - 인증 토큰
 * @returns {Promise<{status: number, data: any, token: string}>}
 */
export async function callCatchtableroApi({ method, path, body, params, token }) {
  // 경로 내 파라미터 치환 (예: /menu/{menu_id}/soldout → /menu/123/soldout)
  let resolvedPath = path;
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      resolvedPath = resolvedPath.replace(`{${key}}`, value);
    }
  }

  const baseUrl = getBaseUrl(resolvedPath);
  const contentType = getContentType(method, resolvedPath);
  const url = `${baseUrl}${resolvedPath}`;

  console.log(`[CatchtableClient] ${method} ${url} (Content-Type: ${contentType})`);

  const fetchOptions = {
    method,
    headers: {
      'Content-Type': contentType,
      'Authorization': `Bearer ${token}`
    }
  };

  if (method !== 'GET') {
    // brand_store_id는 모든 쓰기 요청의 body에 필수 (캐치테이블로 API 인증 요구사항)
    const finalBody = { ...(body || {}) };
    if (params?.brand_store_id && !finalBody.brand_store_id) {
      finalBody.brand_store_id = params.brand_store_id;
    }
    if (Object.keys(finalBody).length > 0) {
      fetchOptions.body = serializeBody(finalBody, contentType);
    }
  }

  let response = await fetch(url, fetchOptions);

  // 401 시 토큰 갱신 후 1회 재시도
  if (response.status === 401) {
    console.log('[CatchtableClient] 401 - 토큰 갱신 후 재시도');
    const { token: newToken } = await ensureValidToken(null);

    fetchOptions.headers['Authorization'] = `Bearer ${newToken}`;
    response = await fetch(url, fetchOptions);

    const data = await response.json().catch(() => ({}));
    return { status: response.status, data, token: newToken };
  }

  const data = await response.json().catch(() => ({}));
  return { status: response.status, data, token };
}

/**
 * 세션 초기화 - 로그인 + 메뉴/매장 데이터 로드
 * @param {string|null} existingToken - 기존 토큰
 * @param {string} brandStoreId - 매장 ID
 * @returns {Promise<Object>} 초기화 데이터
 */
export async function initSession(existingToken, brandStoreId) {
  // 1. 토큰 확보
  const { token, renewed } = await ensureValidToken(existingToken);

  // 2. 메뉴 카테고리 + 매장 정보 병렬 로드
  const [menuResult, storeResult] = await Promise.all([
    callCatchtableroApi({
      method: 'GET',
      path: `/menu/categories?brand_store_id=${brandStoreId}`,
      token
    }),
    callCatchtableroApi({
      method: 'GET',
      path: `/brand_store?brand_store_id=${brandStoreId}`,
      token
    })
  ]);

  return {
    token,
    renewed,
    menu: menuResult.data,
    store: storeResult.data,
    menuStatus: menuResult.status,
    storeStatus: storeResult.status
  };
}
