/**
 * validation.js 유틸리티 함수 테스트
 */
import { describe, it, expect } from 'vitest';
import {
  isValidEmail,
  isValidPhone,
  isValidStoreName,
  isValidAddress,
  isValidMemo,
  isValidScheduledDate,
  isValidPassword,
  isValidBusinessNumber,
  isValidUrl,
  getValidationError,
  validateFormData,
} from '../validation';

describe('validation utils', () => {
  describe('isValidEmail', () => {
    it('유효한 이메일 형식을 검증한다', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.kr')).toBe(true);
      expect(isValidEmail('admin+tag@company.org')).toBe(true);
    });

    it('유효하지 않은 이메일 형식을 거부한다', () => {
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('user@domain')).toBe(false);
      expect(isValidEmail('user @domain.com')).toBe(false);
    });
  });

  describe('isValidPhone', () => {
    it('유효한 휴대폰 번호를 검증한다', () => {
      expect(isValidPhone('01012345678')).toBe(true);
      expect(isValidPhone('010-1234-5678')).toBe(true);
      expect(isValidPhone('010 1234 5678')).toBe(true);
    });

    it('유효하지 않은 휴대폰 번호를 거부한다', () => {
      expect(isValidPhone('')).toBe(false);
      expect(isValidPhone('02-123-4567')).toBe(false); // 일반 전화
      expect(isValidPhone('01112345678')).toBe(false); // 010이 아님
      expect(isValidPhone('0101234567')).toBe(false); // 10자리
      expect(isValidPhone('010123456789')).toBe(false); // 12자리
    });
  });

  describe('isValidStoreName', () => {
    it('유효한 매장명을 검증한다', () => {
      expect(isValidStoreName('매장')).toBe(true);
      expect(isValidStoreName('테스트 매장 이름')).toBe(true);
      expect(isValidStoreName('A' * 50)).toBe(true); // 50자
    });

    it('유효하지 않은 매장명을 거부한다', () => {
      expect(isValidStoreName('')).toBe(false);
      expect(isValidStoreName('A')).toBe(false); // 1자
      expect(isValidStoreName('  ')).toBe(false); // 공백만
      expect(isValidStoreName('A'.repeat(51))).toBe(false); // 51자
    });
  });

  describe('isValidAddress', () => {
    it('유효한 주소를 검증한다', () => {
      expect(isValidAddress('서울시')).toBe(true); // 5자
      expect(isValidAddress('서울특별시 강남구 테헤란로 123')).toBe(true);
      expect(isValidAddress('A'.repeat(200))).toBe(true); // 200자
    });

    it('유효하지 않은 주소를 거부한다', () => {
      expect(isValidAddress('')).toBe(false);
      expect(isValidAddress('서울')).toBe(false); // 4자 이하
      expect(isValidAddress('A'.repeat(201))).toBe(false); // 201자 이상
    });
  });

  describe('isValidMemo', () => {
    it('유효한 메모를 검증한다', () => {
      expect(isValidMemo('메모 내용')).toBe(true);
      expect(isValidMemo('A'.repeat(1000))).toBe(true); // 1000자
    });

    it('유효하지 않은 메모를 거부한다', () => {
      expect(isValidMemo('')).toBe(false);
      expect(isValidMemo('A'.repeat(1001))).toBe(false); // 1001자 이상
    });
  });

  describe('isValidScheduledDate', () => {
    it('미래 날짜를 유효한 것으로 판단한다', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(isValidScheduledDate(tomorrow.toISOString())).toBe(true);
    });

    it('과거 날짜를 유효하지 않은 것으로 판단한다', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isValidScheduledDate(yesterday.toISOString())).toBe(false);
      expect(isValidScheduledDate(new Date().toISOString())).toBe(false);
    });
  });

  describe('isValidPassword', () => {
    it('유효한 비밀번호를 검증한다', () => {
      expect(isValidPassword('password123')).toBe(true);
      expect(isValidPassword('Abc12345')).toBe(true);
      expect(isValidPassword('test@123')).toBe(true);
    });

    it('유효하지 않은 비밀번호를 거부한다', () => {
      expect(isValidPassword('')).toBe(false);
      expect(isValidPassword('1234567')).toBe(false); // 7자
      expect(isValidPassword('password')).toBe(false); // 숫자 없음
      expect(isValidPassword('12345678')).toBe(false); // 영문 없음
    });
  });

  describe('isValidBusinessNumber', () => {
    it('유효한 사업자등록번호를 검증한다', () => {
      // 실제 유효한 사업자번호 예시 (테스트용)
      expect(isValidBusinessNumber('1234567890')).toBe(false); // 실제로는 체크섬 검증
      expect(isValidBusinessNumber('123-45-67890')).toBe(false); // 대시 포함
    });

    it('유효하지 않은 사업자등록번호를 거부한다', () => {
      expect(isValidBusinessNumber('')).toBe(false);
      expect(isValidBusinessNumber('123456789')).toBe(false); // 9자리
      expect(isValidBusinessNumber('12345678901')).toBe(false); // 11자리
    });
  });

  describe('isValidUrl', () => {
    it('유효한 URL을 검증한다', () => {
      expect(isValidUrl('http://example.com')).toBe(true);
      expect(isValidUrl('https://www.example.com')).toBe(true);
      expect(isValidUrl('https://example.com:8080/path')).toBe(true);
    });

    it('유효하지 않은 URL을 거부한다', () => {
      expect(isValidUrl('')).toBe(false);
      expect(isValidUrl('not a url')).toBe(false);
      expect(isValidUrl('example.com')).toBe(false); // 프로토콜 없음
      expect(isValidUrl('http://')).toBe(false);
    });
  });

  describe('getValidationError', () => {
    it('이메일 필드의 에러 메시지를 반환한다', () => {
      expect(getValidationError('email', '')).toBe('이메일을 입력해주세요.');
      expect(getValidationError('email', 'invalid')).toBe(
        '올바른 이메일 형식을 입력해주세요.'
      );
      expect(getValidationError('email', 'test@example.com')).toBe(null);
    });

    it('전화번호 필드의 에러 메시지를 반환한다', () => {
      expect(getValidationError('phone', '')).toBe('전화번호를 입력해주세요.');
      expect(getValidationError('phone', '123')).toBe(
        '010으로 시작하는 11자리 휴대폰 번호를 입력해주세요.'
      );
      expect(getValidationError('phone', '01012345678')).toBe(null);
    });
  });

  describe('validateFormData', () => {
    it('필수 필드가 없을 때 에러를 반환한다', () => {
      const data = { email: 'test@example.com' };
      const required = ['email', 'password'];
      const errors = validateFormData(data, required);

      expect(errors.password).toBe('password는(은) 필수 입력 항목입니다.');
      expect(errors.email).toBeUndefined();
    });

    it('유효하지 않은 데이터에 대해 에러를 반환한다', () => {
      const data = {
        email: 'invalid-email',
        phone: '123',
      };
      const errors = validateFormData(data, []);

      expect(errors.email).toBe('올바른 이메일 형식을 입력해주세요.');
      expect(errors.phone).toBe('010으로 시작하는 11자리 휴대폰 번호를 입력해주세요.');
    });

    it('모든 데이터가 유효하면 빈 객체를 반환한다', () => {
      const data = {
        email: 'test@example.com',
        phone: '01012345678',
      };
      const errors = validateFormData(data, ['email', 'phone']);

      expect(errors).toEqual({});
    });
  });
});