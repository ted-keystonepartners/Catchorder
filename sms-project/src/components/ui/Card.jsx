import React from 'react';
import PropTypes from 'prop-types';

/**
 * Card 컴포넌트 - 콘텐츠를 담는 카드 컨테이너
 * React.memo로 최적화됨
 */
const Card = ({
  children,
  className = '',
  padding = true,
  ...props
}) => {
  const classes = [
    'bg-white border border-gray-200 rounded-lg',
    padding ? 'p-6' : '',
    className
  ].join(' ');

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};

Card.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  padding: PropTypes.bool
};

// Card는 단순 컨테이너이므로 props 변경이 적음
export default React.memo(Card);