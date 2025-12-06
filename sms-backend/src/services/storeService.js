/**
 * 매장 서비스
 */
import { db } from '../db/database.js';
import { validateStoreData } from '../utils/validator.js';
import { ERROR_CODES } from '../utils/constants.js';

export const storeService = {
  /**
   * 매장 목록 조회 (필터링 포함)
   */
  async getAllStores(filters = {}, userRole, userId) {
    try {
      // GENERAL 권한이면 본인 배정 매장만 반환
      if (userRole === 'GENERAL') {
        filters.ownerId = userId;
      }

      const stores = await db.stores.findAll(filters);
      
      return {
        stores,
        total: stores.length
      };
    } catch (error) {
      throw {
        code: ERROR_CODES.DATABASE_ERROR,
        message: '매장 목록 조회 중 오류가 발생했습니다',
        statusCode: 500,
        details: error
      };
    }
  },

  /**
   * 매장 상세 조회
   */
  async getStoreById(storeId, userRole, userId) {
    try {
      const store = await db.stores.findById(storeId);
      
      if (!store) {
        throw {
          code: ERROR_CODES.STORE_NOT_FOUND,
          message: '매장을 찾을 수 없습니다',
          statusCode: 404
        };
      }

      // GENERAL 권한이면 본인 배정 매장만 접근 가능
      if (userRole === 'GENERAL' && store.owner_id !== userId) {
        throw {
          code: ERROR_CODES.FORBIDDEN,
          message: '해당 매장에 접근할 권한이 없습니다',
          statusCode: 403
        };
      }

      return store;
    } catch (error) {
      throw error;
    }
  },

  /**
   * 매장 정보 수정
   */
  async updateStore(storeId, updateData, userRole, userId) {
    try {
      // 기존 매장 조회
      const existingStore = await this.getStoreById(storeId, userRole, userId);

      // 데이터 검증
      const validation = validateStoreData({ ...existingStore, ...updateData });
      if (!validation.valid) {
        throw {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: '매장 데이터가 유효하지 않습니다',
          statusCode: 400,
          details: { errors: validation.errors }
        };
      }

      const updatedStore = await db.stores.update(storeId, updateData);
      
      if (!updatedStore) {
        throw {
          code: ERROR_CODES.STORE_NOT_FOUND,
          message: '매장을 찾을 수 없습니다',
          statusCode: 404
        };
      }

      return updatedStore;
    } catch (error) {
      throw error;
    }
  },

  /**
   * 매장 상태 변경
   */
  async updateStoreStatus(storeId, newStatus, userRole, userId) {
    try {
      // 접근 권한 확인
      await this.getStoreById(storeId, userRole, userId);

      const updatedStore = await db.stores.updateStatus(storeId, newStatus);
      
      if (!updatedStore) {
        throw {
          code: ERROR_CODES.STORE_NOT_FOUND,
          message: '매장을 찾을 수 없습니다',
          statusCode: 404
        };
      }

      return updatedStore;
    } catch (error) {
      throw error;
    }
  },

  /**
   * 담당자 배정 (ADMIN만 가능)
   */
  async assignOwner(storeId, ownerId) {
    try {
      // 담당자 유효성 확인 (null이 아닌 경우)
      if (ownerId) {
        const owner = await db.users.findById(ownerId);
        if (!owner) {
          throw {
            code: ERROR_CODES.USER_NOT_FOUND,
            message: '담당자를 찾을 수 없습니다',
            statusCode: 404
          };
        }
      }

      const updatedStore = await db.stores.assignOwner(storeId, ownerId);
      
      if (!updatedStore) {
        throw {
          code: ERROR_CODES.STORE_NOT_FOUND,
          message: '매장을 찾을 수 없습니다',
          statusCode: 404
        };
      }

      return updatedStore;
    } catch (error) {
      throw error;
    }
  },

  /**
   * 매장 생성
   */
  async createStore(storeData) {
    try {
      // 데이터 검증
      const validation = validateStoreData(storeData);
      if (!validation.valid) {
        throw {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: '매장 데이터가 유효하지 않습니다',
          statusCode: 400,
          details: { errors: validation.errors }
        };
      }

      // 기본값 설정
      const defaultData = {
        status: 'PRE_INTRODUCTION',
        lifecycle: 'P1',
        ...storeData
      };

      const store = await db.stores.create(defaultData);
      return store;
    } catch (error) {
      throw error;
    }
  },

  /**
   * 매장 삭제 (ADMIN만 가능)
   */
  async deleteStore(storeId) {
    try {
      const store = await db.stores.findById(storeId);
      if (!store) {
        throw {
          code: ERROR_CODES.STORE_NOT_FOUND,
          message: '매장을 찾을 수 없습니다',
          statusCode: 404
        };
      }

      await db.stores.delete(storeId);
      return true;
    } catch (error) {
      throw error;
    }
  }
};