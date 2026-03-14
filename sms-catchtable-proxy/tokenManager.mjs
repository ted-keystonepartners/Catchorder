/**
 * 캐치테이블로 토큰 관리
 * - 매 요청 시 GET /profile로 유효성 확인
 * - 401 시 POST /biz/login으로 재로그인
 * - 토큰을 응답에 포함하여 프론트에서 sessionStorage 관리
 */
import { GENERAL_API_BASE } from './constants.mjs';

const CT_LOGIN_ID = process.env.CT_LOGIN_ID || 'softment02';
const CT_PASSWORD = process.env.CT_PASSWORD || 'softment02';

/**
 * 캐치테이블로 로그인하여 토큰 획득
 * @returns {Promise<{token: string, refreshToken: string}>}
 */
export async function login() {
  console.log('[TokenManager] 캐치테이블로 로그인 시도...');

  const response = await fetch(`${GENERAL_API_BASE}/biz/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      login_id: CT_LOGIN_ID,
      login_pwd: CT_PASSWORD
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[TokenManager] 로그인 실패:', response.status, errorBody);
    throw new Error(`캐치테이블로 로그인 실패: ${response.status}`);
  }

  const data = await response.json();
  console.log('[TokenManager] 로그인 성공');

  // 응답 구조에서 토큰 추출 (API 응답 형식에 따라 조정)
  const token = data.data?.access_token || data.access_token || data.data?.token || data.token;
  const refreshToken = data.data?.refresh_token || data.refresh_token;

  if (!token) {
    throw new Error('캐치테이블로 로그인 응답에 토큰이 없습니다.');
  }

  return { token, refreshToken };
}

/**
 * 토큰 유효성 확인
 * @param {string} token - 확인할 토큰
 * @returns {Promise<boolean>} 유효 여부
 */
export async function validateToken(token) {
  if (!token) return false;

  try {
    const response = await fetch(`${GENERAL_API_BASE}/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    return response.ok;
  } catch (error) {
    console.error('[TokenManager] 토큰 검증 오류:', error.message);
    return false;
  }
}

/**
 * 유효한 토큰 보장 - 기존 토큰 확인 후 필요시 재로그인
 * @param {string|null} existingToken - 프론트에서 전달한 기존 토큰
 * @returns {Promise<{token: string, refreshToken?: string, renewed: boolean}>}
 */
export async function ensureValidToken(existingToken) {
  // 기존 토큰이 있으면 유효성 확인
  if (existingToken) {
    const isValid = await validateToken(existingToken);
    if (isValid) {
      return { token: existingToken, renewed: false };
    }
    console.log('[TokenManager] 기존 토큰 만료 - 재로그인 필요');
  }

  // 새로 로그인
  const { token, refreshToken } = await login();
  return { token, refreshToken, renewed: true };
}
