/**
 * 설치 서비스
 */
import { db } from '../db/database.js';
import { validateInstallationData, validateSignupData } from '../utils/validator.js';
import { ERROR_CODES } from '../utils/constants.js';
import { storeService } from './storeService.js';

export const installationService = {
  /**
   * 설치 URL 발송
   */
  async sendInstallationUrl(storeId, userRole, userId) {
    try {
      // 매장 접근 권한 확인
      const store = await storeService.getStoreById(storeId, userRole, userId);

      // 이미 완료된 상태인지 확인
      if (store.status === 'SIGNUP_COMPLETED') {
        throw {
          code: ERROR_CODES.INSTALLATION_ALREADY_COMPLETED,
          message: '이미 가입이 완료된 매장입니다',
          statusCode: 409
        };
      }

      // 기존 활성 링크가 있는지 확인
      const existingLink = await db.installations.findByStoreId(storeId);
      if (existingLink && existingLink.status !== 'completed') {
        // 기존 링크 반환
        return existingLink;
      }

      // 새 설치 링크 생성
      const linkData = {
        store_id: storeId,
        sent_at: new Date().toISOString()
      };

      const link = await db.installations.create(linkData);

      // SMS 발송 시뮬레이션
      console.log(`📱 SMS 발송 시뮬레이션:
To: ${store.store_contact_phone || store.store_phone}
Message: [CatchOrder] 가입을 완료해주세요.
URL: https://signup.catchorder.com/install/${link.token}
매장: ${store.store_name}
기한: 7일`);

      return link;
    } catch (error) {
      throw error;
    }
  },

  /**
   * 설치 상태 조회
   */
  async getInstallationStatus(storeId, userRole, userId) {
    try {
      // 매장 접근 권한 확인
      const store = await storeService.getStoreById(storeId, userRole, userId);

      const link = await db.installations.findByStoreId(storeId);
      
      return {
        store_id: storeId,
        store_status: store.status,
        lifecycle: store.lifecycle,
        has_link: !!link,
        link_status: link ? link.status : null,
        sent_at: link ? link.sent_at : null,
        completed_at: link ? link.completed_at : null,
        signup_completed_date: store.signup_completed_date
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * 가입 완료 처리 (외부 공개 API)
   */
  async completeInstallation(token, signupData) {
    try {
      // 데이터 검증
      const validation = validateSignupData({ token, ...signupData });
      if (!validation.valid) {
        throw {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: '가입 데이터가 유효하지 않습니다',
          statusCode: 400,
          details: { errors: validation.errors }
        };
      }

      // 토큰으로 설치 링크 조회
      const link = await db.installations.findByToken(token);
      if (!link) {
        throw {
          code: ERROR_CODES.INVALID_INSTALLATION_TOKEN,
          message: '유효하지 않은 설치 토큰입니다',
          statusCode: 404
        };
      }

      // 이미 완료된 경우
      if (link.status === 'completed') {
        throw {
          code: ERROR_CODES.INSTALLATION_ALREADY_COMPLETED,
          message: '이미 가입이 완료되었습니다',
          statusCode: 409
        };
      }

      // 링크 만료 확인 (7일)
      const sentDate = new Date(link.sent_at);
      const expiryDate = new Date(sentDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      if (new Date() > expiryDate) {
        throw {
          code: ERROR_CODES.INVALID_INSTALLATION_TOKEN,
          message: '설치 링크가 만료되었습니다',
          statusCode: 400
        };
      }

      // 트랜잭션처럼 처리 (가입 완료)
      const result = await db.installations.completeByToken(token, signupData);
      
      if (!result) {
        throw {
          code: ERROR_CODES.DATABASE_ERROR,
          message: '가입 완료 처리 중 오류가 발생했습니다',
          statusCode: 500
        };
      }

      console.log(`✅ 가입 완료:
매장: ${result.store?.store_name}
완료일: ${result.link.completed_at}
희망 설치일: ${signupData.desired_install_date || '미정'}`);

      return {
        link: result.link,
        store: result.store
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * 설치 링크 상태 확인 (토큰 기반 - 외부 공개 API)
   */
  async getInstallationByToken(token) {
    try {
      const link = await db.installations.findByToken(token);
      if (!link) {
        throw {
          code: ERROR_CODES.INVALID_INSTALLATION_TOKEN,
          message: '유효하지 않은 설치 토큰입니다',
          statusCode: 404
        };
      }

      const store = await db.stores.findById(link.store_id);
      
      return {
        link,
        store: store ? {
          store_id: store.store_id,
          store_name: store.store_name,
          store_address: store.store_address
        } : null
      };
    } catch (error) {
      throw error;
    }
  }
};