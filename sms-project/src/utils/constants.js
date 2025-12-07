/**
 * 애플리케이션 전역 상수 정의
 */

/**
 * @typedef {'VISIT_PENDING'|'VISIT_COMPLETED'|'REVISIT_SCHEDULED'|'INFO_REQUEST'|'REMOTE_INSTALL_SCHEDULED'|'ADMIN_SETTING'|'QR_LINKING'|'SERVICE_TERMINATED'|'UNUSED_TERMINATED'|'PENDING'} StoreStatusCode
 * @typedef {'P1'|'P2'|'P3'|'P4'} LifecycleCode
 * @typedef {'CALL'|'VISIT'|'SCHEDULE_CALL'|'SCHEDULE_VISIT'|'MEMO'} ActivityTypeCode
 * @typedef {'ADMIN'|'GENERAL'} RoleCode
 */

/**
 * 매장 상태 정의
 * @typedef {Object} StoreStatusItem
 * @property {StoreStatusCode} code - 상태 코드
 * @property {string} label - 한글 라벨
 * @property {string} color - Tailwind 색상 클래스
 * @property {string} description - 상태 설명
 */
export const STORE_STATUS = {
  VISIT_PENDING: {
    code: 'VISIT_PENDING',
    label: '방문대기',
    color: 'bg-gray-100 text-gray-700',
    description: '방문 대기 중인 매장',
    priority: 1
  },
  VISIT_COMPLETED: {
    code: 'VISIT_COMPLETED',
    label: '방문완료',
    color: 'bg-blue-100 text-blue-700',
    description: '방문이 완료된 매장',
    priority: 2
  },
  REVISIT_SCHEDULED: {
    code: 'REVISIT_SCHEDULED',
    label: '재방문예정',
    color: 'bg-yellow-100 text-yellow-700',
    description: '재방문이 예정된 매장',
    priority: 3
  },
  INFO_REQUEST: {
    code: 'INFO_REQUEST',
    label: '추가정보요청',
    color: 'bg-purple-100 text-purple-700',
    description: '추가 정보를 요청한 매장',
    priority: 4
  },
  REMOTE_INSTALL_SCHEDULED: {
    code: 'REMOTE_INSTALL_SCHEDULED',
    label: '에이전트설치예정',
    color: 'bg-green-100 text-green-700',
    description: '에이전트 설치가 예정된 매장',
    priority: 5
  },
  ADMIN_SETTING: {
    code: 'ADMIN_SETTING',
    label: '어드민셋팅',
    color: 'bg-green-200 text-green-800',
    description: '어드민 설정 중인 매장',
    priority: 6
  },
  QR_LINKING: {
    code: 'QR_LINKING',
    label: 'POS연동예정',
    color: 'bg-green-300 text-green-900',
    description: 'POS 연동 예정인 매장',
    priority: 7
  },
  DEFECT_REPAIR: {
    code: 'DEFECT_REPAIR',
    label: '하자보수중',
    color: 'bg-indigo-100 text-indigo-700',
    description: '하자보수 진행 중인 매장',
    priority: 8
  },
  QR_MENU_INSTALL: {
    code: 'QR_MENU_INSTALL',
    label: '최종설치완료',
    color: 'bg-teal-100 text-teal-700',
    description: '최종 설치가 완료된 매장',
    priority: 9
  },
  SERVICE_TERMINATED: {
    code: 'SERVICE_TERMINATED',
    label: '서비스해지',
    color: 'bg-red-100 text-red-700',
    description: '서비스가 해지된 매장',
    priority: 10
  },
  UNUSED_TERMINATED: {
    code: 'UNUSED_TERMINATED',
    label: '미이용해지',
    color: 'bg-red-200 text-red-800',
    description: '미이용으로 해지된 매장',
    priority: 11
  },
  PENDING: {
    code: 'PENDING',
    label: '보류',
    color: 'bg-orange-100 text-orange-700',
    description: '검토가 보류된 매장',
    priority: 12
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
 * API 설정 - 환경변수에서 가져옴
 */
export const API_BASE = import.meta.env.VITE_API_BASE || 'https://l0dtib1m19.execute-api.ap-northeast-2.amazonaws.com/dev';

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