import React, { forwardRef, useState } from 'react';

/**
 * 통합 입력 컴포넌트 - Tailwind CSS 기반
 * @param {Object} props
 * @param {string} props.label - 입력 라벨
 * @param {string} props.error - 에러 메시지
 * @param {string} props.type - 입력 타입
 * @param {boolean} props.required - 필수 입력
 * @param {boolean} props.disabled - 비활성 상태
 * @param {'sm' | 'md' | 'lg'} props.size - 입력 크기
 * @param {string} props.placeholder - 플레이스홀더
 * @param {string} props.description - 설명 텍스트
 * @param {React.ReactNode} props.leftIcon - 왼쪽 아이콘
 * @param {React.ReactNode} props.rightIcon - 오른쪽 아이콘
 * @param {string} props.className - 추가 CSS 클래스
 */
const Input = forwardRef(({
  label,
  error,
  type = 'text',
  required = false,
  disabled = false,
  size = 'md',
  placeholder,
  description,
  leftIcon,
  rightIcon,
  className = '',
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);

  const sizes = {
    sm: 'px-3 py-1.5 text-sm h-8',
    md: 'px-4 py-2 text-sm h-10',
    lg: 'px-4 py-3 text-base h-12'
  };

  const baseInputClasses = [
    'block w-full border rounded-lg transition-all duration-200',
    'placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500',
    'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
    error 
      ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
      : isFocused 
        ? 'border-orange-500 focus:border-orange-500' 
        : 'border-gray-300 focus:border-orange-500',
    sizes[size],
    leftIcon ? 'pl-10' : '',
    rightIcon ? 'pr-10' : '',
    className
  ].join(' ');

  const labelClasses = [
    'block text-sm font-medium mb-2',
    error ? 'text-red-700' : 'text-gray-700',
    disabled ? 'text-gray-400' : ''
  ].join(' ');

  const containerClasses = [
    'relative',
    leftIcon || rightIcon ? 'relative' : ''
  ].join(' ');

  const iconClasses = 'absolute top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400';
  const leftIconClasses = `${iconClasses} left-3`;
  const rightIconClasses = `${iconClasses} right-3`;

  return (
    <div className="w-full">
      {label && (
        <label className={labelClasses}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className={containerClasses}>
        {leftIcon && (
          <div className={leftIconClasses}>
            {leftIcon}
          </div>
        )}
        
        <input
          ref={ref}
          type={type}
          className={baseInputClasses}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          aria-label={label || placeholder}
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={error ? `${props.id || 'input'}-error` : description ? `${props.id || 'input'}-description` : undefined}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        
        {rightIcon && (
          <div className={rightIconClasses}>
            {rightIcon}
          </div>
        )}
      </div>

      {description && !error && (
        <p id={`${props.id || 'input'}-description`} className="mt-1 text-sm text-gray-500">{description}</p>
      )}
      
      {error && (
        <p id={`${props.id || 'input'}-error`} className="mt-1 text-sm text-red-600 flex items-center gap-1" role="alert">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;