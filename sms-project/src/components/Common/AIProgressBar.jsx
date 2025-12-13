import React, { useState, useEffect, useRef, useCallback } from 'react';

// 메시지 프리셋
const MESSAGE_PRESETS = {
  menuExtract: [
    { range: [0, 20], message: '📝 이미지 분석 중...' },
    { range: [20, 40], message: '🔍 텍스트 인식 중...' },
    { range: [40, 60], message: '💰 가격 추출 중...' },
    { range: [60, 80], message: '📊 카테고리 분류 중...' },
    { range: [80, 100], message: '✨ 마무리 중...' }
  ],
  menuPhoto: [
    { range: [0, 30], message: '📷 이미지 분석 중...' },
    { range: [30, 60], message: '🎨 스타일 처리 중...' },
    { range: [60, 85], message: '🖼️ 고급화 작업 중...' },
    { range: [85, 100], message: '✨ 마무리 중...' }
  ],
  storeMapping: [
    { range: [0, 25], message: '📋 데이터 준비 중...' },
    { range: [25, 50], message: '🔍 매장명 분석 중...' },
    { range: [50, 75], message: '🔗 매칭 작업 중...' },
    { range: [75, 100], message: '✨ 마무리 중...' }
  ],
  chat: [
    { range: [0, 30], message: '💭 질문 분석 중...' },
    { range: [30, 60], message: '🔍 데이터 조회 중...' },
    { range: [60, 85], message: '📝 답변 생성 중...' },
    { range: [85, 100], message: '✨ 마무리 중...' }
  ],
  default: [
    { range: [0, 40], message: '⏳ 처리 중...' },
    { range: [40, 80], message: '🔄 분석 중...' },
    { range: [80, 100], message: '✨ 마무리 중...' }
  ]
};

// 프로그레스 바 컴포넌트
export const AIProgressBar = ({ 
  preset = 'default',
  showPercent = true,
  showMessage = true,
  className = ''
}) => {
  const { progress, message, isIndeterminate } = useAIProgressStore();
  const messages = MESSAGE_PRESETS[preset] || MESSAGE_PRESETS.default;
  
  const getCurrentMessage = () => {
    if (!showMessage) return '';
    if (message) return message; // 커스텀 메시지가 있으면 우선
    
    for (const { range, message: rangeMessage } of messages) {
      if (progress >= range[0] && progress < range[1]) {
        return rangeMessage;
      }
    }
    return messages[messages.length - 1].message;
  };

  return (
    <div className={className}>
      {/* 상태 메시지와 퍼센트 */}
      {(showMessage || showPercent) && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            {/* AI 아이콘 */}
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #FF3D00 0%, #FF6B00 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'pulse 2s infinite',
              boxShadow: '0 2px 8px rgba(255, 61, 0, 0.3)'
            }}>
              <svg width="20" height="20" fill="white" viewBox="0 0 24 24" style={{
                animation: 'spin 3s linear infinite'
              }}>
                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
              </svg>
            </div>
            
            {/* 메시지 */}
            {showMessage && (
              <div>
                <p style={{
                  fontSize: '15px',
                  fontWeight: '700',
                  color: '#111827',
                  marginBottom: '4px'
                }}>
                  AI가 작업하고 있어요
                </p>
                <p style={{
                  fontSize: '13px',
                  color: '#374151',
                  fontWeight: '500'
                }}>
                  {getCurrentMessage()}
                </p>
              </div>
            )}
          </div>
          
          {/* 퍼센트 */}
          {showPercent && !isIndeterminate && (
            <div style={{
              fontSize: '20px',
              fontWeight: '700',
              color: '#FF3D00',
              minWidth: '50px',
              textAlign: 'right'
            }}>
              {Math.round(progress)}%
            </div>
          )}
        </div>
      )}

      {/* 프로그레스 바 */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '8px',
        backgroundColor: '#f3f4f6',
        borderRadius: '4px',
        overflow: 'hidden',
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)'
      }}>
        {/* 배경 shimmer 애니메이션 (항상) */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(90deg, transparent, rgba(255,61,0,0.1), transparent)',
          animation: 'shimmer 2s infinite linear'
        }}/>
        
        {/* 실제 프로그레스 바 */}
        {!isIndeterminate ? (
          // 확정 모드
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #FF3D00, #FF6B00)',
            borderRadius: '4px',
            transition: 'width 0.3s ease-out',
            boxShadow: '0 1px 2px rgba(255, 61, 0, 0.4)',
            position: 'relative'
          }}>
            {/* 상단 하이라이트 */}
            <div style={{
              position: 'absolute',
              top: '1px',
              left: '2px',
              right: '2px',
              height: '2px',
              background: 'rgba(255,255,255,0.5)',
              borderRadius: '2px'
            }}/>
          </div>
        ) : (
          // 불확정 모드 (85% 이후)
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent 0%, #FF3D00 25%, #FF6B00 50%, #FF3D00 75%, transparent 100%)',
            backgroundSize: '200% 100%',
            animation: 'indeterminate 1.5s linear infinite'
          }}/>
        )}
      </div>

      {/* CSS 애니메이션 */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(0.95); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes shimmer {
          from { transform: translateX(-100%); }
          to { transform: translateX(200%); }
        }
        @keyframes indeterminate {
          from { background-position: 200% 0; }
          to { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
};

// 전역 상태 관리 (간단한 구현)
let progressStore = {
  progress: 0,
  message: '',
  isRunning: false,
  isIndeterminate: false,
  listeners: new Set()
};

const notifyListeners = () => {
  progressStore.listeners.forEach(listener => listener());
};

// Custom Hook
export const useAIProgress = () => {
  const [, forceUpdate] = useState({});
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    const listener = () => forceUpdate({});
    progressStore.listeners.add(listener);
    return () => progressStore.listeners.delete(listener);
  }, []);

  const start = useCallback((preset = 'default', customMessage = '') => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    startTimeRef.current = Date.now();
    progressStore.progress = 0;
    progressStore.message = customMessage;
    progressStore.isRunning = true;
    progressStore.isIndeterminate = false;
    notifyListeners();

    // 로그 커브 진행
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min(85, 85 * (1 - Math.exp(-elapsed / 12000)));
      
      progressStore.progress = progress;
      
      // 85%에 도달하면 불확정 모드로 전환
      if (progress >= 84.5) {
        progressStore.isIndeterminate = true;
        clearInterval(intervalRef.current);
      }
      
      notifyListeners();
    }, 100);
  }, []);

  const complete = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    progressStore.progress = 100;
    progressStore.isIndeterminate = false;
    notifyListeners();

    // 0.5초 후 자동 리셋
    setTimeout(() => {
      progressStore.isRunning = false;
      progressStore.progress = 0;
      progressStore.message = '';
      notifyListeners();
    }, 500);
  }, []);

  const reset = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    progressStore.progress = 0;
    progressStore.message = '';
    progressStore.isRunning = false;
    progressStore.isIndeterminate = false;
    notifyListeners();
  }, []);

  const setMessage = useCallback((message) => {
    progressStore.message = message;
    notifyListeners();
  }, []);

  return {
    progress: progressStore.progress,
    message: progressStore.message,
    isRunning: progressStore.isRunning,
    isIndeterminate: progressStore.isIndeterminate,
    start,
    complete,
    reset,
    setMessage
  };
};

// 내부 스토어 접근용 (컴포넌트에서 사용)
const useAIProgressStore = () => {
  const [, forceUpdate] = useState({});

  useEffect(() => {
    const listener = () => forceUpdate({});
    progressStore.listeners.add(listener);
    return () => progressStore.listeners.delete(listener);
  }, []);

  return progressStore;
};