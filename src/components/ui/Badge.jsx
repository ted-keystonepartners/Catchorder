import React from 'react';
import PropTypes from 'prop-types';

/**
 * Badge 컴포넌트 - 상태나 카운트를 표시하는 작은 라벨
 * React.memo로 최적화됨
 */
const Badge = ({
  children,
  variant = 'default',
  size = 'md',
  rounded = false,
  className = '',
  ...props
}) => {
  const baseClasses = [
    'inline-flex items-center justify-center font-medium',
    'transition-colors duration-200',
    rounded ? 'rounded-full' : 'rounded-md'
  ].join(' ');

  const variants = {
    default: 'bg-gray-100 text-gray-800',
    primary: 'bg-orange-100 text-orange-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
    dark: 'bg-gray-800 text-white'
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base'
  };

  const classes = [
    baseClasses,
    variants[variant] || variants.default,
    sizes[size] || sizes.md,
    className
  ].join(' ');

  return (
    <span className={classes} {...props}>
      {children}
    </span>
  );
};

Badge.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['default', 'primary', 'success', 'warning', 'danger', 'info', 'dark']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  rounded: PropTypes.bool,
  className: PropTypes.string
};

// Badge는 순수 표시 컴포넌트이므로 props가 같으면 리렌더링 불필요
export default React.memo(Badge);