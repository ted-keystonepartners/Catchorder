/**
 * 활동 라우트
 */
import express from 'express';
import { activityService } from '../services/activityService.js';
import { authenticateToken } from '../middleware/auth.js';
import { successResponse, errorResponse } from '../utils/response.js';

const router = express.Router();

/**
 * GET /api/activities/store/:storeId
 * 매장별 활동 로그 조회
 */
router.get('/store/:storeId', authenticateToken, async (req, res, next) => {
  try {
    const { storeId } = req.params;
    
    const activities = await activityService.getActivities(
      storeId,
      req.user.role,
      req.user.userId
    );
    
    const response = successResponse(activities, '활동 목록 조회 성공');
    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/activities
 * 활동 생성
 */
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const activityData = req.body;
    
    if (!activityData.store_id) {
      const error = errorResponse(
        'VALIDATION_ERROR',
        '매장 ID를 입력해주세요',
        400
      );
      return res.status(error.statusCode).json(error);
    }
    
    const activity = await activityService.createActivity(
      activityData,
      req.user.role,
      req.user.userId
    );
    
    const response = successResponse(activity, '활동 생성 성공');
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/activities/:activityId
 * 활동 상세 조회
 */
router.get('/:activityId', authenticateToken, async (req, res, next) => {
  try {
    const { activityId } = req.params;
    
    const activity = await activityService.getActivityById(
      activityId,
      req.user.role,
      req.user.userId
    );
    
    const response = successResponse(activity, '활동 상세 조회 성공');
    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/activities/:activityId
 * 활동 수정
 */
router.patch('/:activityId', authenticateToken, async (req, res, next) => {
  try {
    const { activityId } = req.params;
    const updateData = req.body;
    
    const activity = await activityService.updateActivity(
      activityId,
      updateData,
      req.user.role,
      req.user.userId
    );
    
    const response = successResponse(activity, '활동 수정 성공');
    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/activities/:activityId
 * 활동 삭제
 */
router.delete('/:activityId', authenticateToken, async (req, res, next) => {
  try {
    const { activityId } = req.params;
    
    await activityService.deleteActivity(
      activityId,
      req.user.role,
      req.user.userId
    );
    
    const response = successResponse(null, '활동 삭제 성공');
    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;