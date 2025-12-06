/**
 * JWT 토큰 검증 미들웨어
 */
import { verifyToken } from '../utils/jwt.js';
import { db } from '../db/database.js';
import { errorResponse } from '../utils/response.js';

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      const error = errorResponse('UNAUTHORIZED', '토큰이 제공되지 않았습니다', 401);
      return res.status(error.statusCode).json(error);
    }

    // 토큰 검증
    const decoded = verifyToken(token);
    if (!decoded) {
      const error = errorResponse('UNAUTHORIZED', '유효하지 않은 토큰입니다', 401);
      return res.status(error.statusCode).json(error);
    }

    // 사용자 정보 조회
    const user = await db.users.findById(decoded.userId);
    if (!user) {
      const error = errorResponse('UNAUTHORIZED', '사용자를 찾을 수 없습니다', 401);
      return res.status(error.statusCode).json(error);
    }

    // req 객체에 사용자 정보 설정
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      const errorRes = errorResponse('TOKEN_EXPIRED', '토큰이 만료되었습니다', 401);
      return res.status(errorRes.statusCode).json(errorRes);
    } else if (error.name === 'JsonWebTokenError') {
      const errorRes = errorResponse('INVALID_TOKEN', '유효하지 않은 토큰입니다', 401);
      return res.status(errorRes.statusCode).json(errorRes);
    } else {
      next(error);
    }
  }
};