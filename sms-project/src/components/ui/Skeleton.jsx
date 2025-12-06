import React from 'react';
import PropTypes from 'prop-types';

/**
 * 스켈레톤 로더 컴포넌트
 * 데이터 로딩 중 표시되는 플레이스홀더
 */
const Skeleton = ({ 
  className = '', 
  variant = 'text',
  width,
  height,
  animation = true,
  rounded = false
}) => {
  const baseClasses = [
    'bg-gray-200',
    animation && 'animate-pulse',
    rounded ? 'rounded-full' : 'rounded-md',
    className
  ].filter(Boolean).join(' ');

  const variantStyles = {
    text: 'h-4 w-full',
    title: 'h-8 w-3/4',
    circle: 'rounded-full',
    rect: 'rounded-md',
    card: 'h-32 w-full'
  };

  const style = {
    width: width || (variant === 'circle' ? height : undefined),
    height: height || (variant === 'circle' ? width : undefined)
  };

  return (
    <div 
      className={`${baseClasses} ${variantStyles[variant] || ''}`}
      style={style}
      aria-hidden="true"
      role="presentation"
    />
  );
};

Skeleton.propTypes = {
  className: PropTypes.string,
  variant: PropTypes.oneOf(['text', 'title', 'circle', 'rect', 'card']),
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  animation: PropTypes.bool,
  rounded: PropTypes.bool
};

/**
 * 테이블 행 스켈레톤
 */
export const TableRowSkeleton = ({ columns = 5, rows = 5 }) => {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <td key={colIndex} className="px-6 py-4">
              <Skeleton variant="text" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
};

TableRowSkeleton.propTypes = {
  columns: PropTypes.number,
  rows: PropTypes.number
};

/**
 * 카드 스켈레톤
 */
export const CardSkeleton = () => {
  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <Skeleton variant="title" />
      <Skeleton variant="text" />
      <Skeleton variant="text" width="60%" />
      <div className="flex justify-between items-center pt-4">
        <Skeleton width="100px" height="32px" />
        <Skeleton variant="circle" width="32px" height="32px" />
      </div>
    </div>
  );
};

/**
 * 리스트 스켈레톤
 */
export const ListSkeleton = ({ items = 3 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="flex items-center space-x-3">
          <Skeleton variant="circle" width="40px" height="40px" />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" />
            <Skeleton variant="text" width="60%" />
          </div>
        </div>
      ))}
    </div>
  );
};

ListSkeleton.propTypes = {
  items: PropTypes.number
};

/**
 * 폼 스켈레톤
 */
export const FormSkeleton = ({ fields = 4 }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton width="100px" height="20px" />
          <Skeleton height="40px" />
        </div>
      ))}
      <div className="flex gap-4 pt-4">
        <Skeleton width="100px" height="40px" />
        <Skeleton width="100px" height="40px" />
      </div>
    </div>
  );
};

FormSkeleton.propTypes = {
  fields: PropTypes.number
};

export default Skeleton;