/**
 * 매장 필터 패널 컴포넌트
 */
import React from 'react';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';

/**
 * 매장 필터 패널
 * @param {Object} props
 * @param {string} props.searchTerm - 검색어
 * @param {Function} props.setSearchTerm - 검색어 설정
 * @param {string} props.statusFilter - 상태 필터
 * @param {Function} props.setStatusFilter - 상태 필터 설정
 * @param {string} props.dateFilter - 날짜 필터
 * @param {Function} props.setDateFilter - 날짜 필터 설정
 * @param {string} props.regionFilter - 지역 필터
 * @param {Function} props.setRegionFilter - 지역 필터 설정
 * @param {string} props.districtFilter - 구역 필터
 * @param {Function} props.setDistrictFilter - 구역 필터 설정
 * @param {string} props.viewMode - 보기 모드
 * @param {Function} props.setViewMode - 보기 모드 설정
 * @param {boolean} props.isAdmin - 관리자 여부
 * @param {Function} props.onAddStore - 매장 추가 핸들러
 * @param {Function} props.onBulkUpload - 일괄 업로드 핸들러
 * @param {Function} props.onExport - 내보내기 핸들러
 */
const StoreFilterPanel = ({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  dateFilter,
  setDateFilter,
  regionFilter,
  setRegionFilter,
  districtFilter,
  setDistrictFilter,
  viewMode,
  setViewMode,
  isAdmin,
  onAddStore,
  onBulkUpload,
  onExport
}) => {
  // 상태 옵션
  const statusOptions = [
    { value: 'all', label: '전체 상태' },
    { value: 'CONTACT_PENDING', label: '연락 대기' },
    { value: 'CONTACT_COMPLETED', label: '연락 완료' },
    { value: 'PROPOSAL_SENT', label: '제안서 발송' },
    { value: 'UNDER_REVIEW', label: '검토 중' },
    { value: 'ADOPTION_CONFIRMED', label: '도입 확정' },
    { value: 'SIGNUP_COMPLETED', label: '가입 완료' },
    { value: 'INSTALLATION_PENDING', label: '설치 대기' },
    { value: 'SERVICE_ACTIVE', label: '서비스 활성' },
    { value: 'PAUSED', label: '일시 중지' },
    { value: 'CANCELLED', label: '해지' },
    { value: 'REJECTED', label: '거절' }
  ];

  // 날짜 옵션
  const dateOptions = [
    { value: 'all', label: '전체 기간' },
    { value: 'today', label: '오늘' },
    { value: 'week', label: '이번 주' },
    { value: 'month', label: '이번 달' }
  ];

  // 지역 옵션
  const regionOptions = [
    { value: 'all', label: '전체 지역' },
    { value: '강남구', label: '강남구' },
    { value: '서초구', label: '서초구' },
    { value: '송파구', label: '송파구' },
    { value: '광진구', label: '광진구' },
    { value: '마포구', label: '마포구' }
  ];

  // 구역 옵션
  const districtOptions = [
    { value: 'all', label: '전체 구' },
    { value: '역삼동', label: '역삼동' },
    { value: '서초동', label: '서초동' },
    { value: '잠실동', label: '잠실동' },
    { value: '건대입구', label: '건대입구' },
    { value: '홍대', label: '홍대' }
  ];

  // 필터 초기화
  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDateFilter('all');
    setRegionFilter('all');
    setDistrictFilter('all');
  };

  // Select 컴포넌트
  const Select = ({ value, onChange, options, placeholder }) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white"
    >
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );

  // 검색 아이콘
  const SearchIcon = () => (
    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );

  // 뷰 모드 아이콘
  const TableIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 6h18M3 14h18M3 18h18" />
    </svg>
  );

  const CardIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  );

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '16px',
      padding: '24px',
      border: '1px solid #e5e7eb',
      marginBottom: '24px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
    }}>
      {/* 제목 영역 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '12px'
      }}>
        <div style={{
          width: '24px',
          height: '24px',
          backgroundColor: '#f97316',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <svg width="14" height="14" fill="white" viewBox="0 0 24 24">
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <h2 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#111827',
          margin: 0
        }}>
          매장 검색
        </h2>
      </div>

      {/* 액션 버튼들 */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-start',
        gap: '12px',
        marginBottom: '12px'
      }}>
        {isAdmin && (
          <>
            <button
              onClick={onExport}
              style={{
                padding: '8px 16px',
                backgroundColor: '#f9fafb',
                color: '#374151',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#f3f4f6'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#f9fafb'}
            >
              내보내기
            </button>
            <button
              onClick={onBulkUpload}
              style={{
                padding: '8px 16px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#4b5563'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#6b7280'}
            >
              일괄 업로드
            </button>
            <button
              onClick={onAddStore}
              style={{
                padding: '8px 16px',
                backgroundColor: '#f97316',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#ea580c'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#f97316'}
            >
              <svg width="16" height="16" fill="white" viewBox="0 0 24 24">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
              매장 추가
            </button>
          </>
        )}
      </div>

      {/* 필터 영역 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: window.innerWidth < 768 ? '1fr auto' : window.innerWidth < 1024 ? 'repeat(2, 1fr) auto' : '2fr 1fr 1fr 1fr auto',
        gap: '16px',
        alignItems: 'center'
      }}>
        {/* 검색 */}
        <div>
          <div style={{ position: 'relative' }}>
            <div style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 1
            }}>
              <svg width="20" height="20" fill="none" stroke="#9ca3af" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="매장명, 전화번호, 주소로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                paddingLeft: '40px',
                paddingRight: '12px',
                paddingTop: '8px',
                paddingBottom: '8px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#f97316'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>
        </div>

        {/* 상태 필터 */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px',
              backgroundColor: 'white',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* 지역 필터 */}
        <div>
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px',
              backgroundColor: 'white',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            {regionOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* 날짜 필터 */}
        <div>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px',
              backgroundColor: 'white',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            {dateOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* 필터 초기화 아이콘 */}
        <button
          onClick={handleResetFilters}
          title="필터 초기화"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            padding: '0',
            backgroundColor: 'transparent',
            color: '#6b7280',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = '#f9fafb';
            e.target.style.color = '#374151';
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = 'transparent';
            e.target.style.color = '#6b7280';
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default StoreFilterPanel;