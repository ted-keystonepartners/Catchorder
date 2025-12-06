/**
 * 권한 검증 미들웨어
 */
import { errorResponse } from '../utils/response.js';

export const requireAdmin = (req, res, next) => {
  try {
    if (!req.user) {
      const error = errorResponse('UNAUTHORIZED', '인증이 필요합니다', 401);
      return res.status(error.statusCode).json(error);
    }

    if (req.user.role !== 'ADMIN') {
      const error = errorResponse('FORBIDDEN', '관리자 권한이 필요합니다', 403);
      return res.status(error.statusCode).json(error);
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const requireRole = (requiredRole) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        const error = errorResponse('UNAUTHORIZED', '인증이 필요합니다', 401);
        return res.status(error.statusCode).json(error);
      }

      if (req.user.role !== requiredRole) {
        const error = errorResponse('FORBIDDEN', `${requiredRole} 권한이 필요합니다`, 403);
        return res.status(error.statusCode).json(error);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};