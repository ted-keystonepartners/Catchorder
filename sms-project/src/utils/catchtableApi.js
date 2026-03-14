/**
 * 캐치테이블로 Lambda 프록시 호출 래퍼
 * /api/catchtable/init, /api/catchtable/execute, /api/catchtable/refresh
 */
import { apiClient } from '../api/client.js';

const CT_SESSION_KEY = 'catchtable_token';

/**
 * 세션 토큰 관리
 */
function getStoredToken() {
  return sessionStorage.getItem(CT_SESSION_KEY);
}

function storeToken(token) {
  if (token) {
    sessionStorage.setItem(CT_SESSION_KEY, token);
  }
}

export function clearCatchtableSession() {
  sessionStorage.removeItem(CT_SESSION_KEY);
}

/**
 * 세션 초기화 - 로그인 + 메뉴/매장 데이터 로드
 * @param {string} [brandStoreId='442'] - 매장 ID
 * @returns {Promise<{token: string, menu: Object, store: Object}>}
 */
export async function initCatchtableSession(brandStoreId = '442') {
  const existingToken = getStoredToken();

  const result = await apiClient.post('/api/catchtable/init', {
    token: existingToken,
    brand_store_id: brandStoreId
  });

  if (result.success && result.data) {
    storeToken(result.data.token);
    return {
      token: result.data.token,
      menu: result.data.menu?.data || result.data.menu || [],
      store: result.data.store?.data || result.data.store || {},
      menuOptions: result.data.menuOptions || [],
      optionCategories: result.data.optionCategories || [],
      brandStoreId: result.data.brand_store_id
    };
  }

  throw new Error(result.error || '캐치테이블로 세션 초기화에 실패했습니다.');
}

/**
 * 액션 실행 - 검증 후 캐치테이블로 API 호출
 * @param {Array} actions - 실행할 액션 배열
 * @param {Object} [menuCache] - 메뉴 ID 검증용 캐시
 * @param {string} [brandStoreId='442'] - 매장 ID
 * @returns {Promise<{results: Array, rejected: Array}>}
 */
export async function executeCatchtableActions(actions, menuCache = null, brandStoreId = '442') {
  const token = getStoredToken();

  if (!token) {
    throw new Error('캐치테이블로 세션이 없습니다. 새로고침해주세요.');
  }

  const result = await apiClient.post('/api/catchtable/execute', {
    token,
    brand_store_id: brandStoreId,
    actions,
    menu_cache: menuCache
  });

  if (result.success && result.data) {
    // 토큰이 갱신되었으면 저장
    if (result.data.token) {
      storeToken(result.data.token);
    }
    return {
      results: result.data.results || [],
      rejected: result.data.rejected || []
    };
  }

  throw new Error(result.error || '액션 실행에 실패했습니다.');
}

/**
 * 메뉴 캐시 갱신
 * @param {string} [brandStoreId='442'] - 매장 ID
 * @returns {Promise<Object>} 최신 메뉴 데이터
 */
export async function refreshCatchtableMenu(brandStoreId = '442') {
  const token = getStoredToken();

  if (!token) {
    throw new Error('캐치테이블로 세션이 없습니다. 새로고침해주세요.');
  }

  const result = await apiClient.get('/api/catchtable/refresh', {
    token,
    brand_store_id: brandStoreId
  });

  if (result.success && result.data) {
    if (result.data.token) {
      storeToken(result.data.token);
    }
    return {
      menu: result.data.menu?.data || result.data.menu || [],
      store: result.data.store || {},
      menuOptions: result.data.menuOptions || [],
      optionCategories: result.data.optionCategories || []
    };
  }

  throw new Error(result.error || '메뉴 새로고침에 실패했습니다.');
}
