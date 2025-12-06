import React, { forwardRef } from 'react';

/**
 * 토스 스타일 Input 컴포넌트 (캐치테이블 컬러)
 * @param {Object} props
 * @param {string} props.type - input 타입
 * @param {string} props.label - 라벨
 * @param {string} props.placeholder - 플레이스홀더
 * @param {string} props.error - 에러 메시지
 * @param {string} props.helper - 도움말 메시지
 * @param {boolean} props.required - 필수 여부
 * @param {string} props.size - 크기 (sm, md, lg)
 * @param {boolean} props.disabled - 비활성화 상태
 * @param {React.ReactNode} props.leftIcon - 왼쪽 아이콘
 * @param {React.ReactNode} props.rightIcon - 오른쪽 아이콘
 * @param {string} props.className - 추가 CSS 클래스
 */
const Input = forwardRef(({
  type = 'text',
  label,
  placeholder,
  error,
  helper,
  required = false,
  size = 'md',
  disabled = false,
  leftIcon,
  rightIcon,
  className = '',
  ...props
}, ref) => {
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm h-9',
    md: 'px-4 py-3 text-sm h-11',
    lg: 'px-5 py-4 text-base h-12'
  };

  const baseClasses = `
    block w-full rounded-lg border transition-all duration-200
    placeholder:text-gray-400 
    focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-500
    disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
    ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-300' : 'border-gray-200 hover:border-gray-300'}
    ${disabled ? 'bg-gray-50 border-gray-200' : 'bg-white'}
    ${leftIcon ? 'pl-10' : ''}
    ${rightIcon ? 'pr-10' : ''}
  `;

  const inputClasses = `${baseClasses} ${sizeClasses[size]} ${className}`;

  const Component = type === 'textarea' ? 'textarea' : 'input';

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-900 mb-2">
          {label}
          {required && <span className="text-orange-600 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <div className="text-gray-400">
              {leftIcon}
            </div>
          </div>
        )}
        
        <Component
          ref={ref}
          type={type === 'textarea' ? undefined : type}
          placeholder={placeholder}
          disabled={disabled}
          className={inputClasses}
          rows={type === 'textarea' ? 4 : undefined}
          {...props}
        />
        
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <div className="text-gray-400">
              {rightIcon}
            </div>
          </div>
        )}
      </div>
      
      {(error || helper) && (
        <div className="mt-2">
          {error && (
            <p className="text-sm text-red-600 flex items-center">
              <svg className="w-4 h-4 mr-1 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </p>
          )}
          {!error && helper && (
            <p className="text-sm text-gray-600">
              {helper}
            </p>
          )}
        </div>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;