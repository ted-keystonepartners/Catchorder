/**
 * 데이터 포맷팅 유틸리티 함수들
 */
import { STORE_STATUS, ACTIVITY_TYPES } from './constants.js';

/**
 * ISO 날짜 문자열을 "YYYY.MM.DD" 형식으로 변환
 * @param {string} isoString - ISO 형식의 날짜 문자열
 * @returns {string} 포맷된 날짜 문자열
 */
export const formatDate = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}.${month}.${day}`;
};

/**
 * ISO 날짜 문자열을 "YYYY.MM.DD HH:mm" 형식으로 변환
 * @param {string} isoString - ISO 형식의 날짜 문자열
 * @returns {string} 포맷된 날짜시간 문자열
 */
export const formatDateTime = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}.${month}.${day} ${hours}:${minutes}`;
};

/**
 * 전화번호를 "010-1234-5678" 형식으로 변환 (010으로 시작하는 번호만)
 * @param {string} phoneNumber - 전화번호 문자열
 * @returns {string} 포맷된 전화번호
 */
export const formatPhone = (phoneNumber) => {
  if (!phoneNumber) return '';
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  if (cleaned.length === 11 && cleaned.startsWith('010')) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
  }
  
  return phoneNumber;
};

/**
 * 전화번호 입력 중 실시간 포매팅 (입력 제한 포함)
 * @param {string} input - 사용자 입력
 * @param {string} prevValue - 이전 값
 * @returns {string} 포맷된 입력값
 */
export const formatPhoneInput = (input, prevValue = '') => {
  // 숫자만 추출
  const cleaned = input.replace(/\D/g, '');
  
  // 최대 11자리로 제한
  if (cleaned.length > 11) {
    return prevValue;
  }
  
  // 010으로 시작하지 않고 3자리 이상인 경우 경고하지만 입력은 허용
  if (cleaned.length >= 3 && !cleaned.startsWith('010')) {
    // 그냥 숫자만 반환 (포맷팅 없이)
    return cleaned;
  }
  
  // 실시간 포매팅 (010으로 시작하는 경우에만)
  if (cleaned.length <= 3) {
    return cleaned;
  } else if (cleaned.length <= 7) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  } else {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
  }
};

/**
 * ISO 날짜 문자열을 "HH:mm" 형식으로 변환
 * @param {string} isoString - ISO 형식의 날짜 문자열
 * @returns {string} 포맷된 시간 문자열
 */
export const formatTime = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${hours}:${minutes}`;
};

/**
 * 상태 코드에 해당하는 Tailwind 색상 클래스 반환
 * @param {string} statusCode - 상태 코드
 * @returns {string} Tailwind 색상 클래스
 */
export const getStatusColor = (statusCode) => {
  const status = Object.values(STORE_STATUS).find(s => s.code === statusCode);
  return status ? status.color : 'bg-gray-100 text-gray-700';
};

/**
 * 상태 코드에 해당하는 한글 라벨 반환
 * @param {string} statusCode - 상태 코드
 * @returns {string} 한글 라벨
 */
export const getStatusLabel = (statusCode) => {
  // 레거시 상태값을 현재 상태값으로 매핑
  const legacyMapping = {
    'INTRODUCTION_COMPLETED': 'VISIT_COMPLETED',
    'IN_PROGRESS': 'REVISIT_SCHEDULED',
    'ADOPTION_CONFIRMED': 'REMOTE_INSTALL_SCHEDULED',
    'SIGNUP_COMPLETED': 'ADMIN_SETTING',
    'INSTALLATION_PENDING': 'QR_LINKING',
    'INSTALLATION_COMPLETED': 'QR_MENU_INSTALL',
    'REJECTED': 'SERVICE_TERMINATED',
    'NO_RESPONSE': 'PENDING',
    'OUT_OF_BUSINESS': 'UNUSED_TERMINATED',
    'CONTACT_PENDING': 'PRE_INTRODUCTION',
    'CONTACT_COMPLETED': 'VISIT_COMPLETED',
    'PROPOSAL_SENT': 'INFO_REQUEST',
    'UNDER_REVIEW': 'REVISIT_SCHEDULED',
    'SERVICE_ACTIVE': 'QR_LINKING',
    'PAUSED': 'PENDING',
    'CANCELLED': 'SERVICE_TERMINATED'
  };

  // 레거시 상태값이면 매핑
  const mappedStatus = legacyMapping[statusCode] || statusCode;
  
  // STORE_STATUS에서 찾기
  const status = Object.values(STORE_STATUS).find(s => s.code === mappedStatus);
  if (status) return status.label;
  
  // 없으면 원본 반환
  return statusCode;
};

/**
 * 활동 유형 코드에 해당하는 한글 라벨 반환
 * @param {string} activityType - 활동 유형 코드
 * @returns {string} 한글 라벨
 */
export const getActivityTypeLabel = (activityType) => {
  const activity = Object.values(ACTIVITY_TYPES).find(a => a.code === activityType);
  return activity ? activity.label : activityType;
};

/**
 * 목표 날짜까지 남은 일수 계산
 * @param {string} targetDate - 목표 날짜 (ISO 문자열)
 * @returns {number} 남은 일수 (음수면 지난 일수)
 */
export const daysUntil = (targetDate) => {
  if (!targetDate) return 0;
  const target = new Date(targetDate);
  const today = new Date();
  
  // 시간을 00:00:00으로 맞춤
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  
  const diffTime = target - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

/**
 * 날짜가 오늘을 지났는지 확인
 * @param {string} targetDate - 확인할 날짜 (ISO 문자열)
 * @returns {boolean} 지났으면 true, 아니면 false
 */
export const isOverdue = (targetDate) => {
  return daysUntil(targetDate) < 0;
};

/**
 * 텍스트를 지정된 길이로 자르고 말줄임표 추가
 * @param {string} text - 원본 텍스트
 * @param {number} length - 최대 길이
 * @returns {string} 자른 텍스트
 */
export const truncateText = (text, length) => {
  if (!text) return '';
  if (text.length <= length) return text;
  return text.slice(0, length) + '...';
};

/**
 * 숫자를 한국어 단위로 포맷팅 (천, 만, 억)
 * @param {number} num - 숫자
 * @returns {string} 포맷된 문자열
 */
export const formatKoreanNumber = (num) => {
  if (!num || num === 0) return '0';
  
  if (num >= 100000000) {
    return `${Math.floor(num / 100000000)}억${num % 100000000 ? ` ${Math.floor((num % 100000000) / 10000)}만` : ''}`;
  }
  if (num >= 10000) {
    return `${Math.floor(num / 10000)}만${num % 10000 ? ` ${num % 10000}` : ''}`;
  }
  if (num >= 1000) {
    return `${Math.floor(num / 1000)}천${num % 1000 ? ` ${num % 1000}` : ''}`;
  }
  
  return num.toString();
};

/**
 * 파일 크기를 읽기 쉬운 형태로 포맷팅
 * @param {number} bytes - 바이트 크기
 * @returns {string} 포맷된 크기 문자열
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};