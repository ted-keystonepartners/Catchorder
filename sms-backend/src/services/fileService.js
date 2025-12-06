/**
 * 파일 서비스
 */
import { db } from '../db/database.js';
import { validateStoreData } from '../utils/validator.js';
import { ERROR_CODES } from '../utils/constants.js';

export const fileService = {
  /**
   * 엑셀 파일 파싱 (시뮬레이션)
   */
  async parseExcelFile(buffer, fileType) {
    try {
      // 실제로는 xlsx 라이브러리 사용
      // const XLSX = require('xlsx');
      // const workbook = XLSX.read(buffer, { type: 'buffer' });
      
      console.log(`📄 엑셀 파일 파싱 시뮬레이션 (${fileType}):
파일 크기: ${buffer.length} bytes
처리 중...`);

      // Mock 파싱 결과
      if (fileType === 'stores') {
        return [
          {
            seq: 1,
            store_name: '테스트매장1',
            store_address: '서울특별시 강남구 테헤란로 123',
            store_phone: '02-123-4567',
            store_contact_phone: '010-1234-5678',
            category: '음식점',
            employee_count: 5,
            revenue: 500000000,
            owner_name: '김사장'
          },
          {
            seq: 2,
            store_name: '테스트매장2',
            store_address: '서울특별시 서초구 강남대로 456',
            store_phone: '02-234-5678',
            store_contact_phone: '010-2345-6789',
            category: '카페',
            employee_count: 3,
            revenue: 300000000,
            owner_name: '이사장'
          }
        ];
      } else if (fileType === 'contacts') {
        return [
          {
            seq: 1,
            owner_name: '김담당',
            phone_number: '010-1111-2222'
          },
          {
            seq: 2,
            owner_name: '이담당',
            phone_number: '010-3333-4444'
          }
        ];
      }

      return [];
    } catch (error) {
      throw {
        code: ERROR_CODES.FILE_UPLOAD_ERROR,
        message: '엑셀 파일 파싱 중 오류가 발생했습니다',
        statusCode: 500,
        details: error
      };
    }
  },

  /**
   * 매장 데이터 일괄 등록
   */
  async uploadStores(fileBuffer) {
    try {
      // 엑셀 파일 파싱
      const storeData = await this.parseExcelFile(fileBuffer, 'stores');
      
      if (!storeData || storeData.length === 0) {
        throw {
          code: ERROR_CODES.INVALID_FILE_FORMAT,
          message: '유효한 매장 데이터가 없습니다',
          statusCode: 400
        };
      }

      const results = {
        success_count: 0,
        error_count: 0,
        errors: []
      };

      // 각 매장 데이터 검증 및 생성
      for (let i = 0; i < storeData.length; i++) {
        const data = storeData[i];
        const rowNumber = i + 2; // 엑셀 행 번호 (헤더 제외)

        try {
          // 필수 필드 확인
          if (!data.store_name || !data.store_address || !data.store_phone) {
            results.errors.push({
              row: rowNumber,
              message: '필수 필드가 누락되었습니다 (매장명, 주소, 전화번호)'
            });
            results.error_count++;
            continue;
          }

          // 데이터 검증
          const validation = validateStoreData(data);
          if (!validation.valid) {
            results.errors.push({
              row: rowNumber,
              message: validation.errors.join(', ')
            });
            results.error_count++;
            continue;
          }

          // 기본값 설정
          const storeData = {
            seq: data.seq,
            store_name: data.store_name,
            store_address: data.store_address,
            store_phone: data.store_phone,
            store_contact_phone: data.store_contact_phone || null,
            category: data.category || '기타',
            employee_count: data.employee_count || 0,
            revenue: data.revenue || 0,
            status: 'PRE_INTRODUCTION',
            lifecycle: 'P1',
            owner_id: null,
            owner_name: null
          };

          // 매장 생성
          await db.stores.create(storeData);
          results.success_count++;

          console.log(`✅ 매장 생성 성공: ${data.store_name} (행 ${rowNumber})`);

        } catch (error) {
          results.errors.push({
            row: rowNumber,
            message: error.message || '매장 생성 중 오류가 발생했습니다'
          });
          results.error_count++;
          console.error(`❌ 매장 생성 실패 (행 ${rowNumber}):`, error.message);
        }
      }

      console.log(`📊 매장 업로드 완료:
성공: ${results.success_count}건
실패: ${results.error_count}건`);

      return results;
    } catch (error) {
      throw error;
    }
  },

  /**
   * 담당자 연락처 일괄 등록
   */
  async uploadOwnerContacts(fileBuffer) {
    try {
      // 엑셀 파일 파싱
      const contactData = await this.parseExcelFile(fileBuffer, 'contacts');
      
      if (!contactData || contactData.length === 0) {
        throw {
          code: ERROR_CODES.INVALID_FILE_FORMAT,
          message: '유효한 담당자 데이터가 없습니다',
          statusCode: 400
        };
      }

      const results = {
        success_count: 0,
        error_count: 0,
        errors: []
      };

      // 각 담당자 데이터 처리
      for (let i = 0; i < contactData.length; i++) {
        const data = contactData[i];
        const rowNumber = i + 2;

        try {
          // seq로 매장 찾기
          const stores = await db.stores.findAll({});
          const store = stores.find(s => s.seq === data.seq);
          
          if (!store) {
            results.errors.push({
              row: rowNumber,
              message: `Seq ${data.seq}에 해당하는 매장을 찾을 수 없습니다`
            });
            results.error_count++;
            continue;
          }

          // 담당자 연락처 생성
          const contactData = {
            store_id: store.store_id,
            owner_name: data.owner_name,
            phone_number: data.phone_number
          };

          await db.ownerContacts.create(contactData);
          results.success_count++;

          console.log(`✅ 담당자 연락처 생성 성공: ${data.owner_name} (행 ${rowNumber})`);

        } catch (error) {
          results.errors.push({
            row: rowNumber,
            message: error.message || '담당자 연락처 생성 중 오류가 발생했습니다'
          });
          results.error_count++;
          console.error(`❌ 담당자 연락처 생성 실패 (행 ${rowNumber}):`, error.message);
        }
      }

      console.log(`📊 담당자 연락처 업로드 완료:
성공: ${results.success_count}건
실패: ${results.error_count}건`);

      return results;
    } catch (error) {
      throw error;
    }
  },

  /**
   * 파일 형식 검증
   */
  validateFileFormat(file) {
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel' // .xls
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw {
        code: ERROR_CODES.INVALID_FILE_FORMAT,
        message: 'Excel 파일(.xlsx, .xls)만 업로드 가능합니다',
        statusCode: 400
      };
    }

    // 파일 크기 제한 (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw {
        code: ERROR_CODES.INVALID_FILE_FORMAT,
        message: '파일 크기는 10MB를 초과할 수 없습니다',
        statusCode: 400
      };
    }

    return true;
  }
};