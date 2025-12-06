/**
 * 활동 로그 관련 커스텀 훅
 */
import { useState, useCallback, useEffect } from 'react';
import { 
  getActivities, 
  createActivity, 
  updateActivity, 
  deleteActivity,
  getActivityStats
} from '../api/activityApi.js';
import { useUIStore } from '../context/uiStore.js';
import { ACTIVITY_TYPES } from '../utils/constants.js';
import { getActivityTypeLabel } from '../utils/formatter.js';

/**
 * 활동 로그 관련 훅
 * @param {string} storeId - 매장 ID (선택사항)
 * @returns {Object} 활동 관련 상태 및 액션들
 */
export const useActivities = (storeId = null) => {
  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });

  const { showSuccess, showError, showConfirmDialog } = useUIStore();

  /**
   * 활동 목록 조회
   * @param {Object} options - 조회 옵션
   * @returns {Promise<boolean>}
   */
  const fetchActivities = useCallback(async (options = {}) => {
    if (!storeId) {
      setActivities([]);
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const mergedOptions = {
        page: pagination.page,
        pageSize: pagination.pageSize,
        ...options
      };

      const response = await getActivities(storeId, mergedOptions);

      if (response.success) {
        setActivities(response.data.activities);
        setPagination(response.data.pagination);
        return true;
      } else {
        setError(response.error);
        showError('활동 로그를 불러오는데 실패했습니다.');
        return false;
      }
    } catch (err) {
      console.error('Fetch activities error:', err);
      setError('활동 로그 조회 중 오류가 발생했습니다.');
      showError('활동 로그 조회 중 오류가 발생했습니다.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [storeId, pagination.page, pagination.pageSize, showError]);

  /**
   * 새 활동 생성
   * @param {Object} activityData - 활동 데이터
   * @returns {Promise<Object|null>}
   */
  const handleCreateActivity = async (activityData) => {
    if (!storeId) {
      showError('매장 정보가 필요합니다.');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await createActivity(storeId, activityData);

      if (response.success) {
        const typeLabel = getActivityTypeLabel(activityData.type);
        showSuccess(`${typeLabel} 활동이 등록되었습니다.`);
        
        // 목록 새로고침
        await fetchActivities();
        
        return response.data.activity;
      } else {
        setError(response.error);
        showError('활동 등록에 실패했습니다.');
        return null;
      }
    } catch (err) {
      console.error('Create activity error:', err);
      const errorMsg = '활동 등록 중 오류가 발생했습니다.';
      setError(errorMsg);
      showError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * 활동 수정
   * @param {string} activityId - 활동 ID
   * @param {Object} updateData - 수정할 데이터
   * @returns {Promise<boolean>}
   */
  const handleUpdateActivity = async (activityId, updateData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await updateActivity(activityId, updateData);

      if (response.success) {
        showSuccess('활동이 수정되었습니다.');
        
        // 목록에서 해당 활동 업데이트
        setActivities(prev => 
          prev.map(activity => 
            activity.id === activityId ? response.data.activity : activity
          )
        );
        
        return true;
      } else {
        setError(response.error);
        showError('활동 수정에 실패했습니다.');
        return false;
      }
    } catch (err) {
      console.error('Update activity error:', err);
      const errorMsg = '활동 수정 중 오류가 발생했습니다.';
      setError(errorMsg);
      showError(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * 활동 삭제 (확인 다이얼로그 포함)
   * @param {string} activityId - 활동 ID
   * @param {string} activityContent - 활동 내용 (확인용)
   * @returns {Promise<boolean>}
   */
  const handleDeleteActivity = (activityId, activityContent) => {
    return new Promise((resolve) => {
      showConfirmDialog(
        `'${activityContent}' 활동을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`,
        async () => {
          setLoading(true);
          setError(null);

          try {
            const response = await deleteActivity(activityId, storeId);

            if (response.success) {
              showSuccess('활동이 삭제되었습니다.');
              
              // 목록에서 해당 활동 제거
              setActivities(prev => prev.filter(activity => activity.id !== activityId));
              
              resolve(true);
            } else {
              setError(response.error);
              showError('활동 삭제에 실패했습니다.');
              resolve(false);
            }
          } catch (err) {
            console.error('Delete activity error:', err);
            const errorMsg = '활동 삭제 중 오류가 발생했습니다.';
            setError(errorMsg);
            showError(errorMsg);
            resolve(false);
          } finally {
            setLoading(false);
          }
        },
        () => resolve(false)
      );
    });
  };

  /**
   * 활동 통계 조회
   * @param {Object} dateRange - 날짜 범위
   * @returns {Promise<boolean>}
   */
  const fetchActivityStats = async (dateRange = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await getActivityStats(storeId, dateRange);

      if (response.success) {
        setStats(response.data);
        return true;
      } else {
        setError(response.error);
        showError('활동 통계를 불러오는데 실패했습니다.');
        return false;
      }
    } catch (err) {
      console.error('Fetch activity stats error:', err);
      const errorMsg = '활동 통계 조회 중 오류가 발생했습니다.';
      setError(errorMsg);
      showError(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * 활동 타입별 필터링
   * @param {string} type - 활동 타입
   */
  const filterByType = (type) => {
    fetchActivities({ type });
  };

  /**
   * 페이지 변경
   * @param {number} page - 페이지 번호
   */
  const setPage = (page) => {
    setPagination(prev => ({ ...prev, page }));
  };

  /**
   * 페이지 크기 변경
   * @param {number} pageSize - 페이지 크기
   */
  const setPageSize = (pageSize) => {
    setPagination(prev => ({ ...prev, pageSize, page: 1 }));
  };

  /**
   * 에러 클리어
   */
  const clearError = () => {
    setError(null);
  };

  /**
   * 전체 초기화
   */
  const reset = () => {
    setActivities([]);
    setStats(null);
    setError(null);
    setPagination({
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false
    });
  };

  /**
   * 활동 타입 옵션 생성
   * @returns {Array}
   */
  const getActivityTypeOptions = () => {
    return Object.values(ACTIVITY_TYPES).map(type => ({
      value: type.code,
      label: type.label,
      color: type.color
    }));
  };

  /**
   * 활동 통계 요약
   * @returns {Object|null}
   */
  const getActivitySummary = () => {
    if (!stats) return null;

    const mostActiveType = Object.entries(stats.typeStats).reduce(
      (max, [type, count]) => count > max.count ? { type, count } : max,
      { type: null, count: 0 }
    );

    return {
      total: stats.total,
      mostActiveType: mostActiveType.type ? {
        type: mostActiveType.type,
        label: getActivityTypeLabel(mostActiveType.type),
        count: mostActiveType.count
      } : null,
      recentCount: stats.recentActivities?.length || 0,
      avgPerDay: stats.dailyStats ? 
        Math.round(stats.dailyStats.reduce((sum, day) => sum + day.count, 0) / stats.dailyStats.length * 10) / 10 : 0
    };
  };

  /**
   * 예약된 활동 필터링
   * @returns {Array}
   */
  const getScheduledActivities = () => {
    return activities.filter(activity => activity.scheduledAt && new Date(activity.scheduledAt) > new Date());
  };

  /**
   * 오늘의 활동 필터링
   * @returns {Array}
   */
  const getTodayActivities = () => {
    const today = new Date().toISOString().split('T')[0];
    return activities.filter(activity => activity.createdAt.startsWith(today));
  };

  // storeId가 변경되면 활동 목록 새로고침
  useEffect(() => {
    if (storeId) {
      fetchActivities();
    } else {
      reset();
    }
  }, [storeId, fetchActivities]);

  // 페이지가 변경되면 활동 목록 새로고침
  useEffect(() => {
    if (storeId) {
      fetchActivities();
    }
  }, [pagination.page, pagination.pageSize]);

  return {
    // 상태
    activities,
    stats,
    loading,
    error,
    pagination,

    // 기본 액션
    fetchActivities,
    createActivity: handleCreateActivity,
    updateActivity: handleUpdateActivity,
    deleteActivity: handleDeleteActivity,
    fetchActivityStats,

    // 필터링 액션
    filterByType,

    // 페이지네이션 액션
    setPage,
    setPageSize,

    // 유틸리티
    clearError,
    reset,
    getActivityTypeOptions,
    getActivitySummary,
    getScheduledActivities,
    getTodayActivities
  };
};