/**
 * sms-catchtable-proxy 상수 정의
 * 캐치테이블로 API URL, 허용 경로, Content-Type 매핑
 */

// 환경별 Base URL
const ENV = process.env.CT_ENV || 'dev';
const BASE_DOMAIN = ENV === 'prod'
  ? 'https://api.catchtablero.com'
  : 'https://dev-api.catchtablero.com';

// 일반 URL: /biz/login, /refresh, /profile, /auth/*, /fcm/*
export const GENERAL_API_BASE = `${BASE_DOMAIN}/api`;

// 비즈전용 URL: 메뉴, 매장, 주문, 쿠폰 등 그 외 전부
export const BIZ_API_BASE = `${BASE_DOMAIN}/v1/api`;

// 일반 URL로 라우팅되는 경로 패턴
export const GENERAL_URL_PATHS = [
  '/biz/login',
  '/refresh',
  '/profile',
  '/auth/',
  '/fcm/'
];

/**
 * 경로별 Content-Type 매핑
 * 캐치테이블로 API는 Content-Type이 API마다 다름
 */
export const CONTENT_TYPE_MAP = {
  // application/json 사용하는 API
  json: [
    '/menu_category',        // 메뉴 카테고리 CRUD
    '/brand_store/origin',   // 원산지 변경
    '/brand_store/order_info', // 주문안내 변경
    '/brand_store_time',     // 영업시간
    '/brand_store_holiday',  // 임시휴무
    '/rep_menu',             // 대표메뉴
    '/biz/login',            // 로그인
  ],
  // application/x-www-form-urlencoded 사용하는 API
  formUrlEncoded: [
    '/menu_category/*/menu',  // 메뉴 추가/수정 (카테고리 하위)
    '/menu/status/',          // 메뉴 상태 변경
    '/menu/*/soldout/',       // 품절 처리
    '/menu/option/status/',   // 옵션 상태 변경
    '/menu/option/*/soldout/', // 옵션 품절 처리
  ]
};

/**
 * 액션 Whitelist - 위험도별 분류
 */
export const ACTION_WHITELIST = {
  // 안전 (GET) - 바로 실행
  safe: [
    { method: 'GET', pattern: '/menu/categories' },
    { method: 'GET', pattern: '/menu_category' },
    { method: 'GET', pattern: '/brand_store' },
    { method: 'GET', pattern: '/menu' },
    { method: 'GET', pattern: '/rep_menu' },
    { method: 'GET', pattern: '/order' },
    { method: 'GET', pattern: '/order/count' },
    { method: 'GET', pattern: '/stat_daily_sell_menu_v1' },
    { method: 'GET', pattern: '/order_review' },
    { method: 'GET', pattern: '/stat_review_point' },
    { method: 'GET', pattern: '/profile' },
    { method: 'GET', pattern: '/menu/option' },
  ],
  // 보통 (변경) - 프론트 확인 후 실행
  normal: [
    { method: 'POST', pattern: '/menu_category' },
    { method: 'PUT', pattern: '/menu_category/' },
    { method: 'DELETE', pattern: '/menu_category/' },
    { method: 'POST', pattern: '/menu_category/*/menu' },
    { method: 'PUT', pattern: '/menu/*/soldout/' },
    { method: 'PUT', pattern: '/menu/status/' },
    { method: 'PUT', pattern: '/brand_store/origin' },
    { method: 'PUT', pattern: '/brand_store/order_info' },
    { method: 'POST', pattern: '/brand_store_time/update' },
    { method: 'POST', pattern: '/brand_store_holiday/update' },
    { method: 'POST', pattern: '/rep_menu' },
    { method: 'DELETE', pattern: '/rep_menu' },
    { method: 'PUT', pattern: '/menu/option/status/' },
    { method: 'PUT', pattern: '/menu/option/*/soldout/' },
  ],
  // 위험 (삭제/결제) - Lambda에서 차단
  dangerous: [
    { method: 'DELETE', pattern: '/menu/*/delete' },
    { method: 'POST', pattern: '/order/*/cancel' },
    { method: 'POST', pattern: '/payment/cancel' },
  ],
  // 금지 - Lambda에서 차단
  blocked: [
    { method: 'POST', pattern: '/biz/register' },
    { method: 'PUT', pattern: '/auth/passwd' },
    { method: 'PUT', pattern: '/member/passwd' },
  ]
};

// CORS 헤더
export const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

// 기본 매장 ID
export const DEFAULT_BRAND_STORE_ID = process.env.CT_BRAND_STORE_ID || '442';
