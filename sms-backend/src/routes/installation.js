/**
 * 설치 라우트
 */
import express from 'express';
import { installationService } from '../services/installationService.js';
import { authenticateToken } from '../middleware/auth.js';
import { successResponse, errorResponse } from '../utils/response.js';

const router = express.Router();

/**
 * POST /api/installation/send-url
 * 설치 URL 발송
 */
router.post('/send-url', authenticateToken, async (req, res, next) => {
  try {
    const { store_id } = req.body;
    
    if (!store_id) {
      const error = errorResponse(
        'VALIDATION_ERROR',
        '매장 ID를 입력해주세요',
        400
      );
      return res.status(error.statusCode).json(error);
    }
    
    const link = await installationService.sendInstallationUrl(
      store_id,
      req.user.role,
      req.user.userId
    );
    
    const response = successResponse(link, '설치 URL 발송 성공');
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/installation/status/:storeId
 * 설치 상태 조회
 */
router.get('/status/:storeId', authenticateToken, async (req, res, next) => {
  try {
    const { storeId } = req.params;
    
    const status = await installationService.getInstallationStatus(
      storeId,
      req.user.role,
      req.user.userId
    );
    
    const response = successResponse(status, '설치 상태 조회 성공');
    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/installation/complete
 * 가입 완료 처리 (외부 공개 API - 인증 불필요)
 */
router.post('/complete', async (req, res, next) => {
  try {
    const { token, agreement, desired_install_date } = req.body;
    
    if (!token) {
      const error = errorResponse(
        'VALIDATION_ERROR',
        '토큰을 입력해주세요',
        400
      );
      return res.status(error.statusCode).json(error);
    }
    
    const signupData = {
      agreement: agreement === true,
      desired_install_date
    };
    
    const result = await installationService.completeInstallation(token, signupData);
    const response = successResponse(result, '가입 완료 처리 성공');
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/installation/info/:token
 * 설치 링크 정보 조회 (외부 공개 API - 인증 불필요)
 */
router.get('/info/:token', async (req, res, next) => {
  try {
    const { token } = req.params;
    
    const info = await installationService.getInstallationByToken(token);
    const response = successResponse(info, '설치 링크 정보 조회 성공');
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;