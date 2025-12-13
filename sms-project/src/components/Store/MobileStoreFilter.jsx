import React from 'react';

const MobileStoreFilter = ({
  searchTerm,
  setSearchTerm
}) => {
  return (
    <div style={{ 
      position: 'sticky',
      top: '64px',  // 헤더 높이만큼
      zIndex: 90,
      backgroundColor: '#f9fafb',
      padding: '12px 16px',
      borderBottom: '1px solid #e5e7eb'
    }}>
      <div style={{ position: 'relative' }}>
        <div style={{
          position: 'absolute',
          left: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 1
        }}>
          <svg width="20" height="20" fill="none" stroke="#6b7280" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="매장명, 전화번호 검색"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 16px',
            paddingLeft: '40px',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            fontSize: '15px',
            backgroundColor: 'white',
            outline: 'none',
            transition: 'all 0.2s',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#FF3D00';
            e.target.style.boxShadow = '0 0 0 3px rgba(255, 61, 0, 0.1)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#e5e7eb';
            e.target.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
          }}
        />
      </div>
    </div>
  );
};

export default MobileStoreFilter;