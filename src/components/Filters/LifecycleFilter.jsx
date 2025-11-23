import React from 'react';
import Select from '../Common/Select.jsx';
import { LIFECYCLE } from '../../utils/constants.js';

/**
 * LifecycleFilter 컴포넌트 - 라이프사이클 필터
 * @param {Object} props
 * @param {string} props.value - 선택된 라이프사이클
 * @param {Function} props.onChange - 변경 핸들러
 */
const LifecycleFilter = ({ value, onChange }) => {
  const options = [
    { value: '', label: '전체 라이프사이클' },
    ...Object.values(LIFECYCLE).map(lifecycle => ({
      value: lifecycle.code,
      label: lifecycle.label
    }))
  ];

  return (
    <Select
      label="라이프사이클"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      options={options}
      placeholder="라이프사이클 선택"
    />
  );
};

export default LifecycleFilter;