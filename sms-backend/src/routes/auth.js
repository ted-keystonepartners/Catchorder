/**
 * 인증 라우트
 */
import express from 'express';
import { authService } from '../services/authService.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/roleCheck.js';
import { successResponse, errorResponse } from '../utils/response.js';

const router = express.Router();

/**
 * POST /api/auth/login
 * 사용자 로그인
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      const error = errorResponse(
        'VALIDATION_ERROR',
        '이메일과 비밀번호를 입력해주세요',
        400
      );
      return res.status(error.statusCode).json(error);
    }

    const result = await authService.login(email, password);
    const response = successResponse(result, '로그인 성공');
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/logout
 * 사용자 로그아웃 (클라이언트에서 토큰 삭제)
 */
router.post('/logout', authenticateToken, async (req, res, next) => {
  try {
    // JWT는 stateless이므로 서버에서 특별한 처리 불필요
    // 클라이언트에서 토큰 삭제 처리
    const response = successResponse(null, '로그아웃 성공');
    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/me
 * 현재 사용자 정보 조회
 */
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const { password_hash, ...userInfo } = req.user;
    const response = successResponse(userInfo, '사용자 정보 조회 성공');
    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/users
 * 사용자 생성 (ADMIN만 가능)
 */
router.post('/users', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { email, password, role, name } = req.body;

    if (!email || !password) {
      const error = errorResponse(
        'VALIDATION_ERROR',
        '이메일과 비밀번호를 입력해주세요',
        400
      );
      return res.status(error.statusCode).json(error);
    }

    const user = await authService.createUser(email, password, role, name);
    const response = successResponse(user, '사용자 생성 성공');
    
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/users
 * 모든 사용자 조회 (ADMIN만 가능)
 */
router.get('/users', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const users = await authService.getAllUsers();
    const response = successResponse(users, '사용자 목록 조회 성공');
    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;