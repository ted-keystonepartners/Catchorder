import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Table from '../ui/Table.jsx';
import Button from '../ui/Button.jsx';
import { getStatusLabel, formatDate, formatPhone } from '../../utils/formatter.js';
import { LIFECYCLE, POS_LABELS } from '../../utils/constants.js';
import { getSalesLogs } from '../../api/storeApi.js';
import { limitConcurrency } from '../../api/client.js';

/**
 * StoreTable 컴포넌트 - 매장 테이블
 * @param {Object} props
 * @param {Array} props.stores - 매장 데이터
 * @param {boolean} props.loading - 로딩 상태
 * @param {Object} props.pagination - 페이지네이션 설정
 * @param {boolean} props.isAdmin - 관리자 여부
 */
const StoreTable = ({
  stores = [],
  loading = false,
  pagination,
  isAdmin = false,
  managers = []
}) => {
  const navigate = useNavigate();
  const [salesLogsCache, setSalesLogsCache] = useState({});

  // 최근 Sales Log 가져오기
  const fetchLatestSalesLog = useCallback(async (storeId) => {
    // 이미 캐시에 있으면 반환
    if (salesLogsCache[storeId]) {
      return salesLogsCache[storeId];
    }

    try {
      
      if (!storeId) {
        return null;
      }
      
      const response = await getSalesLogs(storeId);
      
      if (response.success && response.data) {
        // 여러 가능한 구조 확인
        let logs = null;
        
        if (Array.isArray(response.data)) {
          logs = response.data;
        } else if (response.data.logs && Array.isArray(response.data.logs)) {
          logs = response.data.logs;
        } else if (response.data.salesLogs && Array.isArray(response.data.salesLogs)) {
          logs = response.data.salesLogs;
        } else {
        }
        
        
        if (Array.isArray(logs) && logs.length > 0) {
          // 최신순으로 정렬하고 첫 번째 항목 가져오기
          const sortedLogs = logs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          const latestLog = sortedLogs[0];
          
          // 캐시에 저장
          setSalesLogsCache(prev => ({
            ...prev,
            [storeId]: latestLog
          }));
          
          return latestLog;
        } else {
        }
      } else {
      }
    } catch (error) {
      // Sales Log 조회 실패 시 null 반환
    }
    
    return null;
  }, [salesLogsCache]);

  // 상태 배지 컴포넌트
  const StatusBadge = ({ status }) => {
    const statusConfig = {
      'PRE_INTRODUCTION': { label: '방문대기', color: 'bg-gray-100 text-gray-800' },
      'VISIT_COMPLETED': { label: '방문완료', color: 'bg-blue-100 text-blue-800' },
      'REVISIT_SCHEDULED': { label: '재방문예정', color: 'bg-yellow-100 text-yellow-800' },
      'INFO_REQUEST': { label: '추가정보요청', color: 'bg-purple-100 text-purple-800' },
      'REMOTE_INSTALL_SCHEDULED': { label: '에이전트설치예정', color: 'bg-green-100 text-green-800' },
      'ADMIN_SETTING': { label: '어드민셋팅', color: 'bg-emerald-100 text-emerald-800' },
      'QR_LINKING': { label: 'POS연동예정', color: 'bg-green-100 text-green-800' },
      'QR_MENU_ONLY': { label: 'QR메뉴만 사용', color: 'bg-cyan-100 text-cyan-700' },
      'DEFECT_REPAIR': { label: '하자보수중', color: 'bg-indigo-100 text-indigo-800' },
      'QR_MENU_INSTALL': { label: '최종설치완료', color: 'bg-teal-100 text-teal-800' },
      'SERVICE_TERMINATED': { label: '서비스해지', color: 'bg-red-100 text-red-800' },
      'UNUSED_TERMINATED': { label: '미이용해지', color: 'bg-red-100 text-red-800' },
      'PENDING': { label: '보류', color: 'bg-orange-100 text-orange-800' }
    };

    const config = statusConfig[status] || { label: getStatusLabel(status), color: 'bg-gray-100 text-gray-800' };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  // 담당자 이름 찾기
  const getManagerName = (ownerId) => {
    if (!ownerId) return '미배정';
    
    // managers 배열에서 owner_id(이메일)과 일치하는 담당자 찾기
    const manager = managers.find(m => m.email === ownerId);
    
    if (manager && manager.name) {
      return manager.name;
    }
    
    // 이름을 찾지 못한 경우 이메일 표시
    return ownerId;
  };


  const columns = [
    {
      key: 'seq',
      title: 'Seq',
      sortable: true,
      width: '100px',
      render: (value, store) => (
        <span style={{
          fontFamily: 'monospace',
          fontSize: '13px',
          color: '#374151',
          fontWeight: '500'
        }}>
          {store.seq || store.store_id || '-'}
        </span>
      )
    },
    {
      key: 'store_name',
      title: '매장명',
      sortable: true,
      width: '300px',
      render: (value, store) => (
        <div style={{ minWidth: '200px' }}>
          <div style={{
            fontWeight: '600',
            color: '#111827',
            fontSize: '14px',
            marginBottom: '2px'
          }}>
            {store.store_name || '매장명 없음'}
          </div>
          {store.store_address && (
            <div style={{
              fontSize: '12px',
              color: '#6b7280',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '230px'
            }}>
              {store.store_address}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'store_phone',
      title: '연락처',
      sortable: true,
      width: '130px',
      render: (value, store) => (
        <span style={{
          fontSize: '13px',
          color: '#374151',
          fontFamily: 'monospace'
        }}>
          {store.store_phone || store.store_contact_phone || '-'}
        </span>
      )
    },
    {
      key: 'pos_system',
      title: 'POS',
      sortable: true,
      width: '100px',
      render: (value, store) => (
        <span style={{
          fontSize: '13px',
          color: '#374151',
          fontWeight: '500'
        }}>
          {POS_LABELS[store.pos_system] || store.pos_system || '-'}
        </span>
      )
    },
    // ADMIN일 때만 담당자 컴럼 추가
    ...(isAdmin ? [{
      key: 'owner_id',
      title: '담당자',
      sortable: true,
      width: '100px',
      render: (value, store) => (
        <span style={{
          fontSize: '13px',
          color: '#374151',
          fontWeight: '500'
        }}>
          {getManagerName(store.owner_id)}
        </span>
      )
    }] : []),
    {
      key: 'status',
      title: '상태값',
      sortable: true,
      width: '110px',
      render: (value) => {
        const statusColors = {
          'PRE_INTRODUCTION': { bgColor: '#f3f4f6', textColor: '#6b7280' },
          'VISIT_COMPLETED': { bgColor: '#dbeafe', textColor: '#1e40af' },
          'REVISIT_SCHEDULED': { bgColor: '#fef3c7', textColor: '#d97706' },
          'INFO_REQUEST': { bgColor: '#f3e8ff', textColor: '#7c3aed' },
          'REMOTE_INSTALL_SCHEDULED': { bgColor: '#fed7aa', textColor: '#ea580c' },
          'ADMIN_SETTING': { bgColor: '#dcfce7', textColor: '#16a34a' },
          'QR_LINKING': { bgColor: '#dcfce7', textColor: '#16a34a' },
          'QR_MENU_ONLY': { bgColor: '#cffafe', textColor: '#0891b2' },
          'DEFECT_REPAIR': { bgColor: '#e0e7ff', textColor: '#4338ca' },
          'QR_MENU_INSTALL': { bgColor: '#ccfbf1', textColor: '#0f766e' },
          'SERVICE_TERMINATED': { bgColor: '#fecaca', textColor: '#dc2626' },
          'UNUSED_TERMINATED': { bgColor: '#fecaca', textColor: '#dc2626' },
          'PENDING': { bgColor: '#fed7aa', textColor: '#ea580c' }
        };
        
        const colors = statusColors[value] || { bgColor: '#f3f4f6', textColor: '#6b7280' };
        const label = getStatusLabel(value);
        
        return (
          <span style={{
            padding: '4px 8px',
            backgroundColor: colors.bgColor,
            color: colors.textColor,
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '500',
            whiteSpace: 'nowrap'
          }}>
            {label}
          </span>
        );
      }
    },
    {
      key: 'created_at',
      title: '등록일',
      sortable: true,
      width: '110px',
      render: (value, store) => (
        <span style={{
          fontSize: '12px',
          color: '#6b7280'
        }}>
          {store.created_at ? new Date(store.created_at).toISOString().split('T')[0] : '-'}
        </span>
      )
    },
    {
      key: 'updated_at',
      title: '최근수정일',
      sortable: true,
      width: '110px',
      render: (value, store) => (
        <span style={{
          fontSize: '12px',
          color: '#6b7280'
        }}>
          {store.updated_at ? new Date(store.updated_at).toISOString().split('T')[0] : '-'}
        </span>
      )
    }
  ];

  // 행 클릭 핸들러
  const handleRowClick = useCallback((store) => {
    // state를 통해 매장 데이터를 전달
    navigate(`/stores/${store.store_id || store.id}`, {
      state: { storeData: store }
    });
  }, [navigate]);

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      border: '1px solid #e5e7eb',
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
    }}>
      {/* 테이블 헤더 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isAdmin ? '100px 1fr 130px 100px 100px 110px 110px 110px' : '100px 1fr 130px 100px 110px 110px 110px',
        backgroundColor: '#f9fafb',
        borderBottom: '1px solid #e5e7eb',
        fontSize: '13px',
        fontWeight: '600',
        color: '#374151'
      }}>
        {columns.map((column, index) => (
          <div
            key={column.key}
            style={{
              padding: '12px 8px',
              borderRight: index < columns.length - 1 ? '1px solid #e5e7eb' : 'none',
              textAlign: ['status', 'created_at', 'updated_at', 'pos_system'].includes(column.key) ? 'center' : 'left',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {column.title}
          </div>
        ))}
      </div>
      
      {/* 테이블 본문 */}
      {loading ? (
        <div style={{ 
          padding: '40px', 
          textAlign: 'center',
          color: '#6b7280' 
        }}>
          데이터를 불러오는 중...
        </div>
      ) : stores.length === 0 ? (
        <div style={{ 
          padding: '40px', 
          textAlign: 'center',
          color: '#6b7280' 
        }}>
          조건에 맞는 매장이 없습니다
        </div>
      ) : (
        <div>
          {stores.map((store, index) => (
            <div
              key={store.store_id || store.id || index}
              onClick={() => handleRowClick(store)}
              style={{
                display: 'grid',
                gridTemplateColumns: isAdmin ? '100px 1fr 130px 100px 100px 110px 110px 110px' : '100px 1fr 130px 100px 110px 110px 110px',
                borderBottom: index < stores.length - 1 ? '1px solid #f3f4f6' : 'none',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                minHeight: '60px' // 행 최소 높이 고정
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
            >
              {columns.map((column, columnIndex) => (
                <div
                  key={column.key}
                  style={{
                    padding: '12px 8px',
                    borderRight: columnIndex < columns.length - 1 ? '1px solid #f3f4f6' : 'none',
                    verticalAlign: 'middle',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: ['status', 'created_at', 'updated_at', 'pos_system'].includes(column.key) ? 'center' : 'flex-start',
                    overflow: 'hidden'
                  }}
                >
                  {column.render ? column.render(store[column.key], store, index) : (store[column.key] || '-')}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      
      {/* 페이지네이션 */}
      {pagination && pagination.total > 1 && (
        <div style={{
          padding: '16px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: '#f9fafb'
        }}>
          <button
            onClick={() => pagination.onPageChange(Math.max(1, pagination.current - 1))}
            disabled={pagination.current === 1}
            style={{
              padding: '6px 12px',
              border: '1px solid #e5e7eb',
              backgroundColor: 'white',
              borderRadius: '6px',
              cursor: pagination.current === 1 ? 'not-allowed' : 'pointer',
              opacity: pagination.current === 1 ? 0.5 : 1,
              fontSize: '13px',
              color: '#374151'
            }}
          >
            이전
          </button>
          
          <span style={{ 
            color: '#6b7280', 
            fontSize: '13px', 
            padding: '0 12px',
            minWidth: '80px',
            textAlign: 'center'
          }}>
            {pagination.current} / {pagination.total}
          </span>
          
          <button
            onClick={() => pagination.onPageChange(Math.min(pagination.total, pagination.current + 1))}
            disabled={pagination.current === pagination.total}
            style={{
              padding: '6px 12px',
              border: '1px solid #e5e7eb',
              backgroundColor: 'white',
              borderRadius: '6px',
              cursor: pagination.current === pagination.total ? 'not-allowed' : 'pointer',
              opacity: pagination.current === pagination.total ? 0.5 : 1,
              fontSize: '13px',
              color: '#374151'
            }}
          >
            다음
          </button>
        </div>
      )}
      
      {/* CSS 애니메이션 */}
      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default StoreTable;