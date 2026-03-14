/**
 * 캐치테이블로 액션 JSON 파싱/검증
 * Claude 응답에서 액션을 추출하고 위험도를 판별
 */

/**
 * Claude 응답에서 JSON 파싱
 * @param {string} responseText - Claude 응답 텍스트
 * @returns {Object|null} 파싱된 액션 객체
 */
export function parseActionResponse(responseText) {
  if (!responseText) return null;

  // JSON 블록 추출 (```json ... ``` 또는 순수 JSON)
  const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) ||
                    responseText.match(/(\{[\s\S]*"actions"[\s\S]*\})/);

  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch {
      // JSON 파싱 실패
    }
  }

  // 전체 텍스트가 JSON인 경우
  try {
    const parsed = JSON.parse(responseText);
    if (parsed.actions || parsed.message) return parsed;
  } catch {
    // 순수 텍스트 응답
  }

  // 액션 없는 일반 텍스트 응답
  return {
    message: responseText,
    actions: [],
    requires_confirmation: false
  };
}

/**
 * 액션의 확인 필요 여부 판별
 * @param {Object} actionResponse - 파싱된 액션 응답
 * @returns {boolean}
 */
export function requiresConfirmation(actionResponse) {
  if (!actionResponse) return false;

  // 명시적으로 지정된 경우
  if (typeof actionResponse.requires_confirmation === 'boolean') {
    return actionResponse.requires_confirmation;
  }

  // 액션이 없으면 확인 불필요
  if (!actionResponse.actions || actionResponse.actions.length === 0) {
    return false;
  }

  // risk_level로 판별
  return actionResponse.actions.some(a =>
    a.risk_level === 'normal' || a.risk_level === 'dangerous'
  );
}

/**
 * 위험한 액션 필터링
 * @param {Array} actions - 액션 배열
 * @returns {{safe: Array, needsConfirm: Array, blocked: Array}}
 */
export function categorizeActions(actions) {
  if (!actions || !Array.isArray(actions)) {
    return { safe: [], needsConfirm: [], blocked: [] };
  }

  const safe = [];
  const needsConfirm = [];
  const blocked = [];

  for (const action of actions) {
    switch (action.risk_level) {
      case 'safe':
        safe.push(action);
        break;
      case 'dangerous':
        blocked.push(action);
        break;
      case 'normal':
      default:
        needsConfirm.push(action);
        break;
    }
  }

  return { safe, needsConfirm, blocked };
}

/**
 * 액션 실행 결과를 자연어로 변환
 * @param {Array} results - 실행 결과 배열
 * @param {Array} rejected - 거부된 액션 배열
 * @returns {string} 자연어 요약
 */
export function formatActionResults(results, rejected = []) {
  const lines = [];

  for (const r of results) {
    if (r.success) {
      lines.push(`${r.description} - 완료`);
    } else {
      lines.push(`${r.description} - 실패: ${r.error || `HTTP ${r.status}`}`);
    }
  }

  for (const r of rejected) {
    lines.push(`${r.description} - 차단: ${r.reason}`);
  }

  return lines.join('\n');
}
