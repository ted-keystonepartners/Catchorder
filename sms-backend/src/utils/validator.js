/**
 * 입력값 검증 유틸리티
 */

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone) => {
  // 한국 전화번호 형식: 02-123-4567, 010-1234-5678, 031-123-4567 등
  const phoneRegex = /^(02|0[3-9][0-9]?)-[0-9]{3,4}-[0-9]{4}$|^010-[0-9]{4}-[0-9]{4}$/;
  return phoneRegex.test(phone);
};

export const validatePassword = (password) => {
  // 최소 8자, 영문/숫자 포함
  if (password.length < 8) {
    return { valid: false, message: '비밀번호는 최소 8자 이상이어야 합니다' };
  }
  
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  
  if (!hasLetter || !hasNumber) {
    return { valid: false, message: '비밀번호는 영문과 숫자를 포함해야 합니다' };
  }
  
  return { valid: true };
};

export const validateStoreData = (data) => {
  const errors = [];
  
  // 필수 필드 검증
  if (!data.store_name || data.store_name.trim() === '') {
    errors.push('매장명은 필수입니다');
  }
  
  if (!data.store_address || data.store_address.trim() === '') {
    errors.push('매장 주소는 필수입니다');
  }
  
  if (!data.store_phone || data.store_phone.trim() === '') {
    errors.push('매장 전화번호는 필수입니다');
  } else if (!validatePhone(data.store_phone)) {
    errors.push('매장 전화번호 형식이 올바르지 않습니다 (예: 02-123-4567)');
  }
  
  // 선택 필드 검증
  if (data.store_contact_phone && !validatePhone(data.store_contact_phone)) {
    errors.push('담당자 전화번호 형식이 올바르지 않습니다 (예: 010-1234-5678)');
  }
  
  if (data.employee_count !== undefined && data.employee_count !== null) {
    if (!Number.isInteger(Number(data.employee_count)) || Number(data.employee_count) < 0) {
      errors.push('직원 수는 0 이상의 정수여야 합니다');
    }
  }
  
  if (data.revenue !== undefined && data.revenue !== null) {
    if (!Number.isInteger(Number(data.revenue)) || Number(data.revenue) < 0) {
      errors.push('연매출은 0 이상의 정수여야 합니다');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

export const validateActivityData = (data) => {
  const errors = [];
  
  // 필수 필드 검증
  if (!data.store_id || data.store_id.trim() === '') {
    errors.push('매장 ID는 필수입니다');
  }
  
  if (!data.activity_type || data.activity_type.trim() === '') {
    errors.push('활동 유형은 필수입니다');
  }
  
  if (!data.memo || data.memo.trim() === '') {
    errors.push('활동 내용은 필수입니다');
  }
  
  // 선택 필드 검증
  if (data.scheduled_date) {
    const scheduledDate = new Date(data.scheduled_date);
    if (isNaN(scheduledDate.getTime())) {
      errors.push('예정일 형식이 올바르지 않습니다');
    }
  }
  
  if (data.completed !== undefined && typeof data.completed !== 'boolean') {
    errors.push('완료 상태는 boolean 값이어야 합니다');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

export const validateInstallationData = (data) => {
  const errors = [];
  
  if (!data.store_id || data.store_id.trim() === '') {
    errors.push('매장 ID는 필수입니다');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

export const validateSignupData = (data) => {
  const errors = [];
  
  if (!data.token || data.token.trim() === '') {
    errors.push('토큰은 필수입니다');
  }
  
  if (data.agreement !== true) {
    errors.push('약관 동의는 필수입니다');
  }
  
  if (data.desired_install_date) {
    const installDate = new Date(data.desired_install_date);
    if (isNaN(installDate.getTime())) {
      errors.push('희망 설치일 형식이 올바르지 않습니다');
    } else if (installDate < new Date()) {
      errors.push('희망 설치일은 오늘 이후여야 합니다');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};