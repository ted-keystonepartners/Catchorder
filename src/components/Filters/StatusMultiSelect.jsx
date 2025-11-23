import React, { useState } from 'react';
import { STORE_STATUS } from '../../utils/constants.js';
import { getStatusLabel } from '../../utils/formatter.js';

/**
 * StatusMultiSelect 컴포넌트 - 상태값 멀티 셀렉트
 * @param {Object} props
 * @param {Array<string>} props.value - 선택된 상태들
 * @param {Function} props.onChange - 변경 핸들러
 */
const StatusMultiSelect = ({ value = [], onChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const statusOptions = Object.keys(STORE_STATUS).map(status => ({
    value: status,
    label: getStatusLabel(status),
    color: STORE_STATUS[status].color
  }));

  const handleToggle = (statusValue) => {
    let newValue;
    if (value.includes(statusValue)) {
      newValue = value.filter(v => v !== statusValue);
    } else {
      newValue = [...value, statusValue];
    }
    onChange(newValue);
  };

  const handleSelectAll = () => {
    if (value.length === statusOptions.length) {
      onChange([]);
    } else {
      onChange(statusOptions.map(option => option.value));
    }
  };

  const getDisplayText = () => {
    if (value.length === 0) return '상태 선택';
    if (value.length === 1) return getStatusLabel(value[0]);
    return `${value.length}개 상태 선택됨`;
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium leading-6 text-gray-900 mb-2">
        상태
      </label>
      
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 sm:text-sm sm:leading-6"
        >
          <span className="block truncate">{getDisplayText()}</span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <svg
              className={`h-5 w-5 text-gray-400 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 3a.75.75 0 01.55.24l3.25 3.5a.75.75 0 11-1.1 1.02L10 4.852 7.3 7.76a.75.75 0 01-1.1-1.02l3.25-3.5A.75.75 0 0110 3zm-3.76 9.2a.75.75 0 011.06.04L10 14.148l2.7-1.908a.75.75 0 111.1 1.02l-3.25 3.5a.75.75 0 01-1.1 0l-3.25-3.5a.75.75 0 01.04-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        </button>

        {isOpen && (
          <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
            {/* 전체 선택/해제 */}
            <div className="px-3 py-2 border-b border-gray-100">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={value.length === statusOptions.length}
                  onChange={handleSelectAll}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  전체 선택/해제
                </span>
              </label>
            </div>

            {/* 개별 옵션들 */}
            {statusOptions.map((option) => (
              <div key={option.value} className="px-3 py-2 hover:bg-gray-50">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={value.includes(option.value)}
                    onChange={() => handleToggle(option.value)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    {option.label}
                  </span>
                </label>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 선택된 항목들 표시 */}
      {value.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {value.map((statusValue) => (
            <span
              key={statusValue}
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${STORE_STATUS[statusValue]?.color || 'bg-gray-100 text-gray-800'}`}
            >
              {getStatusLabel(statusValue)}
              <button
                type="button"
                onClick={() => handleToggle(statusValue)}
                className="ml-1 text-xs hover:text-gray-600"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default StatusMultiSelect;