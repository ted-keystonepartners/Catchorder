/**
 * 매장 라우트
 */
import express from 'express';
import { storeService } from '../services/storeService.js';
import { activityService } from '../services/activityService.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/roleCheck.js';
import { successResponse, errorResponse } from '../utils/response.js';

const router = express.Router();

/**
 * GET /api/stores
 * 매장 목록 조회 (필터링 포함)
 */
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const { ownerId, statuses, lifecycles, searchText } = req.query;
    
    const filters = {};
    
    // 필터 파라미터 처리
    if (ownerId) filters.ownerId = ownerId;
    if (statuses) filters.statuses = Array.isArray(statuses) ? statuses : [statuses];
    if (lifecycles) filters.lifecycles = Array.isArray(lifecycles) ? lifecycles : [lifecycles];
    if (searchText) filters.searchText = searchText;

    const result = await storeService.getAllStores(
      filters,
      req.user.role,
      req.user.userId
    );
    
    const response = successResponse(result, '매장 목록 조회 성공');
    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/stores/:storeId
 * 매장 상세 조회
 */
router.get('/:storeId', authenticateToken, async (req, res, next) => {
  try {
    const { storeId } = req.params;
    
    const store = await storeService.getStoreById(
      storeId,
      req.user.role,
      req.user.userId
    );
    
    const response = successResponse(store, '매장 상세 조회 성공');
    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/stores
 * 매장 생성 (ADMIN만 가능)
 */
router.post('/', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const storeData = req.body;
    
    const store = await storeService.createStore(storeData);
    const response = successResponse(store, '매장 생성 성공');
    
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/stores/:storeId
 * 매장 정보 수정
 */
router.patch('/:storeId', authenticateToken, async (req, res, next) => {
  try {
    const { storeId } = req.params;
    const updateData = req.body;
    
    const store = await storeService.updateStore(
      storeId,
      updateData,
      req.user.role,
      req.user.userId
    );
    
    const response = successResponse(store, '매장 정보 수정 성공');
    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/stores/:storeId/status
 * 매장 상태 변경
 */
router.patch('/:storeId/status', authenticateToken, async (req, res, next) => {
  try {
    const { storeId } = req.params;
    const { status } = req.body;
    
    if (!status) {
      const error = errorResponse(
        'VALIDATION_ERROR',
        '상태값을 입력해주세요',
        400
      );
      return res.status(error.statusCode).json(error);
    }
    
    const store = await storeService.updateStoreStatus(
      storeId,
      status,
      req.user.role,
      req.user.userId
    );
    
    const response = successResponse(store, '매장 상태 변경 성공');
    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/stores/:storeId/owner
 * 담당자 배정 (ADMIN만 가능)
 */
router.patch('/:storeId/owner', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { storeId } = req.params;
    const { owner_id } = req.body;
    
    const store = await storeService.assignOwner(storeId, owner_id);
    const response = successResponse(store, '담당자 배정 성공');
    res.json(response);
  } catch (error) {
    next(error);
  }
});


/**
 * DELETE /api/stores/:storeId/sales-logs/:logId
 * 세일즈 로그 삭제
 */
router.delete('/:storeId/sales-logs/:logId', authenticateToken, async (req, res, next) => {
  try {
    const { storeId, logId } = req.params;
    
    // 매장 접근 권한 확인
    await storeService.getStoreById(storeId, req.user.role, req.user.userId);
    
    // 세일즈 로그 삭제 (activityService 사용)
    await activityService.deleteActivity(logId, req.user.role, req.user.userId);
    
    const response = successResponse(null, '세일즈 로그 삭제 성공');
    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/stores/:storeId
 * 매장 삭제 (ADMIN만 가능)
 */
router.delete('/:storeId', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { storeId } = req.params;
    
    await storeService.deleteStore(storeId);
    const response = successResponse(null, '매장 삭제 성공');
    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;