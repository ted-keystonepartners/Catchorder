/**
 * 활동 로그 Mock 데이터 관리
 * API 로직과 분리된 순수 Mock 데이터 처리
 */

import { mockActivityLogs } from '../api/mockData.js';
import { ACTIVITY_TYPES } from '../utils/constants.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Mock 데이터 저장소
 */
class ActivityMockStore {
  constructor() {
    this.activities = { ...mockActivityLogs };
  }

  /**
   * 매장별 활동 로그 가져오기
   */
  getStoreActivities(storeId) {
    if (!storeId) {
      throw new Error('매장 ID가 필요합니다.');
    }
    return this.activities[storeId] || [];
  }

  /**
   * 활동 타입별 필터링
   */
  filterByType(activities, type) {
    if (!type || !Object.keys(ACTIVITY_TYPES).includes(type)) {
      return activities;
    }
    return activities.filter(activity => activity.type === type);
  }

  /**
   * 페이지네이션 적용
   */
  paginate(activities, page = 1, pageSize = 10) {
    const validPage = Math.max(1, page);
    const validPageSize = Math.max(1, Math.min(50, pageSize));
    const startIndex = (validPage - 1) * validPageSize;
    const endIndex = Math.min(startIndex + validPageSize, activities.length);
    
    return {
      items: activities.slice(startIndex, endIndex),
      pagination: {
        page: validPage,
        pageSize: validPageSize,
        total: activities.length,
        totalPages: Math.ceil(activities.length / validPageSize),
        hasNext: endIndex < activities.length,
        hasPrev: validPage > 1
      }
    };
  }

  /**
   * 새 활동 추가
   */
  addActivity(storeId, activityData) {
    if (!storeId) {
      throw new Error('매장 ID가 필요합니다.');
    }

    if (!activityData.type || !Object.keys(ACTIVITY_TYPES).includes(activityData.type)) {
      throw new Error('올바른 활동 타입을 선택해주세요.');
    }

    if (!activityData.content || !activityData.content.trim()) {
      throw new Error('활동 내용을 입력해주세요.');
    }

    const newActivity = {
      id: uuidv4(),
      storeId,
      type: activityData.type,
      content: activityData.content.trim(),
      status: 'pending',
      scheduledAt: activityData.scheduledAt || null,
      createdBy: activityData.createdBy || 'system',
      createdAt: new Date().toISOString()
    };

    if (!this.activities[storeId]) {
      this.activities[storeId] = [];
    }

    this.activities[storeId].unshift(newActivity);
    return newActivity;
  }

  /**
   * 활동 업데이트
   */
  updateActivity(activityId, updateData) {
    if (!activityId) {
      throw new Error('활동 ID가 필요합니다.');
    }

    // 모든 매장에서 활동 찾기
    for (const storeId in this.activities) {
      const activityIndex = this.activities[storeId].findIndex(a => a.id === activityId);
      
      if (activityIndex !== -1) {
        const activity = this.activities[storeId][activityIndex];
        
        // 업데이트할 수 있는 필드만 업데이트
        const updatedActivity = {
          ...activity,
          ...(updateData.status && { status: updateData.status }),
          ...(updateData.content && { content: updateData.content.trim() }),
          ...(updateData.scheduledAt !== undefined && { scheduledAt: updateData.scheduledAt }),
          updatedAt: new Date().toISOString()
        };

        this.activities[storeId][activityIndex] = updatedActivity;
        return updatedActivity;
      }
    }

    throw new Error('활동을 찾을 수 없습니다.');
  }

  /**
   * 활동 삭제
   */
  deleteActivity(activityId) {
    if (!activityId) {
      throw new Error('활동 ID가 필요합니다.');
    }

    for (const storeId in this.activities) {
      const activityIndex = this.activities[storeId].findIndex(a => a.id === activityId);
      
      if (activityIndex !== -1) {
        const deletedActivity = this.activities[storeId][activityIndex];
        this.activities[storeId].splice(activityIndex, 1);
        return deletedActivity;
      }
    }

    throw new Error('활동을 찾을 수 없습니다.');
  }

  /**
   * 통계 데이터 생성
   */
  getStatistics(storeId) {
    const activities = this.getStoreActivities(storeId);
    
    const stats = {
      total: activities.length,
      byType: {},
      byStatus: {
        pending: 0,
        completed: 0,
        cancelled: 0
      }
    };

    // 타입별 카운트 초기화
    Object.keys(ACTIVITY_TYPES).forEach(type => {
      stats.byType[type] = 0;
    });

    // 활동 카운트
    activities.forEach(activity => {
      if (activity.type && stats.byType[activity.type] !== undefined) {
        stats.byType[activity.type]++;
      }
      if (activity.status && stats.byStatus[activity.status] !== undefined) {
        stats.byStatus[activity.status]++;
      }
    });

    return stats;
  }

  /**
   * Mock 데이터 리셋
   */
  reset() {
    this.activities = { ...mockActivityLogs };
  }

  /**
   * 모든 활동 가져오기
   */
  getAllActivities() {
    const allActivities = [];
    for (const storeId in this.activities) {
      allActivities.push(...this.activities[storeId]);
    }
    return allActivities.sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );
  }
}

// 싱글톤 인스턴스
export const activityMockStore = new ActivityMockStore();

// 개발 환경에서 전역 접근 가능하도록
if (import.meta.env.DEV) {
  window.__activityMockStore = activityMockStore;
}

export default activityMockStore;