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
 * @param {string} props.dateType - 날짜 타입 (created_at/updated_at)
 * @param {Function} props.setDateType - 날짜 타입 설정
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
  dateType,
  setDateType,
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
    { value: 'VISIT_PENDING', label: '방문대기' },
    { value: 'VISIT_COMPLETED', label: '방문완료' },
    { value: 'REVISIT_SCHEDULED', label: '재방문예정' },
    { value: 'INFO_REQUEST', label: '추가정보요청' },
    { value: 'REMOTE_INSTALL_SCHEDULED', label: '에이전트설치예정' },
    { value: 'ADMIN_SETTING', label: '어드민셋팅' },
    { value: 'QR_LINKING', label: 'POS연동예정' },
    { value: 'DEFECT_REPAIR', label: '하자보수중' },
    { value: 'QR_MENU_INSTALL', label: '최종설치완료' },
    { value: 'SERVICE_TERMINATED', label: '서비스해지' },
    { value: 'UNUSED_TERMINATED', label: '미이용해지' },
    { value: 'PENDING', label: '보류' }
  ];

  // 날짜 옵션
  const dateOptions = [
    { value: 'all', label: '전체 기간' },
    { value: 'today', label: '오늘' },
    { value: 'week', label: '이번 주' },
    { value: 'month', label: '이번 달' }
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
  };

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
        justifyContent: 'space-between',
        marginBottom: '20px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            backgroundColor: '#FF3D00',
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

      </div>

      {/* 필터 영역 - 한 줄로 정리 */}
      <div style={{
        display: 'flex',
        gap: '10px',
        alignItems: 'center'
      }}>
        {/* 검색창 */}
        <div style={{ flex: '2', maxWidth: '400px', position: 'relative' }}>
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
              paddingTop: '8px',
              paddingBottom: '8px',
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

        {/* 상태 필터 */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            width: '140px',
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

        {/* 날짜 타입 선택 */}
        <select
          value={dateType}
          onChange={(e) => setDateType(e.target.value)}
          style={{
            width: '120px',
            padding: '8px 12px',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '14px',
            backgroundColor: 'white',
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          {dateTypeOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* 기간 필터 */}
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          style={{
            width: '110px',
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

        {/* 필터 초기화 버튼 */}
        <button
          onClick={handleResetFilters}
          title="필터 초기화"
          style={{
            padding: '8px 12px',
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
            gap: '4px',
            whiteSpace: 'nowrap'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#f3f4f6';
            e.currentTarget.style.color = '#374151';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#f9fafb';
            e.currentTarget.style.color = '#6b7280';
          }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          초기화
        </button>
      </div>
    </div>
  );
};

export default StoreFilterPanel;