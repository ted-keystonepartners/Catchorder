/**
 * 앱 전체 메시지 상수
 * 일관된 메시지 관리 및 다국어 지원 준비
 */

// API 에러 메시지
export const API_ERRORS = {
  NETWORK_ERROR: '네트워크 오류가 발생했습니다.',
  TIMEOUT_ERROR: '요청 시간이 초과되었습니다.',
  SERVER_ERROR: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  INVALID_RESPONSE: '잘못된 응답 형식입니다.',
  UNAUTHORIZED: '인증이 필요합니다.',
  FORBIDDEN: '접근 권한이 없습니다.',
  NOT_FOUND: '요청한 리소스를 찾을 수 없습니다.',
  RETRY_FAILED: '여러 번 시도했지만 실패했습니다.',
};

// 인증 관련 메시지
export const AUTH_MESSAGES = {
  LOGIN_SUCCESS: '로그인되었습니다.',
  LOGIN_FAILED: '로그인에 실패했습니다.',
  LOGOUT_SUCCESS: '로그아웃되었습니다.',
  SESSION_EXPIRED: '세션이 만료되었습니다. 다시 로그인해주세요.',
  INVALID_CREDENTIALS: '이메일 또는 비밀번호가 올바르지 않습니다.',
  TOKEN_INVALID: '유효하지 않은 인증 토큰입니다.',
  ROLE_REQUIRED: '권한이 필요합니다.',
};

// 매장 관련 메시지
export const STORE_MESSAGES = {
  CREATE_SUCCESS: '매장이 등록되었습니다.',
  CREATE_FAILED: '매장 등록에 실패했습니다.',
  UPDATE_SUCCESS: '매장 정보가 수정되었습니다.',
  UPDATE_FAILED: '매장 수정에 실패했습니다.',
  DELETE_SUCCESS: '매장이 삭제되었습니다.',
  DELETE_FAILED: '매장 삭제에 실패했습니다.',
  NOT_FOUND: '매장을 찾을 수 없습니다.',
  LOAD_FAILED: '매장 목록을 불러오는데 실패했습니다.',
  DUPLICATE_NAME: '이미 존재하는 매장명입니다.',
};

// 일정 관련 메시지
export const SCHEDULE_MESSAGES = {
  CREATE_SUCCESS: '일정이 등록되었습니다.',
  CREATE_FAILED: '일정 등록에 실패했습니다.',
  UPDATE_SUCCESS: '일정이 수정되었습니다.',
  UPDATE_FAILED: '일정 수정에 실패했습니다.',
  DELETE_SUCCESS: '일정이 삭제되었습니다.',
  DELETE_FAILED: '일정 삭제에 실패했습니다.',
  LOAD_FAILED: '일정을 불러오는데 실패했습니다.',
  CONFLICT: '해당 시간에 이미 일정이 있습니다.',
};

// 동의서 관련 메시지
export const CONSENT_MESSAGES = {
  SUBMIT_SUCCESS: '동의서가 제출되었습니다. 감사합니다.',
  SUBMIT_FAILED: '동의서 제출에 실패했습니다.',
  LOAD_FAILED: '동의서 정보를 불러오는데 실패했습니다.',
  ALREADY_SUBMITTED: '이미 동의서를 제출하셨습니다.',
  LINK_COPIED: '링크가 클립보드에 복사되었습니다.',
  LINK_EXPIRED: '만료된 링크입니다.',
  INVALID_LINK: '유효하지 않은 링크입니다.',
};

// 설치 관련 메시지
export const INSTALL_MESSAGES = {
  REQUEST_SUCCESS: '설치 요청이 접수되었습니다.',
  REQUEST_FAILED: '설치 요청에 실패했습니다.',
  UPDATE_SUCCESS: '설치 상태가 업데이트되었습니다.',
  UPDATE_FAILED: '설치 상태 업데이트에 실패했습니다.',
  COMPLETE: '설치가 완료되었습니다.',
  SERVICE_TERMINATED: '서비스가 해지되었습니다.',
};

// 검증 메시지
export const VALIDATION_MESSAGES = {
  REQUIRED: '필수 입력 항목입니다.',
  EMAIL_INVALID: '올바른 이메일 형식이 아닙니다.',
  PHONE_INVALID: '올바른 전화번호 형식이 아닙니다.',
  PASSWORD_TOO_SHORT: '비밀번호는 최소 8자 이상이어야 합니다.',
  PASSWORD_MISMATCH: '비밀번호가 일치하지 않습니다.',
  DATE_INVALID: '올바른 날짜 형식이 아닙니다.',
  TIME_INVALID: '올바른 시간 형식이 아닙니다.',
  NUMBER_INVALID: '숫자만 입력 가능합니다.',
  MIN_LENGTH: (min) => `최소 ${min}자 이상 입력해주세요.`,
  MAX_LENGTH: (max) => `최대 ${max}자까지 입력 가능합니다.`,
  MIN_VALUE: (min) => `${min} 이상의 값을 입력해주세요.`,
  MAX_VALUE: (max) => `${max} 이하의 값을 입력해주세요.`,
};

// 일반 메시지
export const COMMON_MESSAGES = {
  LOADING: '불러오는 중...',
  SAVING: '저장 중...',
  DELETING: '삭제 중...',
  PROCESSING: '처리 중...',
  SUCCESS: '성공적으로 처리되었습니다.',
  FAILED: '처리에 실패했습니다.',
  CONFIRM_DELETE: '정말 삭제하시겠습니까?',
  CONFIRM_CANCEL: '작업을 취소하시겠습니까? 저장되지 않은 내용은 사라집니다.',
  NO_DATA: '데이터가 없습니다.',
  NO_PERMISSION: '권한이 없습니다.',
  TRY_AGAIN: '다시 시도해주세요.',
  COPIED: '클립보드에 복사되었습니다.',
  SAVED: '저장되었습니다.',
  SERVICE_TERMINATED: '서비스가 해지되었습니다.',
};

// 파일 관련 메시지
export const FILE_MESSAGES = {
  UPLOAD_SUCCESS: '파일이 업로드되었습니다.',
  UPLOAD_FAILED: '파일 업로드에 실패했습니다.',
  SIZE_EXCEEDED: '파일 크기가 너무 큽니다.',
  TYPE_NOT_ALLOWED: '허용되지 않는 파일 형식입니다.',
  DOWNLOAD_FAILED: '파일 다운로드에 실패했습니다.',
};

// 페이지 관련 메시지
export const PAGE_MESSAGES = {
  NOT_FOUND: '페이지를 찾을 수 없습니다.',
  ACCESS_DENIED: '접근이 거부되었습니다.',
  UNDER_CONSTRUCTION: '준비 중인 페이지입니다.',
  MAINTENANCE: '시스템 점검 중입니다.',
};

// 기본 에러 메시지 가져오기 함수
export const getErrorMessage = (error) => {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  if (error?.error) return error.error;
  return API_ERRORS.SERVER_ERROR;
};

// HTTP 상태 코드별 메시지
export const getHttpErrorMessage = (status) => {
  switch (status) {
    case 400:
      return '잘못된 요청입니다.';
    case 401:
      return AUTH_MESSAGES.UNAUTHORIZED;
    case 403:
      return AUTH_MESSAGES.FORBIDDEN;
    case 404:
      return API_ERRORS.NOT_FOUND;
    case 408:
      return API_ERRORS.TIMEOUT_ERROR;
    case 500:
    case 502:
    case 503:
      return API_ERRORS.SERVER_ERROR;
    default:
      return API_ERRORS.SERVER_ERROR;
  }
};