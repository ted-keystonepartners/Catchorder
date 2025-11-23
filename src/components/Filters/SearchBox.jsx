import React, { useState, useEffect, useCallback } from 'react';
import Input from '../Common/Input.jsx';

/**
 * SearchBox 컴포넌트 - 검색창 with debounce
 * @param {Object} props
 * @param {string} props.value - 검색값
 * @param {Function} props.onChange - 검색값 변경 핸들러
 * @param {string} props.placeholder - 플레이스홀더
 * @param {number} props.debounceMs - debounce 시간 (밀리초)
 */
const SearchBox = ({
  value = '',
  onChange,
  placeholder = '검색어를 입력하세요',
  debounceMs = 500
}) => {
  const [searchValue, setSearchValue] = useState(value);

  // debounce 처리
  const debouncedOnChange = useCallback(
    debounceMs > 0 ? debounce(onChange, debounceMs) : onChange,
    [onChange, debounceMs]
  );

  // 외부에서 value가 변경되면 내부 상태 업데이트
  useEffect(() => {
    setSearchValue(value);
  }, [value]);

  // 검색값 변경 핸들러
  const handleChange = (e) => {
    const newValue = e.target.value;
    setSearchValue(newValue);
    debouncedOnChange(newValue);
  };

  // 검색 초기화
  const handleClear = () => {
    setSearchValue('');
    onChange('');
  };

  return (
    <div className="relative">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg
            className="h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        
        <Input
          type="text"
          value={searchValue}
          onChange={handleChange}
          placeholder={placeholder}
          className="pl-10 pr-10"
        />
        
        {searchValue && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <button
              type="button"
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Debounce 함수
 * @param {Function} func - 실행할 함수
 * @param {number} wait - 대기 시간 (밀리초)
 * @returns {Function}
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export default SearchBox;