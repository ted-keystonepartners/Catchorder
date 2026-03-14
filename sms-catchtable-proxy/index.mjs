/**
 * sms-catchtable-proxy Lambda 메인 핸들러
 *
 * 엔드포인트:
 *   POST /api/catchtable/init    - 세션 초기화 (로그인 + 메뉴/매장 데이터 로드)
 *   POST /api/catchtable/execute - 액션 실행 (검증 후 캐치테이블로 API 호출)
 *   GET  /api/catchtable/refresh - 메뉴 캐시 갱신
 */
import { CORS_HEADERS, DEFAULT_BRAND_STORE_ID } from './constants.mjs';
import { initSession, callCatchtableroApi } from './catchtableClient.mjs';
import { validateActions, validateMenuId } from './actionValidator.mjs';

/**
 * 옵션 데이터에서 옵션 카테고리(그룹) 메타 정보를 구성
 * - API에서 옵션 카테고리 이름을 직접 조회할 수 없으므로 (GET /api/menu/option/category 에 validation 버그)
 *   옵션 데이터를 그룹핑하여 카테고리 정보를 구성
 * @param {Array} options - 옵션 목록
 * @param {Array} menuCategories - 메뉴 카테고리 목록 (메뉴-옵션 연결 정보용)
 * @returns {Array} 옵션 카테고리 배열
 */
function buildOptionCategories(options, menuCategories) {
  if (!options || options.length === 0) return [];

  // 1. 옵션을 카테고리별로 그룹핑
  const groups = {};
  for (const opt of options) {
    const catId = opt.menu_option_category_id;
    if (!groups[catId]) {
      groups[catId] = { id: catId, options: [] };
    }
    groups[catId].options.push(opt);
  }

  // 2. 메뉴에서 옵션카테고리 → 적용 메뉴 역매핑
  const catMenuMap = {};
  if (menuCategories) {
    for (const cat of menuCategories) {
      for (const menu of (cat.menus || [])) {
        let ids = menu.menu_option_category_ids;
        if (typeof ids === 'string') {
          try { ids = JSON.parse(ids); } catch { ids = []; }
        }
        if (!Array.isArray(ids)) ids = [];
        for (const ocId of ids) {
          if (!catMenuMap[ocId]) catMenuMap[ocId] = [];
          catMenuMap[ocId].push(menu.name);
        }
      }
    }
  }

  // 3. 카테고리 배열 구성
  return Object.values(groups).map(g => ({
    id: g.id,
    name: g.options.map(o => o.name).join('/'),
    optionCount: g.options.length,
    appliedMenus: catMenuMap[g.id] || []
  }));
}

/**
 * API 에러 메시지를 문자열로 변환 (message가 객체일 수 있음)
 */
function formatApiError(message) {
  if (!message) return 'API 오류';
  if (typeof message === 'string') return message;
  // 유효성 검사 에러: { field: ["error msg"] } 형태
  if (typeof message === 'object') {
    const parts = [];
    for (const [field, errors] of Object.entries(message)) {
      const msgs = Array.isArray(errors) ? errors.join(', ') : String(errors);
      parts.push(`${field}: ${msgs}`);
    }
    return parts.join('; ') || 'API 오류';
  }
  return String(message);
}

/**
 * 특정 API에 맞게 body 필드를 변환
 * - brand_store_time/update: time 배열 → JSON 문자열 (PHP json_decode 호환)
 */
function transformBodyForApi(path, body) {
  if (!body) return body;

  // brand_store_time/update: time 필드가 배열이면 JSON 문자열로 변환
  // part 필드도 문자열로 변환 (PHP 서버에서 null로 저장되는 버그 우회 시도)
  if (path.includes('/brand_store_time/update') && Array.isArray(body.time)) {
    return {
      ...body,
      time: JSON.stringify(body.time),
      part: body.part != null ? String(body.part) : '1'
    };
  }

  return body;
}

/**
 * 응답 헬퍼
 */
function respond(statusCode, body) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body)
  };
}

function success(data) {
  return respond(200, { success: true, data });
}

function error(statusCode, message) {
  return respond(statusCode, { success: false, error: message });
}

/**
 * Lambda 메인 핸들러
 */
export const handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS' || event.requestContext?.http?.method === 'OPTIONS') {
    return respond(200, {});
  }

  try {
    const path = event.path || event.rawPath || '';
    const method = event.httpMethod || event.requestContext?.http?.method || 'GET';
    const body = event.body ? JSON.parse(event.body) : {};

    console.log(`[Handler] ${method} ${path}`);

    // 라우팅
    if (path.includes('/api/catchtable/init')) {
      return await handleInit(body);
    }

    if (path.includes('/api/catchtable/execute')) {
      return await handleExecute(body);
    }

    if (path.includes('/api/catchtable/refresh')) {
      const queryParams = event.queryStringParameters || {};
      return await handleRefresh(queryParams, body);
    }

    return error(404, '지원하지 않는 경로입니다.');

  } catch (err) {
    console.error('[Handler] 처리 중 오류:', err);
    return error(500, err.message || '서버 내부 오류가 발생했습니다.');
  }
};

/**
 * POST /api/catchtable/init
 * 세션 초기화 - 로그인 + 메뉴/매장 데이터 로드
 *
 * Request body:
 *   { token?: string, brand_store_id?: string }
 *
 * Response:
 *   { token, menu, store, renewed }
 */
async function handleInit(body) {
  const { token: existingToken, brand_store_id } = body;
  const brandStoreId = brand_store_id || DEFAULT_BRAND_STORE_ID;

  console.log(`[Init] 세션 초기화 - brand_store_id: ${brandStoreId}`);

  const result = await initSession(existingToken, brandStoreId);

  if (result.menuStatus !== 200) {
    console.error('[Init] 메뉴 로드 실패:', result.menuStatus);
    return error(502, '캐치테이블로 메뉴 데이터를 불러오지 못했습니다.');
  }

  // 옵션 데이터 로드
  let menuOptions = [];
  try {
    const optResult = await callCatchtableroApi({
      method: 'GET',
      path: `/menu/option?brand_store_id=${brandStoreId}`,
      token: result.token
    });
    if (optResult.status === 200 && optResult.data?.data) {
      menuOptions = optResult.data.data;
    }
  } catch (err) {
    console.warn('[Init] 옵션 로드 실패 (무시):', err.message);
  }

  // 옵션 카테고리 그룹 정보 구성
  const menuCats = result.menu?.data || [];
  const optionCategories = buildOptionCategories(menuOptions, menuCats);

  return success({
    token: result.token,
    renewed: result.renewed,
    menu: result.menu,
    store: result.store,
    menuOptions,
    optionCategories,
    brand_store_id: brandStoreId
  });
}

/**
 * POST /api/catchtable/execute
 * 액션 실행 - 검증 후 캐치테이블로 API 호출
 *
 * Request body:
 *   {
 *     token: string,
 *     brand_store_id?: string,
 *     actions: Array<{ method, path, params?, body?, description? }>,
 *     menu_cache?: Object  // 메뉴 ID 검증용
 *   }
 *
 * Response:
 *   { results: Array, rejected: Array, token }
 */
async function handleExecute(body) {
  const { token, brand_store_id, actions, menu_cache } = body;

  if (!token) {
    return error(401, '토큰이 필요합니다.');
  }

  if (!actions || !Array.isArray(actions) || actions.length === 0) {
    return error(400, '실행할 액션이 없습니다.');
  }

  const brandStoreId = brand_store_id || DEFAULT_BRAND_STORE_ID;
  console.log(`[Execute] ${actions.length}개 액션 실행 요청`);

  // 1. 액션 Whitelist 검증
  const { valid, rejected } = validateActions(actions);

  if (valid.length === 0) {
    return success({
      results: [],
      rejected: rejected.map(r => ({
        description: r.description,
        reason: r.reason,
        riskLevel: r.riskLevel
      })),
      token
    });
  }

  // 2. 메뉴 ID 검증 (캐시가 있는 경우)
  if (menu_cache) {
    for (const action of valid) {
      const menuId = action.params?.menu_id;
      if (menuId && !validateMenuId(menuId, menu_cache)) {
        return error(400, `메뉴 ID ${menuId}를 찾을 수 없습니다. 메뉴 정보를 새로고침해주세요.`);
      }
    }
  }

  // 3. 액션 순차 실행 (이전 액션 결과를 다음 액션에서 참조 가능)
  const results = [];
  let currentToken = token;
  let prevResultId = null; // 이전 액션에서 생성된 엔티티 ID

  for (const action of valid) {
    try {
      // 이전 액션 결과 참조 치환 ($prev → 이전 생성 ID)
      let resolvedParams = { ...action.params, brand_store_id: brandStoreId };
      let resolvedBody = action.body ? { ...action.body } : undefined;

      // path에서 $prev 치환 (예: /menu_category/$prev/menu → /menu_category/2000/menu)
      let resolvedPath = action.path;
      if (prevResultId) {
        resolvedPath = resolvedPath.replace(/\$prev(\b|\.id)/g, String(prevResultId));
        // params에서 $prev 치환
        for (const [key, val] of Object.entries(resolvedParams)) {
          if (val === '$prev' || val === '$prev.id') {
            resolvedParams[key] = String(prevResultId);
          }
        }
        // body에서 $prev 치환
        if (resolvedBody) {
          for (const [key, val] of Object.entries(resolvedBody)) {
            if (val === '$prev' || val === '$prev.id') {
              resolvedBody[key] = String(prevResultId);
            }
          }
        }
      }

      console.log(`[Execute] 액션: ${action.method} ${resolvedPath} (prevResultId: ${prevResultId})`);

      // 특정 API에 맞게 body 필드 변환 (예: time 배열→JSON문자열)
      const transformedBody = transformBodyForApi(resolvedPath, resolvedBody);

      const result = await callCatchtableroApi({
        method: action.method,
        path: resolvedPath,
        body: transformedBody,
        params: resolvedParams,
        token: currentToken
      });

      // 토큰이 갱신되었으면 업데이트
      if (result.token !== currentToken) {
        currentToken = result.token;
      }

      // 캐치테이블로 API는 HTTP 200이어도 body에 success:false를 반환할 수 있음
      const httpOk = result.status >= 200 && result.status < 300;
      const apiOk = result.data?.success !== false;
      results.push({
        description: action.description,
        status: result.status,
        data: result.data,
        success: httpOk && apiOk,
        error: !apiOk ? formatApiError(result.data?.message) : undefined
      });

      // 생성 액션(POST 201)의 결과에서 ID 추출 → 다음 액션에서 $prev로 참조 가능
      if (httpOk && apiOk && result.status === 201 && result.data?.data) {
        let created;
        if (Array.isArray(result.data.data)) {
          // 배열인 경우 가장 높은 ID를 가진 항목이 새로 생성된 것 (auto-increment)
          created = result.data.data.reduce((max, item) =>
            (item.id > (max?.id || 0)) ? item : max, null);
        } else {
          created = result.data.data;
        }
        if (created?.id) {
          prevResultId = created.id;
          console.log(`[Execute] 이전 액션 결과 ID 저장: ${prevResultId} (${created.name || ''})`);
        }
      }

    } catch (err) {
      console.error(`[Execute] 액션 실행 오류: ${action.description}`, err.message);
      results.push({
        description: action.description,
        status: 500,
        error: err.message,
        success: false
      });
    }
  }

  return success({
    results,
    rejected: rejected.map(r => ({
      description: r.description,
      reason: r.reason,
      riskLevel: r.riskLevel
    })),
    token: currentToken
  });
}

/**
 * GET /api/catchtable/refresh
 * 메뉴 캐시 갱신 - 최신 메뉴 상태 반환
 *
 * Query params or body:
 *   { token: string, brand_store_id?: string }
 *
 * Response:
 *   { menu, token }
 */
async function handleRefresh(queryParams, body) {
  const token = queryParams.token || body.token;
  const brandStoreId = queryParams.brand_store_id || body.brand_store_id || DEFAULT_BRAND_STORE_ID;

  if (!token) {
    return error(401, '토큰이 필요합니다.');
  }

  console.log(`[Refresh] 메뉴 캐시 갱신 - brand_store_id: ${brandStoreId}`);

  const menuResult = await callCatchtableroApi({
    method: 'GET',
    path: `/menu/categories?brand_store_id=${brandStoreId}`,
    token
  });

  if (menuResult.status !== 200) {
    return error(502, '캐치테이블로 메뉴 데이터를 불러오지 못했습니다.');
  }

  // 옵션 데이터도 함께 갱신
  let menuOptions = [];
  try {
    const optResult = await callCatchtableroApi({
      method: 'GET',
      path: `/menu/option?brand_store_id=${brandStoreId}`,
      token: menuResult.token
    });
    if (optResult.status === 200 && optResult.data?.data) {
      menuOptions = optResult.data.data;
    }
  } catch (err) {
    console.warn('[Refresh] 옵션 로드 실패 (무시):', err.message);
  }

  // 옵션 카테고리 그룹 정보 구성
  const refreshMenuCats = menuResult.data?.data || [];
  const optionCategories = buildOptionCategories(menuOptions, refreshMenuCats);

  // 매장 정보도 함께 갱신
  let storeData = {};
  try {
    const storeResult = await callCatchtableroApi({
      method: 'GET',
      path: `/brand_store?brand_store_id=${brandStoreId}`,
      token: menuResult.token
    });
    if (storeResult.status === 200 && storeResult.data?.data) {
      storeData = storeResult.data.data;
    }
  } catch (err) {
    console.warn('[Refresh] 매장 정보 로드 실패 (무시):', err.message);
  }

  return success({
    menu: menuResult.data,
    store: storeData,
    menuOptions,
    optionCategories,
    token: menuResult.token,
    brand_store_id: brandStoreId
  });
}
