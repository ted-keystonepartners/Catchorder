import React from 'react';
import PropTypes from 'prop-types';
import Button from './ui/Button.jsx';

/**
 * 에러 바운더리 컴포넌트
 * 하위 컴포넌트에서 발생한 에러를 캐치하고 폴백 UI를 표시
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // 다음 렌더링에서 폴백 UI가 보이도록 상태를 업데이트
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // 에러 로깅 서비스에 에러를 기록
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // 상태에 에러 정보 저장
    this.setState({
      error,
      errorInfo
    });

    // 프로덕션에서는 에러 트래킹 서비스로 전송
    if (import.meta.env.PROD) {
      // TODO: Sentry 등 에러 트래킹 서비스로 에러 전송
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      // 커스텀 폴백 UI가 제공된 경우
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }

      // 기본 폴백 UI
      return (
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="mb-4">
              <svg 
                className="w-16 h-16 text-red-500 mx-auto"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              문제가 발생했습니다
            </h1>
            
            <p className="text-gray-600 mb-6">
              예상치 못한 오류가 발생했습니다. 
              불편을 드려 죄송합니다.
            </p>

            {/* 개발 환경에서만 에러 상세 표시 */}
            {import.meta.env.DEV && this.state.error && (
              <details className="text-left mb-4 p-4 bg-red-50 rounded-lg">
                <summary className="text-sm font-medium text-red-800 cursor-pointer">
                  에러 상세 정보
                </summary>
                <pre className="mt-2 text-xs text-red-600 overflow-auto">
                  {this.state.error.toString()}
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            <div className="flex gap-3 justify-center">
              <Button 
                variant="primary"
                onClick={this.handleReset}
                ariaLabel="다시 시도"
              >
                다시 시도
              </Button>
              <Button 
                variant="ghost"
                onClick={() => window.location.href = '/'}
                ariaLabel="홈으로 이동"
              >
                홈으로
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.func,
  onReset: PropTypes.func
};

export default ErrorBoundary;