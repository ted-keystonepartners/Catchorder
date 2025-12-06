/**
 * Vitest 테스트 환경 설정
 */

// 전역 설정
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};