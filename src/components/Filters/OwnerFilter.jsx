import React from 'react';
import Select from '../Common/Select.jsx';
import { mockUsers } from '../../api/mockData.js';
import { useAuth } from '../../hooks/useAuth.js';

/**
 * OwnerFilter 컴포넌트 - 담당자 필터
 * @param {Object} props
 * @param {string} props.value - 선택된 담당자 ID
 * @param {Function} props.onChange - 변경 핸들러
 */
const OwnerFilter = ({ value, onChange }) => {
  const { isAdmin } = useAuth();

  // 옵션 생성
  const options = [
    { value: '', label: '전체 담당자' }
  ];

  // 관리자는 모든 담당자를 볼 수 있음
  if (isAdmin()) {
    mockUsers.forEach(user => {
      options.push({
        value: user.id,
        label: `${user.name} (${user.role === 'ADMIN' ? '관리자' : '일반'})`
      });
    });
    
    // 미배정 옵션 추가
    options.push({
      value: 'unassigned',
      label: '미배정'
    });
  }

  return (
    <Select
      label="담당자"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      options={options}
      placeholder="담당자 선택"
    />
  );
};

export default OwnerFilter;