/**
 * 활동 로그 관련 API 함수들
 * Mock 데이터와 API 로직 분리
 */
import { activityMockStore } from '../mocks/activityMocks.js';
import { apiWrapper } from './utils.js';
import { logger } from '../utils/logger.js';
import apiClient from './client.js';

/**
 * 매장별 활동 로그 조회
 * @param {string} storeId - 매장 ID
 * @param {Object} options - 조회 옵션
 * @param {number} options.page - 페이지 번호
 * @param {number} options.pageSize - 페이지 크기
 * @param {string} options.type - 활동 타입 필터
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export const getActivities = async (storeId, options = {}) => {
  return apiWrapper(async () => {
    // API 호출 시뮬레이션을 위한 딜레이
    await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 100));
    
    // Mock 데이터 사용
    let activities = activityMockStore.getStoreActivities(storeId);
    
    // 타입 필터링
    activities = activityMockStore.filterByType(activities, options.type);
    
    // 페이지네이션
    const result = activityMockStore.paginate(
      activities,
      options.page,
      options.pageSize
    );
    
    return {
      success: true,
      data: {
        activities: result.items,
        pagination: result.pagination
      }
    };
  }, `활동 로그 조회 (${storeId})`);
};

/**
 * 새 활동 로그 생성
 * @param {string} storeId - 매장 ID
 * @param {Object} activityData - 활동 데이터
 * @param {string} activityData.type - 활동 타입
 * @param {string} activityData.content - 활동 내용
 * @param {string} activityData.scheduledAt - 예약 일시 (선택사항)
 * @param {string} activityData.createdBy - 작성자 ID
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export const createActivity = async (storeId, activityData) => {
  return apiWrapper(async () => {
    // API 호출 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Mock 데이터에 추가
    const newActivity = activityMockStore.addActivity(storeId, activityData);
    
    logger.info(`활동 생성 성공: ${newActivity.id}`);
    
    return {
      success: true,
      data: newActivity
      };
    }

    if (!activityData.createdBy) {
      return {
        success: false,
        error: '작성자 정보가 필요합니다.'
      };
    }

    // 예약 일시 유효성 검사
    if (activityData.scheduledAt) {
      const scheduledDate = new Date(activityData.scheduledAt);
      const now = new Date();
      if (scheduledDate <= now) {
        return {
          success: false,
          error: '예약 일시는 현재 시간보다 미래여야 합니다.'
        };
      }
    }

    const newActivity = {
      id: uuidv4(),
      storeId,
      type: activityData.type,
      content: activityData.content.trim(),
      createdAt: new Date().toISOString(),
      createdBy: activityData.createdBy,
      scheduledAt: activityData.scheduledAt || null,
      updatedAt: new Date().toISOString()
    };

    // 매장의 활동 로그 목록이 없으면 생성
    if (!mockActivityLogs[storeId]) {
      mockActivityLogs[storeId] = [];
    }

    // 새 활동을 맨 앞에 추가 (최신순)
    mockActivityLogs[storeId].unshift(newActivity);

    return {
      success: true,
      data: { activity: newActivity }
    };

  } catch (error) {
    console.error('Create activity error:', error);
    return {
      success: false,
      error: '활동 로그 생성 중 오류가 발생했습니다.'
    };
  }
};

/**
 * 활동 로그 수정
 * @param {string} activityId - 활동 ID
 * @param {Object} updateData - 수정할 데이터
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export const updateActivity = async (activityId, updateData) => {
  await new Promise(resolve => setTimeout(resolve, 400));

  try {
    if (!activityId) {
      return {
        success: false,
        error: '활동 ID가 필요합니다.'
      };
    }

    // 모든 매장에서 해당 활동 찾기
    let foundActivity = null;
    let storeId = null;
    let activityIndex = -1;

    for (const [store, activities] of Object.entries(mockActivityLogs)) {
      const index = activities.findIndex(a => a.id === activityId);
      if (index !== -1) {
        foundActivity = activities[index];
        storeId = store;
        activityIndex = index;
        break;
      }
    }

    if (!foundActivity) {
      return {
        success: false,
        error: '활동을 찾을 수 없습니다.'
      };
    }

    // 수정 가능한 필드만 업데이트
    const allowedFields = ['type', 'content', 'scheduledAt'];
    const updatedData = {};

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        updatedData[field] = updateData[field];
      }
    });

    // 활동 타입 유효성 검사
    if (updatedData.type && !Object.keys(ACTIVITY_TYPES).includes(updatedData.type)) {
      return {
        success: false,
        error: '올바른 활동 타입을 선택해주세요.'
      };
    }

    // 내용 유효성 검사
    if (updatedData.content && !updatedData.content.trim()) {
      return {
        success: false,
        error: '활동 내용을 입력해주세요.'
      };
    }

    // 예약 일시 유효성 검사
    if (updatedData.scheduledAt) {
      const scheduledDate = new Date(updatedData.scheduledAt);
      const now = new Date();
      if (scheduledDate <= now) {
        return {
          success: false,
          error: '예약 일시는 현재 시간보다 미래여야 합니다.'
        };
      }
    }

    // 업데이트 실행
    mockActivityLogs[storeId][activityIndex] = {
      ...foundActivity,
      ...updatedData,
      updatedAt: new Date().toISOString()
    };

    return {
      success: true,
      data: { activity: mockActivityLogs[storeId][activityIndex] }
    };

  } catch (error) {
    console.error('Update activity error:', error);
    return {
      success: false,
      error: '활동 로그 수정 중 오류가 발생했습니다.'
    };
  }
};

/**
 * 활동 로그 삭제
 * @param {string} activityId - 활동 ID
 * @param {string} storeId - 매장 ID (AWS API 호출에 필요)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const deleteActivity = async (activityId, storeId) => {
  try {
    if (!activityId || !storeId) {
      return {
        success: false,
        error: '활동 ID와 매장 ID가 필요합니다.'
      };
    }

    // AWS API 호출
    const response = await apiClient.delete(`/api/stores/${storeId}/sales-logs/${activityId}`);
    
    return response;

  } catch (error) {
    console.error('Delete activity error:', error);
    return {
      success: false,
      error: '활동 로그 삭제 중 오류가 발생했습니다.'
    };
  }
};

/**
 * 활동 로그 통계 조회
 * @param {string} storeId - 매장 ID (선택사항)
 * @param {Object} dateRange - 날짜 범위 (선택사항)
 * @param {string} dateRange.startDate - 시작 날짜
 * @param {string} dateRange.endDate - 종료 날짜
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export const getActivityStats = async (storeId = null, dateRange = {}) => {
  await new Promise(resolve => setTimeout(resolve, 200));

  try {
    let allActivities = [];

    if (storeId) {
      allActivities = mockActivityLogs[storeId] || [];
    } else {
      // 모든 매장의 활동 로그
      allActivities = Object.values(mockActivityLogs).flat();
    }

    // 날짜 범위 필터링
    if (dateRange.startDate || dateRange.endDate) {
      allActivities = allActivities.filter(activity => {
        const activityDate = new Date(activity.createdAt);
        
        if (dateRange.startDate && activityDate < new Date(dateRange.startDate)) {
          return false;
        }
        if (dateRange.endDate && activityDate > new Date(dateRange.endDate)) {
          return false;
        }
        
        return true;
      });
    }

    // 타입별 통계
    const typeStats = Object.keys(ACTIVITY_TYPES).reduce((acc, type) => {
      acc[type] = allActivities.filter(a => a.type === type).length;
      return acc;
    }, {});

    // 일별 통계 (최근 30일)
    const dailyStats = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const count = allActivities.filter(activity => {
        return activity.createdAt.startsWith(dateStr);
      }).length;
      
      dailyStats.push({ date: dateStr, count });
    }

    return {
      success: true,
      data: {
        total: allActivities.length,
        typeStats,
        dailyStats,
        recentActivities: allActivities.slice(0, 10) // 최근 10개
      }
    };

  } catch (error) {
    console.error('Get activity stats error:', error);
    return {
      success: false,
      error: '활동 로그 통계 조회 중 오류가 발생했습니다.'
    };
  }
};