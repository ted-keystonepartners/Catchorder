import React from 'react';

const icons = {
  dashboard: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm5-18v4h3V3h-3z",
  check: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z",
  checkSimple: "M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"
};

const Icon = React.memo(({ 
  name, 
  size = 20, 
  color = 'currentColor', 
  className = '',
  ...props 
}) => {
  const path = icons[name];
  
  if (!path) {
    console.warn(`Icon "${name}" not found`);
    return null;
  }

  return (
    <svg 
      width={size} 
      height={size} 
      fill={color} 
      viewBox="0 0 24 24"
      className={className}
      {...props}
    >
      <path d={path} />
    </svg>
  );
});

Icon.displayName = 'Icon';

export default Icon;