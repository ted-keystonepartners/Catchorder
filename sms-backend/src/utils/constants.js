/**
 * 상수 정의 (프론트엔드와 동일)
 */

export const STORE_STATUS = {
  PRE_INTRODUCTION: { 
    code: 'PRE_INTRODUCTION', 
    label: '소개 전', 
    color: 'bg-gray-100 text-gray-700' 
  },
  INTRODUCTION_COMPLETED: { 
    code: 'INTRODUCTION_COMPLETED', 
    label: '소개 완료', 
    color: 'bg-blue-100 text-blue-700' 
  },
  ADOPTION_CONFIRMED: { 
    code: 'ADOPTION_CONFIRMED', 
    label: '도입 확정', 
    color: 'bg-green-100 text-green-700' 
  },
  SIGNUP_COMPLETED: { 
    code: 'SIGNUP_COMPLETED', 
    label: '가입 완료', 
    color: 'bg-purple-100 text-purple-700' 
  },
  IN_PROGRESS: { 
    code: 'IN_PROGRESS', 
    label: '진행 중', 
    color: 'bg-yellow-100 text-yellow-700' 
  },
  COMPLETED: { 
    code: 'COMPLETED', 
    label: '완료', 
    color: 'bg-green-100 text-green-800' 
  },
  MAINTENANCE: { 
    code: 'MAINTENANCE', 
    label: '유지보수', 
    color: 'bg-orange-100 text-orange-700' 
  },
  SUSPENDED: { 
    code: 'SUSPENDED', 
    label: '일시중단', 
    color: 'bg-red-100 text-red-700' 
  },
  CANCELLED: { 
    code: 'CANCELLED', 
    label: '해지', 
    color: 'bg-gray-100 text-gray-700' 
  },
  REFUNDED: { 
    code: 'REFUNDED', 
    label: '환불', 
    color: 'bg-red-100 text-red-800' 
  },
  ARCHIVED: { 
    code: 'ARCHIVED', 
    label: '보관', 
    color: 'bg-gray-100 text-gray-600' 
  }
};

export const LIFECYCLE = {
  P1: { code: 'P1', label: 'P1 - 영업' },
  P2: { code: 'P2', label: 'P2 - 개발/설치' },
  P3: { code: 'P3', label: 'P3 - 운영' },
  P4: { code: 'P4', label: 'P4 - 유지보수' }
};

export const ACTIVITY_TYPES = {
  CALL: { code: 'CALL', label: '전화 상담' },
  VISIT: { code: 'VISIT', label: '방문 상담' },
  EMAIL: { code: 'EMAIL', label: '이메일' },
  SCHEDULE_CALL: { code: 'SCHEDULE_CALL', label: '전화 예정' },
  SCHEDULE_VISIT: { code: 'SCHEDULE_VISIT', label: '방문 예정' },
  INSTALLATION: { code: 'INSTALLATION', label: '설치 작업' },
  TRAINING: { code: 'TRAINING', label: '교육' },
  MAINTENANCE: { code: 'MAINTENANCE', label: '유지보수' },
  ISSUE_REPORT: { code: 'ISSUE_REPORT', label: '이슈 신고' },
  FOLLOW_UP: { code: 'FOLLOW_UP', label: '후속 조치' }
};

export const ROLE = {
  ADMIN: { code: 'ADMIN', label: '관리자' },
  GENERAL: { code: 'GENERAL', label: '일반 사용자' }
};

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500
};

export const ERROR_CODES = {
  // 인증 관련
  UNAUTHORIZED: 'UNAUTHORIZED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  FORBIDDEN: 'FORBIDDEN',
  
  // 사용자 관련
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
  
  // 매장 관련
  STORE_NOT_FOUND: 'STORE_NOT_FOUND',
  INVALID_STORE_DATA: 'INVALID_STORE_DATA',
  
  // 활동 관련
  ACTIVITY_NOT_FOUND: 'ACTIVITY_NOT_FOUND',
  INVALID_ACTIVITY_DATA: 'INVALID_ACTIVITY_DATA',
  
  // 설치 관련
  INSTALLATION_LINK_NOT_FOUND: 'INSTALLATION_LINK_NOT_FOUND',
  INVALID_INSTALLATION_TOKEN: 'INVALID_INSTALLATION_TOKEN',
  INSTALLATION_ALREADY_COMPLETED: 'INSTALLATION_ALREADY_COMPLETED',
  
  // 파일 관련
  INVALID_FILE_FORMAT: 'INVALID_FILE_FORMAT',
  FILE_UPLOAD_ERROR: 'FILE_UPLOAD_ERROR',
  
  // 일반 에러
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR'
};