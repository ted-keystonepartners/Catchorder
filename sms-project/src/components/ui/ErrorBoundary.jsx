/**
 * 에러 바운더리 컴포넌트
 */
import React from 'react';
import Button from './Button.jsx';

/**
 * 에러 바운더리 클래스 컴포넌트
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    // 에러 발생시 상태 업데이트
    return {
      hasError: true,
      errorId: Date.now().toString()
    };
  }

  componentDidCatch(error, errorInfo) {
    // 에러 로깅
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // TODO: 에러 리포팅 서비스에 전송
    // 예: Sentry, LogRocket, DataDog 등
    if (typeof window !== 'undefined') {
      // 에러 정보를 로컬 스토리지에 임시 저장 (디버깅용)
      try {
        const errorLog = {
          timestamp: new Date().toISOString(),
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack
          },
          errorInfo: {
            componentStack: errorInfo.componentStack
          },
          url: window.location.href,
          userAgent: window.navigator.userAgent
        };
        
        localStorage.setItem(`error_log_${Date.now()}`, JSON.stringify(errorLog));
      } catch (logError) {
        console.error('Failed to log error:', logError);
      }
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
  };

  handleRefresh = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={this.handleReset}
          onRefresh={this.handleRefresh}
          errorId={this.state.errorId}
          fallbackComponent={this.props.fallback}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * 에러 폴백 컴포넌트
 */
const ErrorFallback = ({ 
  error, 
  errorInfo, 
  onReset, 
  onRefresh, 
  errorId,
  fallbackComponent 
}) => {
  const [showDetails, setShowDetails] = React.useState(false);

  // 커스텀 폴백 컴포넌트가 있으면 사용
  if (fallbackComponent) {
    return React.createElement(fallbackComponent, {
      error,
      errorInfo,
      onReset,
      onRefresh,
      errorId
    });
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#fafafa',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '0 16px'
    }}>
      <div style={{
        maxWidth: '400px',
        width: '100%',
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
        padding: '32px',
        textAlign: 'center'
      }}>
        {/* 에러 아이콘 */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{
            margin: '0 auto',
            width: '64px',
            height: '64px',
            backgroundColor: '#fef2f2',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg 
              style={{ width: '32px', height: '32px', color: '#dc2626' }}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L5.082 16.5c-.77.833.192 2.5 1.732 2.5z" 
              />
            </svg>
          </div>
        </div>

        {/* 메인 메시지 */}
        <h1 style={{
          fontSize: '24px',
          fontWeight: '700',
          color: '#111827',
          marginBottom: '16px',
          margin: '0 0 16px 0'
        }}>
          문제가 발생했습니다
        </h1>
        
        <p style={{
          color: '#6b7280',
          marginBottom: '24px',
          lineHeight: '1.6'
        }}>
          예기치 않은 오류가 발생했습니다.<br />
          잠시 후 다시 시도해 주세요.
        </p>

        {/* 액션 버튼 */}
        <div style={{ marginBottom: '24px' }}>
          <button
            onClick={onReset}
            style={{
              width: '100%',
              padding: '12px 16px',
              backgroundColor: '#FF3D00',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              marginBottom: '12px',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#E65100'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#FF3D00'}
          >
            다시 시도
          </button>
          
          <button
            onClick={onRefresh}
            style={{
              width: '100%',
              padding: '12px 16px',
              backgroundColor: 'transparent',
              color: '#6b7280',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = '#f9fafb';
              e.target.style.color = '#374151';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.color = '#6b7280';
            }}
          >
            페이지 새로고침
          </button>
        </div>

        {/* 에러 상세 정보 토글 */}
        <div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            style={{
              fontSize: '14px',
              color: '#9ca3af',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              transition: 'color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.color = '#6b7280'}
            onMouseOut={(e) => e.target.style.color = '#9ca3af'}
          >
            {showDetails ? '에러 상세 정보 숨기기' : '에러 상세 정보 보기'}
          </button>

          {showDetails && (
            <div style={{
              marginTop: '16px',
              padding: '16px',
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              textAlign: 'left'
            }}>
              <div style={{ marginBottom: '12px' }}>
                <h3 style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#111827',
                  marginBottom: '4px'
                }}>
                  에러 ID
                </h3>
                <code style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  fontFamily: 'monospace'
                }}>
                  {errorId}
                </code>
              </div>

              {error && (
                <div style={{ marginBottom: '12px' }}>
                  <h3 style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#111827',
                    marginBottom: '4px'
                  }}>
                    에러 메시지
                  </h3>
                  <code style={{
                    fontSize: '12px',
                    color: '#dc2626',
                    fontFamily: 'monospace',
                    wordBreak: 'break-all'
                  }}>
                    {error.toString()}
                  </code>
                </div>
              )}

              {error?.stack && (
                <div style={{ marginBottom: '12px' }}>
                  <h3 style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#111827',
                    marginBottom: '4px'
                  }}>
                    스택 트레이스
                  </h3>
                  <pre style={{
                    fontSize: '12px',
                    color: '#6b7280',
                    fontFamily: 'monospace',
                    backgroundColor: '#f3f4f6',
                    padding: '8px',
                    borderRadius: '4px',
                    overflow: 'auto',
                    maxHeight: '128px'
                  }}>
                    {error.stack}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 지원 정보 */}
        <div style={{
          marginTop: '24px',
          paddingTop: '24px',
          borderTop: '1px solid #e5e7eb'
        }}>
          <p style={{
            fontSize: '12px',
            color: '#9ca3af',
            lineHeight: '1.5'
          }}>
            문제가 계속 발생하면 고객지원팀에 문의해 주세요.<br />
            에러 ID를 함께 알려주시면 빠른 해결이 가능합니다.
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * Hook 방식 에러 바운더리 (React 19+)
 */
export const useErrorBoundary = () => {
  const [error, setError] = React.useState(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error) => {
    setError(error);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return {
    captureError,
    resetError
  };
};

/**
 * 비동기 에러 캐치 헬퍼
 */
export const withAsyncErrorBoundary = (asyncFn) => {
  return async (...args) => {
    try {
      return await asyncFn(...args);
    } catch (error) {
      // 에러를 Error Boundary로 전파
      console.error('Async error caught:', error);
      throw error;
    }
  };
};

/**
 * 간단한 에러 바운더리 래퍼
 */
export const SafeComponent = ({ children, fallback }) => (
  <ErrorBoundary fallback={fallback}>
    {children}
  </ErrorBoundary>
);

export default ErrorBoundary;