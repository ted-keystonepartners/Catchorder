/**
 * 표준 응답 포맷 유틸리티
 */

export const successResponse = (data, message = 'Success') => ({
  success: true,
  data,
  message,
  timestamp: new Date().toISOString()
});

export const errorResponse = (code, message, statusCode = 400, details = {}) => {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  error.details = details;
  
  return {
    success: false,
    error: { 
      code, 
      message, 
      details 
    },
    timestamp: new Date().toISOString(),
    statusCode
  };
};

export const paginatedResponse = (data, pagination, message = 'Success') => ({
  success: true,
  data,
  pagination,
  message,
  timestamp: new Date().toISOString()
});