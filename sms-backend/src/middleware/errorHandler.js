/**
 * 통일된 에러 처리 미들웨어
 */
export const errorHandler = (err, req, res, next) => {
  console.error('Error occurred:', err);

  // 개발 환경에서만 스택 트레이스 포함
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const errorResponse = {
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || '서버 오류 발생',
      details: err.details || {}
    },
    timestamp: new Date().toISOString()
  };

  // 개발 환경에서만 스택 트레이스 추가
  if (isDevelopment && err.stack) {
    errorResponse.error.stack = err.stack;
  }

  const statusCode = err.statusCode || 500;
  return res.status(statusCode).json(errorResponse);
};