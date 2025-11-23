import React, { forwardRef } from 'react';

/**
 * Select 컴포넌트
 * @param {Object} props
 * @param {Array} props.options - 옵션 배열 [{value, label}]
 * @param {string} props.label - 라벨
 * @param {string} props.placeholder - 플레이스홀더
 * @param {string} props.error - 에러 메시지
 * @param {boolean} props.required - 필수 여부
 * @param {string} props.className - 추가 CSS 클래스
 */
const Select = forwardRef(({
  options = [],
  label,
  placeholder,
  error,
  required = false,
  className = '',
  ...props
}, ref) => {
  const selectClasses = `
    block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 
    shadow-sm ring-1 ring-inset ring-gray-300 
    focus:ring-2 focus:ring-inset focus:ring-primary-600 
    sm:text-sm sm:leading-6
    ${error ? 'ring-red-300 focus:ring-red-600' : ''}
    ${className}
  `;

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium leading-6 text-gray-900 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <select
        ref={ref}
        className={selectClasses}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option, index) => (
          <option key={option.value || index} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      {error && (
        <p className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
});

Select.displayName = 'Select';

export default Select;