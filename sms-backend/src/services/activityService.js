/**
 * 활동 서비스
 */
import { db } from '../db/database.js';
import { validateActivityData } from '../utils/validator.js';
import { ERROR_CODES } from '../utils/constants.js';
import { storeService } from './storeService.js';

export const activityService = {
  /**
   * 매장별 활동 로그 조회
   */
  async getActivities(storeId, userRole, userId) {
    try {
      // 매장 접근 권한 확인
      await storeService.getStoreById(storeId, userRole, userId);

      const activities = await db.activities.findByStoreId(storeId);
      return activities;
    } catch (error) {
      throw error;
    }
  },

  /**
   * 활동 생성
   */
  async createActivity(activityData, userRole, userId) {
    try {
      // 매장 접근 권한 확인
      await storeService.getStoreById(activityData.store_id, userRole, userId);

      // 데이터 검증
      const validation = validateActivityData(activityData);
      if (!validation.valid) {
        throw {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: '활동 데이터가 유효하지 않습니다',
          statusCode: 400,
          details: { errors: validation.errors }
        };
      }

      // 기본값 설정
      const dataWithDefaults = {
        owner_id: userId,
        completed: false,
        ...activityData
      };

      const activity = await db.activities.create(dataWithDefaults);
      return activity;
    } catch (error) {
      throw error;
    }
  },

  /**
   * 활동 수정
   */
  async updateActivity(activityId, updateData, userRole, userId) {
    try {
      // 기존 활동 조회
      const existingActivity = await db.activities.findById(activityId);
      if (!existingActivity) {
        throw {
          code: ERROR_CODES.ACTIVITY_NOT_FOUND,
          message: '활동을 찾을 수 없습니다',
          statusCode: 404
        };
      }

      // 매장 접근 권한 확인
      await storeService.getStoreById(existingActivity.store_id, userRole, userId);

      // GENERAL 권한이면 본인이 작성한 활동만 수정 가능
      if (userRole === 'GENERAL' && existingActivity.owner_id !== userId) {
        throw {
          code: ERROR_CODES.FORBIDDEN,
          message: '해당 활동을 수정할 권한이 없습니다',
          statusCode: 403
        };
      }

      // 데이터 검증
      const mergedData = { ...existingActivity, ...updateData };
      const validation = validateActivityData(mergedData);
      if (!validation.valid) {
        throw {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: '활동 데이터가 유효하지 않습니다',
          statusCode: 400,
          details: { errors: validation.errors }
        };
      }

      const updatedActivity = await db.activities.update(activityId, updateData);
      return updatedActivity;
    } catch (error) {
      throw error;
    }
  },

  /**
   * 활동 삭제
   */
  async deleteActivity(activityId, userRole, userId) {
    try {
      // 기존 활동 조회
      const existingActivity = await db.activities.findById(activityId);
      if (!existingActivity) {
        throw {
          code: ERROR_CODES.ACTIVITY_NOT_FOUND,
          message: '활동을 찾을 수 없습니다',
          statusCode: 404
        };
      }

      // 매장 접근 권한 확인
      await storeService.getStoreById(existingActivity.store_id, userRole, userId);

      // GENERAL 권한이면 본인이 작성한 활동만 삭제 가능
      if (userRole === 'GENERAL' && existingActivity.owner_id !== userId) {
        throw {
          code: ERROR_CODES.FORBIDDEN,
          message: '해당 활동을 삭제할 권한이 없습니다',
          statusCode: 403
        };
      }

      await db.activities.delete(activityId);
      return true;
    } catch (error) {
      throw error;
    }
  },

  /**
   * 활동 상세 조회
   */
  async getActivityById(activityId, userRole, userId) {
    try {
      const activity = await db.activities.findById(activityId);
      if (!activity) {
        throw {
          code: ERROR_CODES.ACTIVITY_NOT_FOUND,
          message: '활동을 찾을 수 없습니다',
          statusCode: 404
        };
      }

      // 매장 접근 권한 확인
      await storeService.getStoreById(activity.store_id, userRole, userId);

      return activity;
    } catch (error) {
      throw error;
    }
  }
};