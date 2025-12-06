/**
 * 매장 관련 커스텀 훅
 */
import { useStoreStore } from '../context/storeStore.js';
import { useUIStore } from '../context/uiStore.js';
import { STORE_STATUS, LIFECYCLE } from '../utils/constants.js';
import { getStatusLabel, getStatusColor } from '../utils/formatter.js';

/**
 * 매장 관련 훅
 * @returns {Object} 매장 상태 및 액션들
 */
export const useStores = () => {
  const {
    stores,
    filteredStores,
    selectedStore,
    filters,
    sorting,
    pagination,
    loading,
    error,
    total,
    fetchStores,
    setFilters,
    selectStore,
    deselectStore,
    updateStore,
    updateStoreStatus,
    assignOwner,
    setSorting,
    setPage,
    setPageSize,
    createStore,
    deleteStore,
    bulkUpdate,
    refreshSelectedStore,
    clearError,
    reset
  } = useStoreStore();

  const { showSuccess, showError, showConfirmDialog } = useUIStore();

  /**
   * 매장 목록 조회 (에러 처리 포함)
   * @param {Object} customFilters - 커스텀 필터
   * @returns {Promise<boolean>}
   */
  const handleFetchStores = async (customFilters = {}) => {
    try {
      const success = await fetchStores(customFilters);
      if (!success) {
        showError('매장 목록을 불러오는데 실패했습니다.');
      }
      return success;
    } catch (err) {
      console.error('Fetch stores error:', err);
      showError('매장 목록 조회 중 오류가 발생했습니다.');
      return false;
    }
  };

  /**
   * 매장 선택 (에러 처리 포함)
   * @param {string} storeId - 매장 ID
   * @returns {Promise<boolean>}
   */
  const handleSelectStore = async (storeId) => {
    try {
      const success = await selectStore(storeId);
      if (!success) {
        showError('매장 정보를 불러오는데 실패했습니다.');
      }
      return success;
    } catch (err) {
      console.error('Select store error:', err);
      showError('매장 정보 조회 중 오류가 발생했습니다.');
      return false;
    }
  };

  /**
   * 매장 정보 수정 (에러 처리 포함)
   * @param {string} storeId - 매장 ID
   * @param {Object} updateData - 수정할 데이터
   * @returns {Promise<boolean>}
   */
  const handleUpdateStore = async (storeId, updateData) => {
    try {
      const success = await updateStore(storeId, updateData);
      if (success) {
        showSuccess('매장 정보가 수정되었습니다.');
      } else {
        showError('매장 정보 수정에 실패했습니다.');
      }
      return success;
    } catch (err) {
      console.error('Update store error:', err);
      showError('매장 정보 수정 중 오류가 발생했습니다.');
      return false;
    }
  };

  /**
   * 매장 상태 변경 (에러 처리 포함)
   * @param {string} storeId - 매장 ID
   * @param {string} newStatus - 새 상태
   * @returns {Promise<boolean>}
   */
  const handleUpdateStoreStatus = async (storeId, newStatus) => {
    try {
      const success = await updateStoreStatus(storeId, newStatus);
      if (success) {
        const statusLabel = getStatusLabel(newStatus);
        showSuccess(`매장 상태가 '${statusLabel}'로 변경되었습니다.`);
      } else {
        showError('매장 상태 변경에 실패했습니다.');
      }
      return success;
    } catch (err) {
      console.error('Update store status error:', err);
      showError('매장 상태 변경 중 오류가 발생했습니다.');
      return false;
    }
  };

  /**
   * 매장 담당자 배정 (에러 처리 포함)
   * @param {string} storeId - 매장 ID
   * @param {string} ownerId - 담당자 ID
   * @returns {Promise<boolean>}
   */
  const handleAssignOwner = async (storeId, ownerId) => {
    try {
      const success = await assignOwner(storeId, ownerId);
      if (success) {
        showSuccess(ownerId ? '담당자가 배정되었습니다.' : '담당자 배정이 해제되었습니다.');
      } else {
        showError('담당자 배정에 실패했습니다.');
      }
      return success;
    } catch (err) {
      console.error('Assign owner error:', err);
      showError('담당자 배정 중 오류가 발생했습니다.');
      return false;
    }
  };

  /**
   * 새 매장 생성 (에러 처리 포함)
   * @param {Object} storeData - 매장 데이터
   * @returns {Promise<Object|null>}
   */
  const handleCreateStore = async (storeData) => {
    try {
      
      const store = await createStore(storeData);
      
      
      if (store) {
        showSuccess('새 매장이 등록되었습니다.');
        return store;
      } else {
        showError('매장 등록에 실패했습니다.');
        return null;
      }
    } catch (err) {
      console.error('🪝 Create store error:', err);
      console.error('🪝 에러 메시지:', err.message);
      console.error('🪝 에러 스택:', err.stack);
      showError('매장 등록 중 오류가 발생했습니다.');
      return null;
    }
  };

  /**
   * 매장 삭제 (확인 다이얼로그 포함)
   * @param {string} storeId - 매장 ID
   * @param {string} storeName - 매장명 (확인용)
   * @returns {Promise<boolean>}
   */
  const handleDeleteStore = (storeId, storeName) => {
    return new Promise((resolve) => {
      showConfirmDialog(
        `'${storeName}' 매장을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`,
        async () => {
          try {
            const success = await deleteStore(storeId);
            if (success) {
              showSuccess('매장이 삭제되었습니다.');
            } else {
              showError('매장 삭제에 실패했습니다.');
            }
            resolve(success);
          } catch (err) {
            console.error('Delete store error:', err);
            showError('매장 삭제 중 오류가 발생했습니다.');
            resolve(false);
          }
        },
        () => resolve(false)
      );
    });
  };

  /**
   * 일괄 업데이트 (에러 처리 포함)
   * @param {Array} updates - 업데이트 목록
   * @returns {Promise<Object|null>}
   */
  const handleBulkUpdate = async (updates) => {
    try {
      const result = await bulkUpdate(updates);
      if (result) {
        showSuccess(`${result.successCount}개 매장이 업데이트되었습니다.`);
        if (result.errorCount > 0) {
          showError(`${result.errorCount}개 매장 업데이트에 실패했습니다.`);
        }
      } else {
        showError('일괄 업데이트에 실패했습니다.');
      }
      return result;
    } catch (err) {
      console.error('Bulk update error:', err);
      showError('일괄 업데이트 중 오류가 발생했습니다.');
      return null;
    }
  };

  /**
   * 검색 필터 적용
   * @param {string} searchText - 검색어
   */
  const handleSearch = (searchText) => {
    setFilters({ searchText });
  };

  /**
   * 상태 필터 적용
   * @param {Array<string>} statuses - 상태 목록
   */
  const handleStatusFilter = (statuses) => {
    setFilters({ statuses });
  };

  /**
   * 라이프사이클 필터 적용
   * @param {Array<string>} lifecycles - 라이프사이클 목록
   */
  const handleLifecycleFilter = (lifecycles) => {
    setFilters({ lifecycles });
  };

  /**
   * 담당자 필터 적용
   * @param {string} ownerId - 담당자 ID
   */
  const handleOwnerFilter = (ownerId) => {
    setFilters({ ownerId });
  };

  /**
   * 모든 필터 초기화
   */
  const handleResetFilters = () => {
    setFilters({
      ownerId: null,
      statuses: [],
      lifecycles: [],
      searchText: '',
      dateRange: { startDate: null, endDate: null }
    });
  };

  /**
   * 정렬 변경
   * @param {string} field - 정렬 필드
   */
  const handleSort = (field) => {
    const newOrder = sorting.field === field && sorting.order === 'asc' ? 'desc' : 'asc';
    setSorting(field, newOrder);
  };

  /**
   * 매장 통계 계산
   * @returns {Object}
   */
  const getStoreStats = () => {
    const statusCounts = Object.keys(STORE_STATUS).reduce((acc, status) => {
      acc[status] = stores.filter(store => store.status === status).length;
      return acc;
    }, {});

    const lifecycleCounts = Object.keys(LIFECYCLE).reduce((acc, lifecycle) => {
      acc[lifecycle] = stores.filter(store => store.lifecycle === lifecycle).length;
      return acc;
    }, {});

    return {
      total: stores.length,
      statusCounts,
      lifecycleCounts,
      hasOwner: stores.filter(store => store.ownerId).length,
      noOwner: stores.filter(store => !store.ownerId).length
    };
  };

  /**
   * 선택된 매장의 상태 정보
   * @returns {Object|null}
   */
  const getSelectedStoreStatus = () => {
    if (!selectedStore) return null;

    return {
      statusLabel: getStatusLabel(selectedStore.status),
      statusColor: getStatusColor(selectedStore.status),
      lifecycleLabel: LIFECYCLE[selectedStore.lifecycle]?.label || selectedStore.lifecycle,
      canEdit: true, // 권한 체크 로직 추가 가능
      canDelete: true // 권한 체크 로직 추가 가능
    };
  };

  /**
   * 페이지네이션 헬퍼
   */
  const paginationHelpers = {
    goToFirstPage: () => setPage(1),
    goToLastPage: () => setPage(pagination.totalPages),
    goToNextPage: () => pagination.hasNext && setPage(pagination.page + 1),
    goToPrevPage: () => pagination.hasPrev && setPage(pagination.page - 1),
    goToPage: (page) => setPage(page)
  };

  return {
    // 상태
    stores,
    filteredStores,
    selectedStore,
    filters,
    sorting,
    pagination,
    loading,
    error,
    total,

    // 기본 액션
    fetchStores: handleFetchStores,
    selectStore: handleSelectStore,
    deselectStore,
    updateStore: handleUpdateStore,
    updateStoreStatus: handleUpdateStoreStatus,
    assignOwner: handleAssignOwner,
    createStore: handleCreateStore,
    deleteStore: handleDeleteStore,
    bulkUpdate: handleBulkUpdate,
    refreshSelectedStore,
    clearError,
    reset,

    // 필터링 액션
    setFilters,
    search: handleSearch,
    filterByStatus: handleStatusFilter,
    filterByLifecycle: handleLifecycleFilter,
    filterByOwner: handleOwnerFilter,
    resetFilters: handleResetFilters,

    // 정렬 액션
    setSorting,
    sort: handleSort,

    // 페이지네이션 액션
    setPage,
    setPageSize,
    ...paginationHelpers,

    // 유틸리티
    getStoreStats,
    getSelectedStoreStatus
  };
};