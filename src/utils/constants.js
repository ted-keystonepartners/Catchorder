/**
 * 애플리케이션 전역 상수 정의
 */

/**
 * 매장 상태 정의
 * @typedef {Object} StoreStatus
 * @property {string} code - 상태 코드
 * @property {string} label - 한글 라벨
 * @property {string} color - Tailwind 색상 클래스
 * @property {string} description - 상태 설명
 */
export const STORE_STATUS = {
  PRE_INTRODUCTION: {
    code: 'PRE_INTRODUCTION',
    label: '소개 전',
    color: 'bg-gray-100 text-gray-700',
    description: '아직 캐치오더를 소개하지 않은 매장'
  },
  INTRODUCTION_COMPLETED: {
    code: 'INTRODUCTION_COMPLETED',
    label: '소개 완료',
    color: 'bg-blue-100 text-blue-700',
    description: '캐치오더 소개가 완료된 매장'
  },
  IN_PROGRESS: {
    code: 'IN_PROGRESS',
    label: '진행중',
    color: 'bg-yellow-100 text-yellow-700',
    description: '도입을 검토 중인 매장'
  },
  ADOPTION_CONFIRMED: {
    code: 'ADOPTION_CONFIRMED',
    label: '도입 확정',
    color: 'bg-green-100 text-green-700',
    description: '캐치오더 도입이 확정된 매장'
  },
  SIGNUP_COMPLETED: {
    code: 'SIGNUP_COMPLETED',
    label: '가입 완료',
    color: 'bg-green-200 text-green-800',
    description: '가입이 완료된 매장'
  },
  INSTALLATION_PENDING: {
    code: 'INSTALLATION_PENDING',
    label: '설치 대기',
    color: 'bg-purple-100 text-purple-700',
    description: '앱 설치 대기 중인 매장'
  },
  INSTALLATION_COMPLETED: {
    code: 'INSTALLATION_COMPLETED',
    label: '설치 완료',
    color: 'bg-green-300 text-green-900',
    description: '앱 설치가 완료된 매장'
  },
  REJECTED: {
    code: 'REJECTED',
    label: '거절',
    color: 'bg-red-100 text-red-700',
    description: '도입을 거절한 매장'
  },
  PENDING: {
    code: 'PENDING',
    label: '보류',
    color: 'bg-orange-100 text-orange-700',
    description: '검토가 보류된 매장'
  },
  NO_RESPONSE: {
    code: 'NO_RESPONSE',
    label: '무응답',
    color: 'bg-gray-200 text-gray-600',
    description: '연락이 닿지 않는 매장'
  },
  OUT_OF_BUSINESS: {
    code: 'OUT_OF_BUSINESS',
    label: '폐업',
    color: 'bg-red-200 text-red-800',
    description: '폐업한 매장'
  }
};

/**
 * 라이프사이클 단계 정의
 */
export const LIFECYCLE = {
  P1: { code: 'P1', label: 'P1 - 소개/관심도 확인', color: 'bg-blue-50 text-blue-600' },
  P2: { code: 'P2', label: 'P2 - 도입 검토', color: 'bg-yellow-50 text-yellow-600' },
  P3: { code: 'P3', label: 'P3 - 가입 진행', color: 'bg-purple-50 text-purple-600' },
  P4: { code: 'P4', label: 'P4 - 서비스 완료', color: 'bg-green-50 text-green-600' }
};

/**
 * 활동 유형 정의
 */
export const ACTIVITY_TYPES = {
  CALL: { code: 'CALL', label: '전화', color: 'bg-blue-500' },
  VISIT: { code: 'VISIT', label: '방문', color: 'bg-green-500' },
  SCHEDULE_CALL: { code: 'SCHEDULE_CALL', label: '전화 예약', color: 'bg-purple-500' },
  SCHEDULE_VISIT: { code: 'SCHEDULE_VISIT', label: '방문 예약', color: 'bg-orange-500' },
  MEMO: { code: 'MEMO', label: '메모', color: 'bg-gray-500' }
};

/**
 * 사용자 역할 정의
 */
export const ROLE = {
  ADMIN: { code: 'ADMIN', label: '관리자' },
  GENERAL: { code: 'GENERAL', label: '일반 사용자' }
};

/**
 * API 설정
 */
export const API_BASE = 'http://localhost:3001';

/**
 * 세션 타임아웃 (밀리초)
 */
export const SESSION_TIMEOUT = 3600000; // 1시간

/**
 * 페이지네이션 설정
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100]
};

/**
 * 날짜 형식
 */
export const DATE_FORMATS = {
  DISPLAY: 'YYYY.MM.DD',
  DISPLAY_TIME: 'YYYY.MM.DD HH:mm',
  TIME_ONLY: 'HH:mm',
  ISO: 'YYYY-MM-DDTHH:mm:ss.SSSZ'
};

/**
 * 알림 유형
 */
export const NOTIFICATION_TYPES = {
  SUCCESS: { type: 'success', color: 'bg-green-500' },
  ERROR: { type: 'error', color: 'bg-red-500' },
  WARNING: { type: 'warning', color: 'bg-yellow-500' },
  INFO: { type: 'info', color: 'bg-blue-500' }
};