/**
 * 데이터 유효성 검사 유틸리티 함수들
 */

/**
 * 이메일 주소 유효성 검사
 * @param {string} email - 검사할 이메일 주소
 * @returns {boolean} 유효하면 true, 아니면 false
 */
export const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * 전화번호 유효성 검사 (010으로 시작하는 휴대폰만)
 * @param {string} phone - 검사할 전화번호
 * @returns {boolean} 유효하면 true, 아니면 false
 */
export const isValidPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return false;
  const cleaned = phone.replace(/\D/g, '');
  
  // 010으로 시작하는 11자리만 허용
  const mobileRegex = /^010\d{8}$/;
  
  return mobileRegex.test(cleaned);
};

/**
 * 매장명 유효성 검사
 * @param {string} name - 검사할 매장명
 * @returns {boolean} 유효하면 true, 아니면 false
 */
export const isValidStoreName = (name) => {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  return trimmed.length >= 2 && trimmed.length <= 50;
};

/**
 * 주소 유효성 검사
 * @param {string} address - 검사할 주소
 * @returns {boolean} 유효하면 true, 아니면 false
 */
export const isValidAddress = (address) => {
  if (!address || typeof address !== 'string') return false;
  const trimmed = address.trim();
  return trimmed.length >= 5 && trimmed.length <= 200;
};

/**
 * 메모 유효성 검사
 * @param {string} memo - 검사할 메모
 * @returns {boolean} 유효하면 true, 아니면 false
 */
export const isValidMemo = (memo) => {
  if (!memo || typeof memo !== 'string') return false;
  return memo.trim().length <= 1000;
};

/**
 * 예약 날짜 유효성 검사
 * @param {string} date - 검사할 날짜 (ISO 문자열)
 * @returns {boolean} 유효하면 true, 아니면 false
 */
export const isValidScheduledDate = (date) => {
  if (!date) return false;
  const scheduledDate = new Date(date);
  const now = new Date();
  
  // 유효한 날짜인지 확인
  if (isNaN(scheduledDate.getTime())) return false;
  
  // 현재 시간보다 미래인지 확인
  return scheduledDate > now;
};

/**
 * 비밀번호 유효성 검사
 * @param {string} password - 검사할 비밀번호
 * @returns {boolean} 유효하면 true, 아니면 false
 */
export const isValidPassword = (password) => {
  if (!password || typeof password !== 'string') return false;
  // 최소 8자, 영문/숫자 포함
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
  return passwordRegex.test(password);
};

/**
 * 사업자 등록번호 유효성 검사
 * @param {string} businessNumber - 검사할 사업자 등록번호
 * @returns {boolean} 유효하면 true, 아니면 false
 */
export const isValidBusinessNumber = (businessNumber) => {
  if (!businessNumber || typeof businessNumber !== 'string') return false;
  const cleaned = businessNumber.replace(/\D/g, '');
  
  if (cleaned.length !== 10) return false;
  
  // 사업자 등록번호 체크섬 알고리즘
  const checkDigits = [1, 3, 7, 1, 3, 7, 1, 3, 5, 1];
  let sum = 0;
  
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i]) * checkDigits[i];
  }
  
  sum += Math.floor(parseInt(cleaned[8]) * 5 / 10);
  const checksum = (10 - (sum % 10)) % 10;
  
  return checksum === parseInt(cleaned[9]);
};

/**
 * URL 유효성 검사
 * @param {string} url - 검사할 URL
 * @returns {boolean} 유효하면 true, 아니면 false
 */
export const isValidUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * 필드별 유효성 검사 및 에러 메시지 반환
 * @param {string} field - 필드명
 * @param {any} value - 검사할 값
 * @returns {string|null} 에러 메시지 또는 null
 */
export const getValidationError = (field, value) => {
  switch (field) {
    case 'email':
      if (!value) return '이메일을 입력해주세요.';
      if (!isValidEmail(value)) return '올바른 이메일 형식을 입력해주세요.';
      break;
      
    case 'password':
      if (!value) return '비밀번호를 입력해주세요.';
      if (!isValidPassword(value)) return '비밀번호는 최소 8자이며, 영문과 숫자를 포함해야 합니다.';
      break;
      
    case 'phone':
      if (!value) return '전화번호를 입력해주세요.';
      if (!isValidPhone(value)) return '010으로 시작하는 11자리 휴대폰 번호를 입력해주세요.';
      break;
      
    case 'storeName':
      if (!value) return '매장명을 입력해주세요.';
      if (!isValidStoreName(value)) return '매장명은 2-50자 사이로 입력해주세요.';
      break;
      
    case 'address':
      if (!value) return '주소를 입력해주세요.';
      if (!isValidAddress(value)) return '주소는 5-200자 사이로 입력해주세요.';
      break;
      
    case 'memo':
      if (value && !isValidMemo(value)) return '메모는 1000자 이하로 입력해주세요.';
      break;
      
    case 'scheduledDate':
      if (!value) return '예약 날짜를 입력해주세요.';
      if (!isValidScheduledDate(value)) return '현재 시간보다 미래 날짜를 선택해주세요.';
      break;
      
    case 'businessNumber':
      if (value && !isValidBusinessNumber(value)) return '올바른 사업자 등록번호를 입력해주세요.';
      break;
      
    case 'url':
      if (value && !isValidUrl(value)) return '올바른 URL 형식을 입력해주세요.';
      break;
      
    default:
      break;
  }
  
  return null;
};

/**
 * 객체의 모든 필드 유효성 검사
 * @param {Object} data - 검사할 데이터 객체
 * @param {Array<string>} requiredFields - 필수 필드 목록
 * @returns {Object} 에러 객체 (필드명: 에러메시지)
 */
export const validateFormData = (data, requiredFields = []) => {
  const errors = {};
  
  // 필수 필드 검사
  requiredFields.forEach(field => {
    if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
      errors[field] = `${field}는(은) 필수 입력 항목입니다.`;
    }
  });
  
  // 각 필드별 유효성 검사
  Object.keys(data).forEach(field => {
    if (data[field]) {
      const error = getValidationError(field, data[field]);
      if (error) {
        errors[field] = error;
      }
    }
  });
  
  return errors;
};