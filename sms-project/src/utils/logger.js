/**
 * 중앙화된 로깅 시스템
 * 개발/프로덕션 환경에 따라 로그 레벨 조정
 */

const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

class Logger {
  constructor() {
    this.logLevel = isDevelopment ? 'debug' : 'error';
    this.prefix = '[SMS]';
  }

  /**
   * 디버그 로그 (개발 환경에서만)
   */
  debug(message, data = null) {
    if (isDevelopment) {
      console.log(`${this.prefix} [DEBUG]`, message, data || '');
    }
  }

  /**
   * 정보 로그
   */
  info(message, data = null) {
    if (isDevelopment) {
      console.info(`${this.prefix} [INFO]`, message, data || '');
    }
  }

  /**
   * 경고 로그
   */
  warn(message, data = null) {
    if (isDevelopment) {
      console.warn(`${this.prefix} [WARN]`, message, data || '');
    }
  }

  /**
   * 에러 로그 (프로덕션에서도 출력)
   */
  error(message, error = null) {
    const timestamp = new Date().toISOString();
    
    if (isDevelopment) {
      console.error(`${this.prefix} [ERROR] ${timestamp}`, message, error || '');
      if (error?.stack) {
        console.error('Stack trace:', error.stack);
      }
    } else {
      // 프로덕션에서는 간단한 에러만
      console.error(`${this.prefix} [ERROR]`, message);
    }
    
    // 프로덕션에서는 에러 추적 서비스로 전송 (추후 구현)
    if (isProduction) {
      this.sendToErrorTracking(message, error);
    }
  }

  /**
   * API 요청 로그
   */
  api(method, endpoint, status, duration = null) {
    if (isDevelopment) {
      const durationStr = duration ? `(${duration}ms)` : '';
      const statusColor = status >= 200 && status < 300 ? '✅' : '❌';
      console.log(
        `${this.prefix} [API] ${statusColor} ${method} ${endpoint} - ${status} ${durationStr}`
      );
    }
  }

  /**
   * 성능 측정
   */
  time(label) {
    if (isDevelopment) {
      console.time(`${this.prefix} [PERF] ${label}`);
    }
  }

  timeEnd(label) {
    if (isDevelopment) {
      console.timeEnd(`${this.prefix} [PERF] ${label}`);
    }
  }

  /**
   * 테이블 형태 로그
   */
  table(data) {
    if (isDevelopment) {
      console.table(data);
    }
  }

  /**
   * 그룹 로그
   */
  group(label) {
    if (isDevelopment) {
      console.group(`${this.prefix} ${label}`);
    }
  }

  groupEnd() {
    if (isDevelopment) {
      console.groupEnd();
    }
  }

  /**
   * 에러 추적 서비스로 전송 (추후 구현)
   */
  sendToErrorTracking(message, error) {
    // TODO: Sentry, LogRocket 등 에러 추적 서비스 연동
    // 현재는 localStorage에 저장
    try {
      const errors = JSON.parse(localStorage.getItem('app_errors') || '[]');
      errors.push({
        message,
        error: error?.message,
        timestamp: new Date().toISOString(),
        url: window.location.href
      });
      // 최근 50개만 유지
      if (errors.length > 50) {
        errors.splice(0, errors.length - 50);
      }
      localStorage.setItem('app_errors', JSON.stringify(errors));
    } catch {
      // localStorage 저장 실패 시 무시
    }
  }

  /**
   * 저장된 에러 로그 조회
   */
  getStoredErrors() {
    try {
      return JSON.parse(localStorage.getItem('app_errors') || '[]');
    } catch {
      return [];
    }
  }

  /**
   * 저장된 에러 로그 삭제
   */
  clearStoredErrors() {
    localStorage.removeItem('app_errors');
  }
}

// 싱글톤 인스턴스
export const logger = new Logger();

// 편의 함수들
export const { debug, info, warn, error, api, time, timeEnd, table, group, groupEnd } = logger;

export default logger;