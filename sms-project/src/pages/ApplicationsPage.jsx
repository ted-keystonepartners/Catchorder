import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/Layout/MainLayout.jsx';
import {
  getApplications,
  updateApplication,
  deleteApplication,
  REQUEST_TYPE_LABELS,
  PAYMENT_TYPE_LABELS,
  STATUS_LABELS,
  STATUS_COLORS
} from '../api/applicationApi.js';
import { apiClient } from '../api/client.js';

// POS 시스템 라벨
const POS_LABELS = {
  OKPOS: '오케이포스',
  EASYPOS: '이지포스',
  UNIONPOS: '유니온포스'
};

// 상태 배지 컴포넌트
const StatusBadge = ({ status }) => {
  const styles = {
    'PENDING': { bg: '#fef3c7', color: '#92400e', text: '대기중' },
    'APPROVED': { bg: '#d1fae5', color: '#065f46', text: '승인' },
    'REJECTED': { bg: '#fee2e2', color: '#991b1b', text: '거절' },
  };
  const style = styles[status] || styles['PENDING'];
  return (
    <span style={{ 
      padding: '4px 12px', 
      borderRadius: '9999px', 
      fontSize: '12px', 
      fontWeight: '500',
      backgroundColor: style.bg, 
      color: style.color,
      border: 'none'
    }}>
      {style.text}
    </span>
  );
};

const ApplicationsPage = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedApp, setSelectedApp] = useState(null);
  const [managers, setManagers] = useState([]);
  const [modalData, setModalData] = useState({
    assigned_owner_id: '',
    address: ''
  });
  
  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // 권한 체크
  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
    }
  }, [isAdmin, navigate]);

  // 신청 목록 조회
  const fetchApplications = async () => {
    setLoading(true);
    try {
      const params = selectedStatus !== 'ALL' ? { status: selectedStatus } : {};
      const response = await getApplications(params);
      if (response.success) {
        // SIGNUP, MEETING만 표시
        const filtered = (response.data || []).filter(app => app.request_type === 'SIGNUP' || app.request_type === 'MEETING');
        setApplications(filtered);
      }
    } catch (error) {
      console.error('신청 목록 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 담당자 목록 조회
  const fetchManagers = async () => {
    try {
      const response = await apiClient.get('/api/managers');
      if (response.success) {
        let managersData = [];
        if (response.data?.managers) {
          managersData = response.data.managers;
        } else if (Array.isArray(response.data)) {
          managersData = response.data;
        }
        setManagers(managersData);
      }
    } catch (error) {
      console.error('담당자 목록 조회 실패:', error);
    }
  };

  useEffect(() => {
    fetchApplications();
    fetchManagers();
    setCurrentPage(1); // 필터 변경 시 첫 페이지로 리셋
  }, [selectedStatus]);

  // 신청 상태 업데이트
  const handleStatusUpdate = async (status) => {
    if (!selectedApp) return;

    // 가입신청 승인 시 필수값 체크
    if (status === 'APPROVED' && selectedApp.request_type === 'SIGNUP') {
      if (!modalData.assigned_owner_id) {
        alert('담당자를 선택해주세요.');
        return;
      }
      if (!modalData.address) {
        alert('주소를 입력해주세요.');
        return;
      }
    }

    try {
      const updateData = { 
        status,
        assigned_owner_id: modalData.assigned_owner_id || undefined,
        address: modalData.address || undefined
      };
      
      // undefined 값 제거
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      const response = await updateApplication(selectedApp.application_id, updateData);
      if (response.success) {
        alert(`신청이 ${STATUS_LABELS[status]}되었습니다.`);
        fetchApplications();
        closeModal();
      }
    } catch (error) {
      alert('처리 중 오류가 발생했습니다.');
      console.error('신청 상태 업데이트 실패:', error);
    }
  };

  // 신청 삭제
  const handleDelete = async () => {
    if (!selectedApp) return;
    
    if (!window.confirm('정말 삭제하시겠습니까?')) return;

    try {
      const response = await deleteApplication(selectedApp.application_id);
      if (response.success) {
        alert('신청이 삭제되었습니다.');
        fetchApplications();
        closeModal();
      }
    } catch (error) {
      alert('삭제 중 오류가 발생했습니다.');
      console.error('신청 삭제 실패:', error);
    }
  };

  const closeModal = () => {
    setSelectedApp(null);
    setModalData({
      assigned_owner_id: '',
      address: ''
    });
  };

  // CSV 다운로드 기능
  const handleDownload = () => {
    const BOM = '\uFEFF';
    const headers = ['신청일', '요청유형', '회원번호', '매장명', '담당자명', '연락처', '상태'];
    const rows = applications.map(app => [
      (() => {
        const date = new Date(app.submitted_at || app.created_at);
        if (isNaN(date.getTime())) return '-';
        return date.toLocaleDateString('ko-KR');
      })(),
      REQUEST_TYPE_LABELS[app.request_type] || app.request_type,
      app.member_id || '',
      app.store_name || '',
      app.contact_name || '',
      app.contact_phone || '',
      STATUS_LABELS[app.status] || app.status
    ]);
    
    const csv = BOM + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `신청목록_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 페이지네이션 계산
  const totalItems = applications.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = applications.slice(startIndex, startIndex + itemsPerPage);

  return (
    <MainLayout>
      <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* 헤더 */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#111827',
            marginBottom: '8px'
          }}>
            신청 관리
          </h1>
          <p style={{
            fontSize: '14px',
            color: '#6b7280'
          }}>
            캐치오더 서비스 신청 내역을 관리합니다
          </p>
        </div>

        {/* 상태 필터 탭 */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px',
          borderBottom: '1px solid #e5e7eb'
        }}>
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(status => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              style={{
                padding: '12px 24px',
                backgroundColor: 'transparent',
                color: selectedStatus === status ? '#FF3D00' : '#6b7280',
                border: 'none',
                borderBottom: selectedStatus === status ? '2px solid #FF3D00' : '2px solid transparent',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {status === 'ALL' ? '전체' : STATUS_LABELS[status]}
            </button>
          ))}
        </div>

        {/* 상단 정보바 */}
        {!loading && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '14px', color: '#6b7280' }}>
              전체 {totalItems}건 중 {startIndex + 1}-{Math.min(startIndex + itemsPerPage, totalItems)}건 표시
            </span>
            <button 
              onClick={handleDownload}
              style={{ 
                padding: '8px 16px', 
                fontSize: '14px',
                backgroundColor: 'white', 
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '500',
                color: '#374151'
              }}
            >
              목록 다운로드
            </button>
          </div>
        )}

        {/* 테이블 */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          overflow: 'hidden'
        }}>
          {loading ? (
            <div style={{
              padding: '60px',
              textAlign: 'center',
              color: '#6b7280',
              fontSize: '14px'
            }}>
              로딩 중...
            </div>
          ) : applications.length === 0 ? (
            <div style={{
              padding: '60px',
              textAlign: 'center',
              color: '#6b7280',
              fontSize: '14px'
            }}>
              신청 내역이 없습니다
            </div>
          ) : (
            <>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                    신청일
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                    요청유형
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                    회원번호
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                    매장명
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                    담당자명
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                    연락처
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                    상태
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((app, index) => (
                  <tr
                    key={app.application_id || index}
                    onClick={() => {
                      setSelectedApp(app);
                      setModalData({
                        assigned_owner_id: app.assigned_owner_id || '',
                        address: app.address || ''
                      });
                    }}
                    style={{
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827', borderBottom: '1px solid #e5e7eb' }}>
                      {(() => {
                        const date = new Date(app.submitted_at || app.created_at);
                        if (isNaN(date.getTime())) return '-';
                        return date.toLocaleDateString('ko-KR');
                      })()}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827', borderBottom: '1px solid #e5e7eb' }}>
                      {REQUEST_TYPE_LABELS[app.request_type] || app.request_type}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827', borderBottom: '1px solid #e5e7eb' }}>
                      {app.member_id}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827', fontWeight: '500', borderBottom: '1px solid #e5e7eb' }}>
                      {app.store_name}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827', borderBottom: '1px solid #e5e7eb' }}>
                      {app.contact_name}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827', borderBottom: '1px solid #e5e7eb' }}>
                      {app.contact_phone}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>
                      <StatusBadge status={app.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </>
          )}
        </div>

        {/* 페이지네이션 */}
        {!loading && applications.length > 0 && totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px', marginTop: '24px' }}>
            <button 
              onClick={() => setCurrentPage(1)} 
              disabled={currentPage === 1}
              style={{ 
                padding: '8px 12px', 
                fontSize: '14px',
                fontWeight: '500',
                border: '1px solid #d1d5db', 
                borderRadius: '6px',
                backgroundColor: currentPage === 1 ? '#f3f4f6' : 'white',
                color: currentPage === 1 ? '#9ca3af' : '#374151',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              처음
            </button>
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
              disabled={currentPage === 1}
              style={{ 
                padding: '8px 12px', 
                fontSize: '14px',
                fontWeight: '500',
                border: '1px solid #d1d5db', 
                borderRadius: '6px',
                backgroundColor: currentPage === 1 ? '#f3f4f6' : 'white',
                color: currentPage === 1 ? '#9ca3af' : '#374151',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              이전
            </button>
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827', padding: '8px 16px' }}>
              {currentPage} / {totalPages}
            </span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
              disabled={currentPage >= totalPages}
              style={{ 
                padding: '8px 12px', 
                fontSize: '14px',
                fontWeight: '500',
                border: '1px solid #d1d5db', 
                borderRadius: '6px',
                backgroundColor: currentPage >= totalPages ? '#f3f4f6' : 'white',
                color: currentPage >= totalPages ? '#9ca3af' : '#374151',
                cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer'
              }}
            >
              다음
            </button>
            <button 
              onClick={() => setCurrentPage(totalPages)} 
              disabled={currentPage >= totalPages}
              style={{ 
                padding: '8px 12px', 
                fontSize: '14px',
                fontWeight: '500',
                border: '1px solid #d1d5db', 
                borderRadius: '6px',
                backgroundColor: currentPage >= totalPages ? '#f3f4f6' : 'white',
                color: currentPage >= totalPages ? '#9ca3af' : '#374151',
                cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer'
              }}
            >
              마지막
            </button>
          </div>
        )}

        {/* 상세 모달 */}
        {selectedApp && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              maxWidth: '800px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto'
            }}>
              <div style={{
                padding: '24px',
                borderBottom: '1px solid #e5e7eb'
              }}>
                <h2 style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: '#111827'
                }}>
                  신청 상세 정보
                </h2>
              </div>

              <div style={{ padding: '24px' }}>
                {/* 기본 정보 */}
                <div style={{ marginBottom: '32px' }}>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '16px'
                  }}>
                    기본 정보
                  </h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '24px'
                  }}>
                    <div>
                      <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
                        요청유형
                      </div>
                      <div style={{ fontSize: '14px', color: '#111827', fontWeight: '500' }}>
                        {REQUEST_TYPE_LABELS[selectedApp.request_type]}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
                        신청일시
                      </div>
                      <div style={{ fontSize: '14px', color: '#111827' }}>
                        {new Date(selectedApp.submitted_at || selectedApp.created_at).toLocaleString('ko-KR')}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
                        회원번호
                      </div>
                      <div style={{ fontSize: '14px', color: '#111827' }}>
                        {selectedApp.member_id}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
                        매장명
                      </div>
                      <div style={{ fontSize: '14px', color: '#111827', fontWeight: '500' }}>
                        {selectedApp.store_name}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
                        담당자명
                      </div>
                      <div style={{ fontSize: '14px', color: '#111827' }}>
                        {selectedApp.contact_name}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
                        연락처
                      </div>
                      <div style={{ fontSize: '14px', color: '#111827' }}>
                        {selectedApp.contact_phone}
                      </div>
                    </div>
                  </div>
                </div>

                {selectedApp.request_type === 'MEETING' && (
                  <div style={{ marginBottom: '32px' }}>
                    <h3 style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '16px'
                    }}>
                      미팅 정보
                    </h3>
                    <div>
                      <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
                        희망 일정
                      </div>
                      <div style={{ fontSize: '14px', color: '#111827' }}>
                        {selectedApp.meeting_schedule}
                      </div>
                    </div>
                  </div>
                )}

                {/* 처리 정보 */}
                {selectedApp.request_type === 'SIGNUP' && (
                  <div style={{ marginBottom: '32px' }}>
                    <h3 style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '16px'
                    }}>
                      처리 정보
                    </h3>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '13px',
                        color: '#374151',
                        marginBottom: '8px',
                        fontWeight: '500'
                      }}>
                        담당자 지정
                      </label>
                      <select
                        value={modalData.assigned_owner_id}
                        onChange={(e) => setModalData({ ...modalData, assigned_owner_id: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      >
                        <option key="default" value="">선택하세요</option>
                        {managers.filter(m => m.role !== 'ADMIN').map((manager, index) => (
                          <option key={`${manager.email}-${index}`} value={manager.email}>
                            {manager.name} ({manager.email})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '13px',
                        color: '#374151',
                        marginBottom: '8px',
                        fontWeight: '500'
                      }}>
                        매장 주소
                      </label>
                      <input
                        type="text"
                        value={modalData.address}
                        onChange={(e) => setModalData({ ...modalData, address: e.target.value })}
                        placeholder="매장 주소를 입력하세요"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* 현재 상태 */}
                <div style={{
                  padding: '16px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px',
                  marginBottom: '24px'
                }}>
                  <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
                    현재 상태
                  </div>
                  <StatusBadge status={selectedApp.status} />
                </div>
              </div>

              {/* 액션 버튼 */}
              <div style={{
                padding: '24px',
                borderTop: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <button
                  onClick={closeModal}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: 'white',
                    color: '#6b7280',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  닫기
                </button>
                {selectedApp.status === 'PENDING' && (
                  <button
                    onClick={() => handleStatusUpdate('APPROVED')}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    승인
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default ApplicationsPage;