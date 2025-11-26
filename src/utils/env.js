/**
 * 환경 변수 관리 및 검증 유틸리티
 */

/**
 * 환경 변수 타입 정의
 * @typedef {Object} EnvConfig
 * @property {string} API_BASE - API 엔드포인트
 * @property {number} SESSION_TIMEOUT - 세션 타임아웃
 * @property {string} ENV - 환경 (development | production)
 * @property {string} LOG_LEVEL - 로그 레벨
 * @property {boolean} ENABLE_DEBUG - 디버그 모드
 * @property {boolean} ENABLE_ANALYTICS - 분석 도구 활성화
 */

/**
 * 환경 변수 기본값
 */
const ENV_DEFAULTS = {
  API_BASE: 'https://mk04952lrj.execute-api.ap-northeast-2.amazonaws.com/dev',
  SESSION_TIMEOUT: 3600000, // 1시간
  ENV: 'production',
  LOG_LEVEL: 'info',
  ENABLE_DEBUG: false,
  ENABLE_ANALYTICS: false
};

/**
 * 환경 변수 가져오기 및 검증
 * @returns {EnvConfig} 검증된 환경 변수
 */
export function getEnvConfig() {
  const config = {
    API_BASE: import.meta.env.VITE_API_BASE || ENV_DEFAULTS.API_BASE,
    SESSION_TIMEOUT: Number(import.meta.env.VITE_SESSION_TIMEOUT) || ENV_DEFAULTS.SESSION_TIMEOUT,
    ENV: import.meta.env.VITE_ENV || import.meta.env.MODE || ENV_DEFAULTS.ENV,
    LOG_LEVEL: import.meta.env.VITE_LOG_LEVEL || ENV_DEFAULTS.LOG_LEVEL,
    ENABLE_DEBUG: import.meta.env.VITE_ENABLE_DEBUG === 'true',
    ENABLE_ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS === 'true'
  };

  // 검증
  validateEnvConfig(config);
  
  return config;
}

/**
 * 환경 변수 검증
 * @param {EnvConfig} config - 환경 변수 설정
 * @throws {Error} 유효하지 않은 환경 변수가 있을 경우
 */
function validateEnvConfig(config) {
  // API_BASE URL 검증
  if (!config.API_BASE) {
    throw new Error('VITE_API_BASE 환경 변수가 설정되지 않았습니다.');
  }
  
  try {
    new URL(config.API_BASE);
  } catch (e) {
    throw new Error(`유효하지 않은 API_BASE URL: ${config.API_BASE}`);
  }

  // SESSION_TIMEOUT 검증
  if (isNaN(config.SESSION_TIMEOUT) || config.SESSION_TIMEOUT < 0) {
    throw new Error(`유효하지 않은 SESSION_TIMEOUT 값: ${config.SESSION_TIMEOUT}`);
  }

  // LOG_LEVEL 검증
  const validLogLevels = ['debug', 'info', 'warn', 'error'];
  if (!validLogLevels.includes(config.LOG_LEVEL)) {
    throw new Error(`유효하지 않은 LOG_LEVEL: ${config.LOG_LEVEL}. 가능한 값: ${validLogLevels.join(', ')}`);
  }

  // ENV 검증
  const validEnvs = ['development', 'production', 'test'];
  if (!validEnvs.includes(config.ENV)) {
    console.warn(`알 수 없는 환경: ${config.ENV}. 기본값 'production' 사용`);
  }
}

/**
 * 개발 환경 여부 확인
 * @returns {boolean}
 */
export function isDevelopment() {
  const config = getEnvConfig();
  return config.ENV === 'development';
}

/**
 * 프로덕션 환경 여부 확인
 * @returns {boolean}
 */
export function isProduction() {
  const config = getEnvConfig();
  return config.ENV === 'production';
}

/**
 * 디버그 모드 여부 확인
 * @returns {boolean}
 */
export function isDebugEnabled() {
  const config = getEnvConfig();
  return config.ENABLE_DEBUG || isDevelopment();
}

// 환경 변수 초기화 및 검증 (앱 시작 시 실행)
let _envConfig = null;

/**
 * 캐시된 환경 변수 가져오기
 * @returns {EnvConfig}
 */
export function getEnv() {
  if (!_envConfig) {
    _envConfig = getEnvConfig();
    
    // 개발 환경에서 환경 변수 로그 출력
    if (isDevelopment()) {
      console.log('📋 환경 변수 설정:', {
        ..._envConfig,
        API_BASE: _envConfig.API_BASE.substring(0, 50) + '...' // URL 일부만 표시
      });
    }
  }
  
  return _envConfig;
}

// 기본 export
export default {
  get: getEnv,
  isDevelopment,
  isProduction,
  isDebugEnabled
};