import React from 'react';
import { getStatusColor } from '../../utils/formatter.js';

/**
 * 토스 스타일 Badge 컴포넌트 (캐치테이블 컬러)
 * @param {Object} props
 * @param {React.ReactNode} props.children - 배지 내용
 * @param {string} props.variant - 배지 스타일 (primary, success, warning, error, info, gray, status)
 * @param {string} props.statusCode - 상태 코드 (variant='status'일 때)
 * @param {string} props.size - 배지 크기 (xs, sm, md, lg)
 * @param {boolean} props.dot - 점 표시 여부
 * @param {React.ReactNode} props.icon - 아이콘
 * @param {string} props.className - 추가 CSS 클래스
 */
const Badge = ({
  children,
  variant = 'gray',
  statusCode = null,
  size = 'md',
  dot = false,
  icon,
  className = ''
}) => {
  const baseClasses = 'inline-flex items-center font-medium rounded-full transition-colors duration-200';
  
  const sizeClasses = {
    xs: 'px-2 py-0.5 text-xs',
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-sm'
  };

  const dotSizeClasses = {
    xs: 'w-1.5 h-1.5 mr-1',
    sm: 'w-1.5 h-1.5 mr-1.5',
    md: 'w-2 h-2 mr-1.5',
    lg: 'w-2 h-2 mr-2'
  };

  const iconSizeClasses = {
    xs: 'w-3 h-3 mr-1',
    sm: 'w-3 h-3 mr-1.5',
    md: 'w-4 h-4 mr-1.5',
    lg: 'w-4 h-4 mr-2'
  };

  let colorClasses = '';
  let dotColorClass = '';
  
  if (variant === 'status' && statusCode) {
    colorClasses = getStatusColor(statusCode);
    // Extract dot color from status color classes
    if (colorClasses.includes('green')) dotColorClass = 'bg-green-500';
    else if (colorClasses.includes('yellow')) dotColorClass = 'bg-yellow-500';
    else if (colorClasses.includes('red')) dotColorClass = 'bg-red-500';
    else if (colorClasses.includes('blue')) dotColorClass = 'bg-blue-500';
    else if (colorClasses.includes('orange')) dotColorClass = 'bg-orange-500';
    else dotColorClass = 'bg-gray-500';
  } else {
    // 토스 스타일 색상 시스템
    const variantColors = {
      primary: 'bg-orange-100 text-orange-800 hover:bg-orange-200',
      success: 'bg-green-100 text-green-800 hover:bg-green-200',
      warning: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
      error: 'bg-red-100 text-red-800 hover:bg-red-200',
      info: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
      gray: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    };
    
    const dotColors = {
      primary: 'bg-orange-500',
      success: 'bg-green-500',
      warning: 'bg-yellow-500',
      error: 'bg-red-500',
      info: 'bg-blue-500',
      gray: 'bg-gray-500'
    };
    
    colorClasses = variantColors[variant] || variantColors.gray;
    dotColorClass = dotColors[variant] || dotColors.gray;
  }

  return (
    <span
      className={`${baseClasses} ${sizeClasses[size]} ${colorClasses} ${className}`}
    >
      {dot && (
        <span className={`${dotSizeClasses[size]} ${dotColorClass} rounded-full flex-shrink-0`}></span>
      )}
      {icon && (
        <span className={iconSizeClasses[size]}>
          {icon}
        </span>
      )}
      {children}
    </span>
  );
};

/**
 * Status Badge 컴포넌트 (상태별 색상 자동 적용)
 */
export const StatusBadge = ({ status, children, size = 'md', ...props }) => (
  <Badge variant="status" statusCode={status} size={size} dot {...props}>
    {children}
  </Badge>
);

/**
 * Lifecycle Badge 컴포넌트 (라이프사이클별 색상 자동 적용)
 */
export const LifecycleBadge = ({ phase, size = 'md', ...props }) => {
  const variantMap = {
    'P1': 'info',
    'P2': 'warning', 
    'P3': 'primary',
    'P4': 'success'
  };
  
  return (
    <Badge variant={variantMap[phase] || 'gray'} size={size} {...props}>
      {phase}
    </Badge>
  );
};

export default Badge;