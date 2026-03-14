/**
 * 액션 검증기 (Whitelist)
 * LLM이 생성한 액션을 Lambda에서 2차 검증
 * 허용된 API만 실행하고, 위험/금지 API는 차단
 */
import { ACTION_WHITELIST } from './constants.mjs';

/**
 * 경로가 패턴과 매칭되는지 확인
 * 패턴의 *는 경로 세그먼트 하나에 매칭
 * @param {string} path - 실제 경로
 * @param {string} pattern - 패턴 (예: /menu/삼/soldout/)
 * @returns {boolean}
 */
function matchPath(path, pattern) {
  // 정확히 일치
  if (path === pattern) return true;

  // 패턴이 경로의 시작부분과 일치 (prefix match)
  if (path.startsWith(pattern)) return true;

  // 와일드카드 매칭
  if (pattern.includes('*')) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '[^/]+'));
    return regex.test(path);
  }

  return false;
}

/**
 * 액션의 위험도 레벨 판별
 * @param {string} method - HTTP 메서드
 * @param {string} path - API 경로
 * @returns {'safe'|'normal'|'dangerous'|'blocked'|'unknown'}
 */
export function getRiskLevel(method, path) {
  // 금지 목록 먼저 확인
  for (const rule of ACTION_WHITELIST.blocked) {
    if (rule.method === method && matchPath(path, rule.pattern)) {
      return 'blocked';
    }
  }

  // 위험 목록 확인
  for (const rule of ACTION_WHITELIST.dangerous) {
    if (rule.method === method && matchPath(path, rule.pattern)) {
      return 'dangerous';
    }
  }

  // 안전 목록 확인
  for (const rule of ACTION_WHITELIST.safe) {
    if (rule.method === method && matchPath(path, rule.pattern)) {
      return 'safe';
    }
  }

  // 보통 목록 확인
  for (const rule of ACTION_WHITELIST.normal) {
    if (rule.method === method && matchPath(path, rule.pattern)) {
      return 'normal';
    }
  }

  return 'unknown';
}

/**
 * 액션 배열 검증
 * @param {Array<{method: string, path: string, params?: Object, description?: string}>} actions
 * @returns {{valid: Array, rejected: Array}}
 */
export function validateActions(actions) {
  const valid = [];
  const rejected = [];

  for (const action of actions) {
    // 경로 내 파라미터 치환
    let resolvedPath = action.path;
    if (action.params) {
      for (const [key, value] of Object.entries(action.params)) {
        resolvedPath = resolvedPath.replace(`{${key}}`, value);
      }
    }

    const riskLevel = getRiskLevel(action.method, resolvedPath);

    if (riskLevel === 'blocked') {
      rejected.push({
        ...action,
        resolvedPath,
        riskLevel,
        reason: '이 작업은 보안상 지원하지 않습니다.'
      });
    } else if (riskLevel === 'dangerous') {
      rejected.push({
        ...action,
        resolvedPath,
        riskLevel,
        reason: '위험도가 높은 작업으로 실행이 차단되었습니다.'
      });
    } else if (riskLevel === 'unknown') {
      rejected.push({
        ...action,
        resolvedPath,
        riskLevel,
        reason: '허용되지 않은 API 경로입니다.'
      });
    } else {
      valid.push({
        ...action,
        resolvedPath,
        riskLevel
      });
    }
  }

  return { valid, rejected };
}

/**
 * 메뉴 ID 존재 여부 검증 (캐시와 대조)
 * @param {number|string} menuId - 검증할 메뉴 ID
 * @param {Object} menuCache - 메뉴 캐시 데이터
 * @returns {boolean}
 */
export function validateMenuId(menuId, menuCache) {
  if (!menuCache || !menuId) return false;

  // 캐시 구조에 따라 메뉴 ID 검색
  const categories = menuCache.data || menuCache;

  if (Array.isArray(categories)) {
    for (const category of categories) {
      const menus = category.menus || category.menu_list || [];
      if (menus.some(menu => String(menu.id) === String(menuId) || String(menu.menu_id) === String(menuId))) {
        return true;
      }
    }
  }

  return false;
}
