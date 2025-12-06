import React from 'react';
import PropTypes from 'prop-types';

/**
 * 통합 버튼 컴포넌트 - Tailwind CSS 기반
 * @param {Object} props
 * @param {React.ReactNode} props.children - 버튼 내용
 * @param {'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'ghost'} props.variant - 버튼 변형
 * @param {'sm' | 'md' | 'lg' | 'xl'} props.size - 버튼 크기
 * @param {boolean} props.disabled - 비활성 상태
 * @param {boolean} props.loading - 로딩 상태
 * @param {boolean} props.fullWidth - 전체 너비
 * @param {string} props.className - 추가 CSS 클래스
 */
const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  className = '',
  ariaLabel,
  ...props
}) => {
  const baseClasses = [
    'inline-flex items-center justify-center font-semibold transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-lg',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'transform hover:scale-105 active:scale-95',
    fullWidth ? 'w-full' : 'w-auto'
  ].join(' ');

  const variants = {
    primary: [
      'bg-orange-500 hover:bg-orange-600 text-white',
      'focus:ring-orange-500 shadow-md hover:shadow-lg',
      'border-2 border-orange-500 hover:border-orange-600'
    ].join(' '),
    secondary: [
      'bg-gray-500 hover:bg-gray-600 text-white',
      'focus:ring-gray-500 shadow-md hover:shadow-lg',
      'border-2 border-gray-500 hover:border-gray-600'
    ].join(' '),
    danger: [
      'bg-red-500 hover:bg-red-600 text-white',
      'focus:ring-red-500 shadow-md hover:shadow-lg',
      'border-2 border-red-500 hover:border-red-600'
    ].join(' '),
    success: [
      'bg-green-500 hover:bg-green-600 text-white',
      'focus:ring-green-500 shadow-md hover:shadow-lg',
      'border-2 border-green-500 hover:border-green-600'
    ].join(' '),
    warning: [
      'bg-yellow-500 hover:bg-yellow-600 text-white',
      'focus:ring-yellow-500 shadow-md hover:shadow-lg',
      'border-2 border-yellow-500 hover:border-yellow-600'
    ].join(' '),
    ghost: [
      'bg-transparent hover:bg-gray-50 text-gray-700',
      'focus:ring-gray-500 border-2 border-gray-300',
      'hover:border-gray-400'
    ].join(' ')
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm h-8 gap-1',
    md: 'px-4 py-2 text-sm h-10 gap-2',
    lg: 'px-6 py-3 text-base h-12 gap-2',
    xl: 'px-8 py-4 text-lg h-14 gap-3'
  };

  const classes = [
    baseClasses,
    variants[variant] || variants.primary,
    sizes[size] || sizes.md,
    className
  ].join(' ');

  const LoadingSpinner = () => (
    <svg 
      className="animate-spin h-4 w-4" 
      fill="none" 
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle 
        className="opacity-25" 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="4" 
      />
      <path 
        className="opacity-75" 
        fill="currentColor" 
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" 
      />
    </svg>
  );

  return (
    <button
      className={classes}
      disabled={disabled || loading}
      aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
      aria-busy={loading}
      aria-disabled={disabled}
      {...props}
    >
      {loading && <LoadingSpinner />}
      {children}
    </button>
  );
};

Button.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger', 'success', 'warning', 'ghost']),
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl']),
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
  fullWidth: PropTypes.bool,
  className: PropTypes.string,
  ariaLabel: PropTypes.string,
  onClick: PropTypes.func,
  type: PropTypes.oneOf(['button', 'submit', 'reset'])
};

// Props 비교 함수 - loading과 disabled만 비교
const areEqual = (prevProps, nextProps) => {
  return (
    prevProps.loading === nextProps.loading &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.variant === nextProps.variant &&
    prevProps.size === nextProps.size &&
    prevProps.children === nextProps.children
  );
};

export default React.memo(Button, areEqual);