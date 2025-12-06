import React from 'react';

/**
 * 토스 스타일 Card 컴포넌트 (캐치테이블 컬러)
 * @param {Object} props
 * @param {React.ReactNode} props.children - 카드 내용
 * @param {string} props.variant - 카드 스타일 (default, elevated, outlined, gradient)
 * @param {string} props.padding - 패딩 크기 (none, sm, md, lg)
 * @param {boolean} props.hoverable - 호버 효과 활성화
 * @param {Function} props.onClick - 클릭 핸들러
 * @param {string} props.className - 추가 CSS 클래스
 */
const Card = ({
  children,
  variant = 'default',
  padding = 'md',
  hoverable = false,
  onClick,
  className = '',
  ...props
}) => {
  const baseClasses = 'rounded-xl transition-all duration-200 border';

  const variantClasses = {
    default: 'bg-white border-gray-100 shadow-sm',
    elevated: 'bg-white border-gray-100 shadow-lg',
    outlined: 'bg-white border-gray-200 shadow-none',
    gradient: 'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 shadow-orange'
  };

  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  const hoverClasses = hoverable ? 'hover:shadow-lg hover:-translate-y-0.5 cursor-pointer' : '';

  return (
    <div
      onClick={onClick}
      className={`${baseClasses} ${variantClasses[variant]} ${paddingClasses[padding]} ${hoverClasses} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * Card Header 컴포넌트
 */
export const CardHeader = ({ children, className = '' }) => (
  <div className={`border-b border-gray-100 pb-4 mb-6 ${className}`}>
    {children}
  </div>
);

/**
 * Card Title 컴포넌트
 */
export const CardTitle = ({ children, className = '' }) => (
  <h3 className={`text-lg font-semibold text-gray-900 ${className}`}>
    {children}
  </h3>
);

/**
 * Card Content 컴포넌트
 */
export const CardContent = ({ children, className = '' }) => (
  <div className={`${className}`}>
    {children}
  </div>
);

/**
 * Card Footer 컴포넌트
 */
export const CardFooter = ({ children, className = '' }) => (
  <div className={`border-t border-gray-100 pt-4 mt-6 ${className}`}>
    {children}
  </div>
);

export default Card;