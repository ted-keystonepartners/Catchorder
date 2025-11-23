import React from 'react';

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

export default Card;