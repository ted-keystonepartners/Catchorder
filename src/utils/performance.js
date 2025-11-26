/**
 * 성능 측정 유틸리티
 * 개발 환경에서 컴포넌트 렌더링 및 API 호출 성능 측정
 */

/**
 * 성능 측정 클래스
 */
class PerformanceMonitor {
  constructor() {
    this.measurements = new Map();
    this.isEnabled = import.meta.env.DEV; // 개발 환경에서만 활성화
  }

  /**
   * 측정 시작
   * @param {string} label - 측정 레이블
   */
  start(label) {
    if (!this.isEnabled) return;
    
    this.measurements.set(label, {
      startTime: performance.now(),
      startMemory: performance.memory ? performance.memory.usedJSHeapSize : null
    });
  }

  /**
   * 측정 종료 및 결과 출력
   * @param {string} label - 측정 레이블
   * @returns {Object} 측정 결과
   */
  end(label) {
    if (!this.isEnabled) return null;
    
    const measurement = this.measurements.get(label);
    if (!measurement) {
      console.warn(`Performance measurement '${label}' was not started`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - measurement.startTime;
    const endMemory = performance.memory ? performance.memory.usedJSHeapSize : null;
    const memoryDelta = endMemory && measurement.startMemory 
      ? endMemory - measurement.startMemory 
      : null;

    const result = {
      label,
      duration: Math.round(duration * 100) / 100, // 소수점 2자리
      memoryDelta: memoryDelta ? Math.round(memoryDelta / 1024) : null, // KB 단위
      timestamp: new Date().toISOString()
    };

    // 콘솔에 출력 (개발 환경)
    if (this.isEnabled) {
      const memoryInfo = memoryDelta !== null 
        ? `, Memory: ${memoryDelta > 0 ? '+' : ''}${result.memoryDelta} KB`
        : '';
      
      console.log(
        `⏱ Performance [${label}]: ${result.duration}ms${memoryInfo}`
      );
    }

    this.measurements.delete(label);
    return result;
  }

  /**
   * 비동기 함수 실행 시간 측정
   * @param {string} label - 측정 레이블
   * @param {Function} fn - 실행할 비동기 함수
   * @returns {Promise<any>} 함수 실행 결과
   */
  async measure(label, fn) {
    this.start(label);
    try {
      const result = await fn();
      this.end(label);
      return result;
    } catch (error) {
      this.end(label);
      throw error;
    }
  }

  /**
   * 동기 함수 실행 시간 측정
   * @param {string} label - 측정 레이블
   * @param {Function} fn - 실행할 함수
   * @returns {any} 함수 실행 결과
   */
  measureSync(label, fn) {
    this.start(label);
    try {
      const result = fn();
      this.end(label);
      return result;
    } catch (error) {
      this.end(label);
      throw error;
    }
  }

  /**
   * 모든 측정 초기화
   */
  clear() {
    this.measurements.clear();
  }

  /**
   * 현재 진행 중인 측정 목록
   * @returns {Array<string>} 측정 레이블 목록
   */
  getActiveMeasurements() {
    return Array.from(this.measurements.keys());
  }
}

/**
 * React 컴포넌트 렌더링 측정 HOC
 * @param {React.Component} Component - 측정할 컴포넌트
 * @param {string} componentName - 컴포넌트 이름
 * @returns {React.Component} 측정 기능이 추가된 컴포넌트
 */
export function withPerformance(Component, componentName) {
  if (!import.meta.env.DEV) {
    return Component;
  }

  return function PerformanceWrapper(props) {
    const renderCount = React.useRef(0);
    
    React.useEffect(() => {
      renderCount.current += 1;
      console.log(
        `🔄 Component [${componentName}] rendered ${renderCount.current} times`
      );
    });

    return <Component {...props} />;
  };
}

/**
 * API 호출 성능 측정 래퍼
 * @param {string} label - API 엔드포인트 레이블
 * @param {Function} apiCall - API 호출 함수
 * @returns {Promise<any>} API 응답
 */
export async function measureAPI(label, apiCall) {
  const monitor = performanceMonitor;
  const fullLabel = `API: ${label}`;
  
  return monitor.measure(fullLabel, apiCall);
}

/**
 * 렌더링 성능 측정 훅
 * @param {string} componentName - 컴포넌트 이름
 */
export function useRenderPerformance(componentName) {
  const renderCount = React.useRef(0);
  const lastRenderTime = React.useRef(performance.now());
  
  React.useEffect(() => {
    if (!import.meta.env.DEV) return;
    
    renderCount.current += 1;
    const currentTime = performance.now();
    const timeSinceLastRender = currentTime - lastRenderTime.current;
    
    console.log(
      `🎨 Render [${componentName}] #${renderCount.current} (${Math.round(timeSinceLastRender)}ms since last)`
    );
    
    lastRenderTime.current = currentTime;
  });
}

/**
 * 메모리 사용량 모니터링
 * @returns {Object} 메모리 사용 정보
 */
export function getMemoryInfo() {
  if (!performance.memory) {
    return null;
  }

  const info = {
    used: Math.round(performance.memory.usedJSHeapSize / 1048576), // MB
    total: Math.round(performance.memory.totalJSHeapSize / 1048576), // MB
    limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576), // MB
    percentage: Math.round(
      (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100
    )
  };

  return info;
}

/**
 * FPS 모니터링
 */
export class FPSMonitor {
  constructor() {
    this.fps = 0;
    this.frames = 0;
    this.startTime = performance.now();
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.startTime = performance.now();
    this.frames = 0;
    this.loop();
  }

  loop = () => {
    if (!this.isRunning) return;
    
    this.frames++;
    const currentTime = performance.now();
    const delta = currentTime - this.startTime;
    
    if (delta >= 1000) {
      this.fps = Math.round((this.frames * 1000) / delta);
      this.frames = 0;
      this.startTime = currentTime;
      
      if (import.meta.env.DEV) {
        console.log(`📊 FPS: ${this.fps}`);
      }
    }
    
    requestAnimationFrame(this.loop);
  };

  stop() {
    this.isRunning = false;
  }

  getFPS() {
    return this.fps;
  }
}

/**
 * Web Vitals 측정
 */
export function measureWebVitals(callback) {
  // LCP (Largest Contentful Paint)
  new PerformanceObserver((entryList) => {
    for (const entry of entryList.getEntries()) {
      callback('LCP', entry.startTime);
    }
  }).observe({ type: 'largest-contentful-paint', buffered: true });

  // FID (First Input Delay)
  new PerformanceObserver((entryList) => {
    for (const entry of entryList.getEntries()) {
      const delay = entry.processingStart - entry.startTime;
      callback('FID', delay);
    }
  }).observe({ type: 'first-input', buffered: true });

  // CLS (Cumulative Layout Shift)
  let clsValue = 0;
  new PerformanceObserver((entryList) => {
    for (const entry of entryList.getEntries()) {
      if (!entry.hadRecentInput) {
        clsValue += entry.value;
        callback('CLS', clsValue);
      }
    }
  }).observe({ type: 'layout-shift', buffered: true });
}

// 싱글톤 인스턴스
export const performanceMonitor = new PerformanceMonitor();
export const fpsMonitor = new FPSMonitor();

// 개발 환경에서 전역 접근 가능하도록
if (import.meta.env.DEV) {
  window.__performanceMonitor = performanceMonitor;
  window.__fpsMonitor = fpsMonitor;
  window.__getMemoryInfo = getMemoryInfo;
}

export default performanceMonitor;