import React from 'react';
import Button from './Button.jsx';

/**
 * Error 컴포넌트
 * @param {Object} props
 * @param {string} props.message - 에러 메시지
 * @param {Function} props.onRetry - 재시도 콜백
 * @param {boolean} props.showRetry - 재시도 버튼 표시 여부
 * @param {string} props.className - 추가 CSS 클래스
 */
const Error = ({
  message = '오류가 발생했습니다.',
  onRetry,
  showRetry = true,
  className = ''
}) => {
  return (
    <div className={`text-center py-12 ${className}`}>
      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
        <svg
          className="h-6 w-6 text-red-600"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      </div>
      
      <h3 className="mt-4 text-sm font-medium text-gray-900">
        문제가 발생했습니다
      </h3>
      
      <p className="mt-2 text-sm text-gray-500">
        {message}
      </p>
      
      {showRetry && onRetry && (
        <div className="mt-6">
          <Button
            onClick={onRetry}
            variant="outline"
            size="sm"
          >
            다시 시도
          </Button>
        </div>
      )}
    </div>
  );
};

export default Error;