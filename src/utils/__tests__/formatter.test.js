/**
 * formatter.js 유틸리티 함수 테스트
 */
import { describe, it, expect } from 'vitest';
import {
  formatDate,
  formatDateTime,
  formatPhone,
  formatPhoneInput,
  formatTime,
  daysUntil,
  isOverdue,
  truncateText,
  formatKoreanNumber,
  formatFileSize,
} from '../formatter';

describe('formatter utils', () => {
  describe('formatDate', () => {
    it('ISO 날짜를 YYYY.MM.DD 형식으로 변환한다', () => {
      expect(formatDate('2024-01-15T10:30:00Z')).toBe('2024.01.15');
      expect(formatDate('2024-12-31T23:59:59Z')).toBe('2024.12.31');
    });

    it('빈 값이나 잘못된 날짜는 빈 문자열을 반환한다', () => {
      expect(formatDate('')).toBe('');
      expect(formatDate(null)).toBe('');
      expect(formatDate('invalid')).toBe('');
    });
  });

  describe('formatDateTime', () => {
    it('ISO 날짜를 YYYY.MM.DD HH:mm 형식으로 변환한다', () => {
      expect(formatDateTime('2024-01-15T10:30:00Z')).toMatch(/2024\.01\.15 \d{2}:\d{2}/);
      expect(formatDateTime('2024-12-31T23:59:59Z')).toMatch(/2024\.12\.(31|01) \d{2}:\d{2}/);
    });

    it('빈 값이나 잘못된 날짜는 빈 문자열을 반환한다', () => {
      expect(formatDateTime('')).toBe('');
      expect(formatDateTime(null)).toBe('');
      expect(formatDateTime('invalid')).toBe('');
    });
  });

  describe('formatPhone', () => {
    it('010 휴대폰 번호를 형식화한다', () => {
      expect(formatPhone('01012345678')).toBe('010-1234-5678');
      expect(formatPhone('010 1234 5678')).toBe('010-1234-5678');
      expect(formatPhone('010-1234-5678')).toBe('010-1234-5678');
    });

    it('010이 아닌 번호는 원본을 반환한다', () => {
      expect(formatPhone('0212345678')).toBe('0212345678');
      expect(formatPhone('01112345678')).toBe('01112345678');
    });

    it('빈 값은 빈 문자열을 반환한다', () => {
      expect(formatPhone('')).toBe('');
      expect(formatPhone(null)).toBe('');
    });
  });

  describe('formatPhoneInput', () => {
    it('입력 중 실시간으로 전화번호를 형식화한다', () => {
      expect(formatPhoneInput('010')).toBe('010');
      expect(formatPhoneInput('0101234')).toBe('010-1234');
      expect(formatPhoneInput('01012345678')).toBe('010-1234-5678');
    });

    it('11자리를 초과하면 이전 값을 반환한다', () => {
      expect(formatPhoneInput('010123456789', '01012345678')).toBe('01012345678');
    });

    it('010으로 시작하지 않으면 포맷팅하지 않는다', () => {
      expect(formatPhoneInput('021')).toBe('021');
      expect(formatPhoneInput('0212345678')).toBe('0212345678');
    });
  });

  describe('formatTime', () => {
    it('ISO 날짜에서 HH:mm 형식의 시간을 추출한다', () => {
      expect(formatTime('2024-01-15T10:30:00Z')).toMatch(/\d{2}:\d{2}/);
      expect(formatTime('2024-01-15T23:59:59Z')).toMatch(/\d{2}:\d{2}/);
    });

    it('빈 값이나 잘못된 날짜는 빈 문자열을 반환한다', () => {
      expect(formatTime('')).toBe('');
      expect(formatTime(null)).toBe('');
      expect(formatTime('invalid')).toBe('');
    });
  });

  describe('daysUntil', () => {
    it('목표 날짜까지 남은 일수를 계산한다', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(daysUntil(tomorrow.toISOString())).toBe(1);

      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      expect(daysUntil(nextWeek.toISOString())).toBe(7);
    });

    it('지난 날짜는 음수를 반환한다', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(daysUntil(yesterday.toISOString())).toBe(-1);
    });

    it('빈 값은 0을 반환한다', () => {
      expect(daysUntil(null)).toBe(0);
      expect(daysUntil('')).toBe(0);
    });
  });

  describe('isOverdue', () => {
    it('지난 날짜는 true를 반환한다', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isOverdue(yesterday.toISOString())).toBe(true);
    });

    it('미래 날짜는 false를 반환한다', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(isOverdue(tomorrow.toISOString())).toBe(false);
    });
  });

  describe('truncateText', () => {
    it('지정된 길이로 텍스트를 자른다', () => {
      expect(truncateText('안녕하세요 테스트입니다', 5)).toBe('안녕하세요...');
      expect(truncateText('짧은텍스트', 10)).toBe('짧은텍스트');
    });

    it('빈 값은 빈 문자열을 반환한다', () => {
      expect(truncateText('', 10)).toBe('');
      expect(truncateText(null, 10)).toBe('');
    });
  });

  describe('formatKoreanNumber', () => {
    it('숫자를 한국어 단위로 형식화한다', () => {
      expect(formatKoreanNumber(0)).toBe('0');
      expect(formatKoreanNumber(1000)).toBe('1천');
      expect(formatKoreanNumber(10000)).toBe('1만');
      expect(formatKoreanNumber(12345)).toBe('1만 2345');
      expect(formatKoreanNumber(100000000)).toBe('1억');
      expect(formatKoreanNumber(123456789)).toBe('1억 2345만');
    });

    it('빈 값이나 0은 0을 반환한다', () => {
      expect(formatKoreanNumber(null)).toBe('0');
      expect(formatKoreanNumber(0)).toBe('0');
    });
  });

  describe('formatFileSize', () => {
    it('바이트를 읽기 쉬운 단위로 변환한다', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(1073741824)).toBe('1 GB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
    });
  });
});