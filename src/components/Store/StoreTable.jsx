import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Table from '../ui/Table.jsx';
import Button from '../ui/Button.jsx';
import { getStatusLabel, formatDate, formatPhone } from '../../utils/formatter.js';
import { LIFECYCLE } from '../../utils/constants.js';
import { getSalesLogs } from '../../api/storeApi.js';

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
  const fetchLatestSalesLog = async (storeId) => {
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
      console.error('🔥 Sales Log 조회 실패:', error);
    }
    
    return null;
  };

  // 최근 기록 컴포넌트
  const LatestLogCell = ({ storeId }) => {
    const [latestLog, setLatestLog] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const loadLatestLog = async () => {
        try {
          setLoading(true);
          const log = await fetchLatestSalesLog(storeId);
          setLatestLog(log);
        } catch (error) {
          setLatestLog(null);
        } finally {
          setLoading(false);
        }
      };

      if (storeId) {
        loadLatestLog();
      }
    }, [storeId]);

    return (
      <div style={{ 
        width: '150px',
        height: '40px',
        padding: '4px 8px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        overflow: 'hidden'
      }}>
        {loading ? (
          <div style={{ 
            fontSize: '11px', 
            color: '#9ca3af',
            textAlign: 'center',
            minHeight: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              border: '1px solid #e5e7eb',
              borderTop: '1px solid #9ca3af',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
          </div>
        ) : !latestLog ? (
          <div style={{ 
            fontSize: '11px', 
            color: '#9ca3af',
            textAlign: 'center',
            minHeight: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            기록 없음
          </div>
        ) : (
          <div style={{
            minHeight: '20px'
          }}>
            <div style={{
              fontSize: '11px',
              color: '#374151',
              lineHeight: '1.3',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              marginBottom: '2px'
            }}>
              {latestLog.content}
            </div>
            <div style={{
              fontSize: '10px',
              color: '#9ca3af',
              lineHeight: '1.2'
            }}>
              {new Date(latestLog.created_at).toLocaleDateString('ko-KR')}
            </div>
          </div>
        )}
      </div>
    );
  };

  // 상태 배지 컴포넌트
  const StatusBadge = ({ status }) => {
    const statusConfig = {
      'CONTACT_PENDING': { label: '연락대기', color: 'bg-gray-100 text-gray-800' },
      'CONTACT_COMPLETED': { label: '연락완료', color: 'bg-blue-100 text-blue-800' },
      'PROPOSAL_SENT': { label: '제안서발송', color: 'bg-purple-100 text-purple-800' },
      'UNDER_REVIEW': { label: '검토중', color: 'bg-yellow-100 text-yellow-800' },
      'ADOPTION_CONFIRMED': { label: '도입확정', color: 'bg-green-100 text-green-800' },
      'SIGNUP_COMPLETED': { label: '가입완료', color: 'bg-emerald-100 text-emerald-800' },
      'INSTALLATION_PENDING': { label: '설치대기', color: 'bg-orange-100 text-orange-800' },
      'SERVICE_ACTIVE': { label: '서비스활성', color: 'bg-green-100 text-green-800' },
      'PAUSED': { label: '일시중지', color: 'bg-gray-100 text-gray-800' },
      'CANCELLED': { label: '해지', color: 'bg-red-100 text-red-800' },
      'REJECTED': { label: '거절', color: 'bg-red-100 text-red-800' }
    };

    const config = statusConfig[status] || { label: getStatusLabel(status), color: 'bg-gray-100 text-gray-800' };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  // 담당자 이름 찾기
  const getOwnerName = (ownerId) => {
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
      key: 'status',
      title: '상태값',
      sortable: true,
      width: '110px',
      render: (value) => {
        const statusConfig = {
          'CONTACT_PENDING': { label: '연락대기', bgColor: '#f3f4f6', textColor: '#6b7280' },
          'CONTACT_COMPLETED': { label: '연락완료', bgColor: '#dbeafe', textColor: '#1e40af' },
          'PROPOSAL_SENT': { label: '제안서발송', bgColor: '#f3e8ff', textColor: '#7c3aed' },
          'UNDER_REVIEW': { label: '검토중', bgColor: '#fef3c7', textColor: '#d97706' },
          'ADOPTION_CONFIRMED': { label: '도입확정', bgColor: '#fed7aa', textColor: '#ea580c' },
          'SIGNUP_COMPLETED': { label: '가입완료', bgColor: '#dcfce7', textColor: '#16a34a' },
          'INSTALLATION_PENDING': { label: '설치대기', bgColor: '#fed7aa', textColor: '#ea580c' },
          'SERVICE_ACTIVE': { label: '서비스활성', bgColor: '#dcfce7', textColor: '#16a34a' },
          'PAUSED': { label: '일시중지', bgColor: '#f3f4f6', textColor: '#6b7280' },
          'CANCELLED': { label: '해지', bgColor: '#fecaca', textColor: '#dc2626' },
          'REJECTED': { label: '거절', bgColor: '#fecaca', textColor: '#dc2626' },
          'IN_PROGRESS': { label: '진행중', bgColor: '#fef3c7', textColor: '#d97706' },
          'PRE_INTRODUCTION': { label: '도입전', bgColor: '#f3f4f6', textColor: '#6b7280' }
        };
        
        const config = statusConfig[value] || { label: value || '미정', bgColor: '#f3f4f6', textColor: '#6b7280' };
        
        return (
          <span style={{
            padding: '4px 8px',
            backgroundColor: config.bgColor,
            color: config.textColor,
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '500',
            whiteSpace: 'nowrap'
          }}>
            {config.label}
          </span>
        );
      }
    },
    {
      key: 'created_at',
      title: '등록일',
      sortable: true,
      width: '100px',
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
      width: '100px',
      render: (value, store) => (
        <span style={{
          fontSize: '12px',
          color: '#6b7280'
        }}>
          {store.updated_at ? new Date(store.updated_at).toISOString().split('T')[0] : '-'}
        </span>
      )
    },
    {
      key: 'consent_link',
      title: '동의서링크',
      sortable: false,
      width: '110px',
      render: (_, store) => {
        const storeId = store.store_id || store.id;
        const consentUrl = `${window.location.origin}/consent/${storeId}`;
        
        const handleCopyLink = (e) => {
          e.stopPropagation();
          navigator.clipboard.writeText(consentUrl).then(() => {
            alert('링크가 복사되었습니다!');
          }).catch(() => {
            alert('링크 복사에 실패했습니다.');
          });
        };
        
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <button
              onClick={handleCopyLink}
              title="동의서 링크 복사"
              style={{
                padding: '6px 8px',
                backgroundColor: '#f97316',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#ea580c'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#f97316'}
            >
              <svg width="10" height="10" fill="white" viewBox="0 0 24 24">
                <path d="M16 1H4C2.9 1 2 1.9 2 3v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
              </svg>
              복사
            </button>
          </div>
        );
      }
    },
    {
      key: 'latest_log',
      title: '최근기록',
      sortable: false,
      width: '150px',
      render: (_, store) => {
        const storeId = store.id || store.store_id;
        return <LatestLogCell storeId={storeId} />;
      }
    }
  ];

  // 행 클릭 핸들러
  const handleRowClick = (store) => {
    // state를 통해 매장 데이터를 전달
    navigate(`/stores/${store.store_id || store.id}`, {
      state: { storeData: store }
    });
  };

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
        gridTemplateColumns: '100px 250px 120px 120px 100px 100px 100px 100px 120px',
        backgroundColor: '#f9fafb',
        borderBottom: '1px solid #e5e7eb',
        fontSize: '13px',
        fontWeight: '600',
        color: '#374151'
      }}>
        {columns.map((column) => (
          <div
            key={column.key}
            style={{
              padding: '12px 8px',
              borderRight: column.key !== 'latest_log' ? '1px solid #e5e7eb' : 'none',
              textAlign: 'left'
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
                gridTemplateColumns: '100px 250px 120px 120px 100px 100px 100px 100px 120px',
                borderBottom: index < stores.length - 1 ? '1px solid #f3f4f6' : 'none',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                minHeight: '60px' // 행 최소 높이 고정
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
            >
              {columns.map((column) => (
                <div
                  key={column.key}
                  style={{
                    padding: '12px 8px',
                    borderRight: column.key !== 'latest_log' ? '1px solid #f3f4f6' : 'none',
                    verticalAlign: 'middle',
                    display: 'flex',
                    alignItems: 'center'
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