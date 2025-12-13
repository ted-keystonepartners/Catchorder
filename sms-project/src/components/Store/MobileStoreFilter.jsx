import React from 'react';

const MobileStoreFilter = ({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  dateType,
  setDateType,
  dateFilter,
  setDateFilter,
  ownerFilter,
  setOwnerFilter,
  managers,
  isAdmin
}) => {
  // 상태 옵션
  const statusOptions = [
    { value: 'all', label: '전체 상태' },
    { value: 'PRE_INTRODUCTION', label: '방문대기' },
    { value: 'VISIT_COMPLETED', label: '방문완료' },
    { value: 'REVISIT_SCHEDULED', label: '재방문예정' },
    { value: 'INFO_REQUEST', label: '추가정보요청' },
    { value: 'REMOTE_INSTALL_SCHEDULED', label: '에이전트설치예정' },
    { value: 'ADMIN_SETTING', label: '어드민셋팅' },
    { value: 'QR_LINKING', label: 'POS연동예정' },
    { value: 'QR_MENU_ONLY', label: 'QR메뉴만 사용' },
    { value: 'DEFECT_REPAIR', label: '하자보수중' },
    { value: 'QR_MENU_INSTALL', label: '최종설치완료' },
    { value: 'SERVICE_TERMINATED', label: '서비스해지' },
    { value: 'UNUSED_TERMINATED', label: '미이용해지' },
    { value: 'PENDING', label: '보류' }
  ];

  // 날짜 타입 옵션
  const dateTypeOptions = [
    { value: 'created_at', label: '등록일' },
    { value: 'updated_at', label: '최근수정일' }
  ];

  // 필터 초기화
  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDateFilter('all');
    setDateType('created_at');
    if (setOwnerFilter) setOwnerFilter('all');
  };

  return (
    <div style={{ 
      padding: '16px',
      backgroundColor: 'white',
      borderBottom: '1px solid #e5e7eb'
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* 모바일 검색창 */}
        <div style={{ position: 'relative' }}>
          <div style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 1
          }}>
            <svg width="18" height="18" fill="none" stroke="#9ca3af" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="매장명, 전화번호, 주소 검색"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: '38px',
              paddingRight: '12px',
              paddingTop: '10px',
              paddingBottom: '10px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => e.target.style.borderColor = '#FF3D00'}
            onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
          />
        </div>
        
        {/* 모바일 필터 드롭다운 - 한 줄에 나란히 */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {/* 상태 필터 */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              flex: 1,
              padding: '10px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px',
              backgroundColor: 'white',
              outline: 'none',
              cursor: 'pointer',
              minHeight: '44px',
              color: '#374151'
            }}
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* 정렬 필터 */}
          <select
            value={dateType}
            onChange={(e) => setDateType(e.target.value)}
            style={{
              flex: 1,
              padding: '10px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px',
              backgroundColor: 'white',
              outline: 'none',
              cursor: 'pointer',
              minHeight: '44px',
              color: '#374151'
            }}
          >
            {dateTypeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* 초기화 버튼 */}
          <button
            onClick={handleResetFilters}
            title="필터 초기화"
            style={{
              padding: '10px',
              backgroundColor: '#f9fafb',
              color: '#6b7280',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '44px',
              minWidth: '44px'
            }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* 담당자 필터 - 관리자만 */}
        {isAdmin && managers && managers.length > 0 && (
          <select
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px',
              backgroundColor: 'white',
              outline: 'none',
              cursor: 'pointer',
              minHeight: '44px',
              color: '#374151'
            }}
          >
            <option value="all">전체 담당자</option>
            <option value="unassigned">미배정</option>
            {managers.map((manager) => (
              <option key={manager.email} value={manager.email}>
                {manager.name}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
};

export default MobileStoreFilter;