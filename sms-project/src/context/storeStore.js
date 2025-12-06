/**
 * 매장 관련 Zustand 스토어
 */
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { 
  getStores, 
  getStoreDetail, 
  updateStore, 
  updateStoreStatus, 
  assignOwner,
  createStore as createStoreAPI,
  deleteStore,
  bulkUpdateStores,
  updateStoreAdditionalInfo
} from '../api/storeApi.js';

/**
 * 매장 스토어 인터페이스
 * @typedef {Object} StoreStore
 * @property {Array} stores - 전체 매장 목록
 * @property {Array} filteredStores - 필터링된 매장 목록
 * @property {Object|null} selectedStore - 선택된 매장 상세 정보
 * @property {Object} filters - 현재 필터 설정
 * @property {Object} sorting - 정렬 설정
 * @property {Object} pagination - 페이지네이션 정보
 * @property {boolean} loading - 로딩 상태
 * @property {string|null} error - 에러 메시지
 * @property {number} total - 전체 매장 수
 */

/**
 * 매장 스토어 생성
 */
export const useStoreStore = create(
  devtools(
    (set, get) => ({
      // 상태
      stores: [],
      filteredStores: [],
      selectedStore: null,
      filters: {
        ownerId: null,
        statuses: [],
        lifecycles: [],
        searchText: '',
        dateRange: { startDate: null, endDate: null }
      },
      sorting: {
        field: 'updatedAt',
        order: 'desc'
      },
      pagination: {
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
      },
      loading: false,
      error: null,
      total: 0,

      // 액션
      /**
       * 매장 목록 조회
       * @param {Object} customFilters - 커스텀 필터 (선택사항)
       * @returns {Promise<boolean>} 조회 성공 여부
       */
      fetchStores: async (customFilters = {}) => {
        const { filters, sorting, pagination } = get();
        
        set({ loading: true, error: null });

        try {
          // 필터 병합
          const mergedFilters = {
            ...filters,
            ...customFilters,
            ...sorting,
            page: pagination.page,
            pageSize: pagination.pageSize
          };

          const response = await getStores(mergedFilters);

          if (response.success) {
            // API 응답이 직접 배열이면 그대로 사용, 아니면 data 안에서 찾기
            const stores = Array.isArray(response.data) ? response.data : 
                          (response.data?.stores || []);
            
            set({
              stores: stores,
              filteredStores: stores,
              pagination: { total: response.data?.total || stores.length },
              total: response.data?.total || stores.length,
              loading: false,
              error: null
            });
            return true;
          } else {
            set({
              loading: false,
              error: response.error
            });
            return false;
          }
        } catch (error) {
          console.error('Fetch stores error:', error);
          set({
            loading: false,
            error: '매장 목록 조회 중 오류가 발생했습니다.'
          });
          return false;
        }
      },

      /**
       * 필터 설정 및 자동 재조회
       * @param {Object} newFilters - 새 필터 설정
       */
      setFilters: async (newFilters) => {
        set(state => ({
          filters: { ...state.filters, ...newFilters },
          pagination: { ...state.pagination, page: 1 } // 첫 페이지로 리셋
        }));
        
        // 자동 재조회
        await get().fetchStores();
      },

      /**
       * 매장 선택
       * @param {string} storeId - 매장 ID
       */
      selectStore: async (storeId) => {
        if (!storeId) {
          set({ selectedStore: null });
          return;
        }

        set({ loading: true, error: null });

        try {
          const response = await getStoreDetail(storeId);

          if (response.success) {
            set({
              selectedStore: response.data.store,
              loading: false,
              error: null
            });
            return true;
          } else {
            set({
              loading: false,
              error: response.error
            });
            return false;
          }
        } catch (error) {
          console.error('Select store error:', error);
          set({
            loading: false,
            error: '매장 상세 정보 조회 중 오류가 발생했습니다.'
          });
          return false;
        }
      },

      /**
       * 매장 선택 해제
       */
      deselectStore: () => {
        set({ selectedStore: null });
      },

      /**
       * 매장 정보 수정
       * @param {string} storeId - 매장 ID
       * @param {Object} updateData - 수정할 데이터
       */
      updateStore: async (storeId, updateData) => {
        set({ loading: true, error: null });

        try {
          const response = await updateStore(storeId, updateData);

          if (response.success) {
            // 매장 목록에서 해당 매장 업데이트
            set(state => {
              const updatedStores = state.stores.map(store =>
                store.id === storeId ? response.data.store : store
              );
              
              return {
                stores: updatedStores,
                filteredStores: updatedStores,
                selectedStore: state.selectedStore?.id === storeId ? 
                  response.data.store : state.selectedStore,
                loading: false,
                error: null
              };
            });
            return true;
          } else {
            set({
              loading: false,
              error: response.error
            });
            return false;
          }
        } catch (error) {
          console.error('Update store error:', error);
          set({
            loading: false,
            error: '매장 정보 수정 중 오류가 발생했습니다.'
          });
          return false;
        }
      },

      /**
       * 매장 상태 변경
       * @param {string} storeId - 매장 ID
       * @param {string} newStatus - 새 상태
       */
      updateStoreStatus: async (storeId, newStatus) => {
        set({ loading: true, error: null });

        try {
          const response = await updateStoreStatus(storeId, newStatus);

          if (response.success) {
            // 매장 목록에서 해당 매장 업데이트
            set(state => {
              const updatedStores = state.stores.map(store =>
                store.id === storeId ? response.data.store : store
              );
              
              return {
                stores: updatedStores,
                filteredStores: updatedStores,
                selectedStore: state.selectedStore?.id === storeId ? 
                  response.data.store : state.selectedStore,
                loading: false,
                error: null
              };
            });
            return true;
          } else {
            set({
              loading: false,
              error: response.error
            });
            return false;
          }
        } catch (error) {
          console.error('Update store status error:', error);
          set({
            loading: false,
            error: '매장 상태 변경 중 오류가 발생했습니다.'
          });
          return false;
        }
      },

      /**
       * 매장 담당자 배정
       * @param {string} storeId - 매장 ID
       * @param {string} ownerId - 담당자 ID
       */
      assignOwner: async (storeId, ownerId) => {
        set({ loading: true, error: null });

        try {
          const response = await assignOwner(storeId, ownerId);

          if (response.success) {
            // 매장 목록에서 해당 매장 업데이트
            set(state => {
              const updatedStores = state.stores.map(store =>
                store.id === storeId ? response.data.store : store
              );
              
              return {
                stores: updatedStores,
                filteredStores: updatedStores,
                selectedStore: state.selectedStore?.id === storeId ? 
                  response.data.store : state.selectedStore,
                loading: false,
                error: null
              };
            });
            return true;
          } else {
            set({
              loading: false,
              error: response.error
            });
            return false;
          }
        } catch (error) {
          console.error('Assign owner error:', error);
          set({
            loading: false,
            error: '담당자 배정 중 오류가 발생했습니다.'
          });
          return false;
        }
      },

      /**
       * 매장 추가 정보 업데이트
       * @param {string} storeId - 매장 ID
       * @param {Object} additionalData - 추가 정보 데이터
       */
      updateStoreAdditionalInfo: async (storeId, additionalData) => {
        set({ loading: true, error: null });

        try {
          const response = await updateStoreAdditionalInfo(storeId, additionalData);

          if (response.success) {
            // 매장 목록에서 해당 매장 업데이트
            set(state => {
              const updatedStore = { ...state.selectedStore, ...response.data };
              const updatedStores = state.stores.map(store =>
                store.id === storeId ? updatedStore : store
              );
              
              return {
                stores: updatedStores,
                filteredStores: updatedStores,
                selectedStore: state.selectedStore?.id === storeId ? 
                  updatedStore : state.selectedStore,
                loading: false,
                error: null
              };
            });
            return true;
          } else {
            set({
              loading: false,
              error: response.error
            });
            return false;
          }
        } catch (error) {
          console.error('Update store additional info error:', error);
          set({
            loading: false,
            error: '매장 추가 정보 수정 중 오류가 발생했습니다.'
          });
          return false;
        }
      },

      /**
       * 정렬 설정
       * @param {string} field - 정렬 필드
       * @param {string} order - 정렬 순서 (asc, desc)
       */
      setSorting: async (field, order) => {
        set({ sorting: { field, order } });
        
        // 자동 재조회
        await get().fetchStores();
      },

      /**
       * 페이지 변경
       * @param {number} page - 페이지 번호
       */
      setPage: async (page) => {
        set(state => ({
          pagination: { ...state.pagination, page }
        }));
        
        // 자동 재조회
        await get().fetchStores();
      },

      /**
       * 페이지 크기 변경
       * @param {number} pageSize - 페이지 크기
       */
      setPageSize: async (pageSize) => {
        set(state => ({
          pagination: { ...state.pagination, pageSize, page: 1 }
        }));
        
        // 자동 재조회
        await get().fetchStores();
      },

      /**
       * 새 매장 생성
       * @param {Object} storeData - 매장 데이터
       */
      createStore: async (storeData) => {
        set({ loading: true, error: null });

        try {
          const response = await createStoreAPI(storeData);

          if (response.success) {
            // 매장 목록 새로고침
            await get().fetchStores();
            const store = response.data?.store || response.data;
            
            // loading 상태를 false로 설정
            set({ loading: false, error: null });
            
            return store;
          } else {
            set({
              loading: false,
              error: response.error
            });
            return null;
          }
        } catch (error) {
          console.error('🏪 Create store error:', error);
          console.error('🏪 에러 메시지:', error.message);
          console.error('🏪 에러 스택:', error.stack);
          set({
            loading: false,
            error: '매장 생성 중 오류가 발생했습니다.'
          });
          return null;
        }
      },

      /**
       * 매장 삭제
       * @param {string} storeId - 매장 ID
       */
      deleteStore: async (storeId) => {
        set({ loading: true, error: null });

        try {
          const response = await deleteStore(storeId);

          if (response.success) {
            // 매장 목록에서 제거
            set(state => ({
              stores: state.stores.filter(store => store.id !== storeId),
              filteredStores: state.filteredStores.filter(store => store.id !== storeId),
              selectedStore: state.selectedStore?.id === storeId ? null : state.selectedStore,
              loading: false,
              error: null
            }));
            return true;
          } else {
            set({
              loading: false,
              error: response.error
            });
            return false;
          }
        } catch (error) {
          console.error('Delete store error:', error);
          set({
            loading: false,
            error: '매장 삭제 중 오류가 발생했습니다.'
          });
          return false;
        }
      },

      /**
       * 일괄 업데이트
       * @param {Array} updates - 업데이트 목록
       */
      bulkUpdate: async (updates) => {
        set({ loading: true, error: null });

        try {
          const response = await bulkUpdateStores(updates);

          if (response.success) {
            // 매장 목록 새로고침
            await get().fetchStores();
            return response.data;
          } else {
            set({
              loading: false,
              error: response.error
            });
            return null;
          }
        } catch (error) {
          console.error('Bulk update error:', error);
          set({
            loading: false,
            error: '일괄 업데이트 중 오류가 발생했습니다.'
          });
          return null;
        }
      },

      /**
       * 선택된 매장 새로고침
       */
      refreshSelectedStore: async () => {
        const { selectedStore } = get();
        if (selectedStore) {
          await get().selectStore(selectedStore.id);
        }
      },

      /**
       * 에러 클리어
       */
      clearError: () => {
        set({ error: null });
      },

      /**
       * 전체 초기화
       */
      reset: () => {
        set({
          stores: [],
          filteredStores: [],
          selectedStore: null,
          filters: {
            ownerId: null,
            statuses: [],
            lifecycles: [],
            searchText: '',
            dateRange: { startDate: null, endDate: null }
          },
          sorting: {
            field: 'updatedAt',
            order: 'desc'
          },
          pagination: {
            page: 1,
            pageSize: 20,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false
          },
          loading: false,
          error: null,
          total: 0
        });
      }
    }),
    {
      name: 'store-store' // devtools에서 표시될 이름
    }
  )
);