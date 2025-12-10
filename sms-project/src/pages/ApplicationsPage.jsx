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
    memo: ''
  });
  
  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

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
        setApplications(response.data || []);
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

    // 가입신청 승인 시 담당자 필수 체크
    if (status === 'APPROVED' && selectedApp.request_type === 'SIGNUP' && !modalData.assigned_owner_id) {
      alert('담당자를 선택해주세요.');
      return;
    }

    try {
      const updateData = { status };
      
      // 승인 시 담당자 배정
      if (status === 'APPROVED' && modalData.assigned_owner_id) {
        updateData.assigned_owner_id = modalData.assigned_owner_id;
      }
      
      // 메모가 있으면 추가
      if (modalData.memo) {
        updateData.memo = modalData.memo;
      }

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
      memo: ''
    });
  };

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
              {/* 전체 건수 표시 */}
              <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid #e5e7eb',
                fontSize: '13px',
                color: '#6b7280'
              }}>
                전체 {applications.length}건 중 {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, applications.length)}건 표시
              </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
                    신청일
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
                    요청유형
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
                    회원번호
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
                    매장명
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
                    담당자명
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
                    연락처
                  </th>
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
                    상태
                  </th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // 페이지네이션 계산
                  const totalPages = Math.ceil(applications.length / itemsPerPage);
                  const paginatedApplications = applications.slice(
                    (currentPage - 1) * itemsPerPage,
                    currentPage * itemsPerPage
                  );
                  
                  return paginatedApplications.map((app, index) => (
                  <tr
                    key={app.application_id || index}
                    onClick={() => setSelectedApp(app)}
                    style={{
                      borderBottom: '1px solid #f3f4f6',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '12px', fontSize: '13px', color: '#374151' }}>
                      {new Date(app.submitted_at || app.created_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px', color: '#374151' }}>
                      {REQUEST_TYPE_LABELS[app.request_type] || app.request_type}
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px', color: '#374151' }}>
                      {app.member_id}
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px', color: '#111827', fontWeight: '500' }}>
                      {app.store_name}
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px', color: '#374151' }}>
                      {app.contact_name}
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px', color: '#374151' }}>
                      {app.contact_phone}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span className={STATUS_COLORS[app.status]} style={{
                        padding: '4px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        {STATUS_LABELS[app.status] || app.status}
                      </span>
                    </td>
                  </tr>
                  ))
                })()}
              </tbody>
            </table>
            
            {/* 페이지네이션 UI */}
            {(() => {
              const totalPages = Math.ceil(applications.length / itemsPerPage);
              
              if (totalPages <= 1) return null;
              
              // 표시할 페이지 번호 계산 (현재 페이지 주변 5개씩)
              const pageNumbers = [];
              const maxDisplay = 5; // 양쪽에 표시할 페이지 수
              let startPage = Math.max(1, currentPage - maxDisplay);
              let endPage = Math.min(totalPages, currentPage + maxDisplay);
              
              for (let i = startPage; i <= endPage; i++) {
                pageNumbers.push(i);
              }
              
              return (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '16px',
                  borderTop: '1px solid #e5e7eb'
                }}>
                  {/* 이전 페이지 버튼 */}
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    style={{
                      padding: '8px 12px',
                      fontSize: '13px',
                      fontWeight: '500',
                      color: currentPage === 1 ? '#d1d5db' : '#374151',
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => {
                      if (currentPage !== 1) {
                        e.currentTarget.style.backgroundColor = '#f9fafb';
                      }
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = 'white';
                    }}
                  >
                    이전
                  </button>
                  
                  {/* 첫 페이지와 ... 표시 */}
                  {startPage > 1 && (
                    <>
                      <button
                        onClick={() => setCurrentPage(1)}
                        style={{
                          padding: '8px 12px',
                          fontSize: '13px',
                          fontWeight: '500',
                          color: '#374151',
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        1
                      </button>
                      {startPage > 2 && <span style={{ color: '#9ca3af' }}>...</span>}
                    </>
                  )}
                  
                  {/* 페이지 번호들 */}
                  {pageNumbers.map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      style={{
                        padding: '8px 12px',
                        fontSize: '13px',
                        fontWeight: currentPage === page ? '600' : '500',
                        color: currentPage === page ? 'white' : '#374151',
                        backgroundColor: currentPage === page ? '#FF3D00' : 'white',
                        border: `1px solid ${currentPage === page ? '#FF3D00' : '#e5e7eb'}`,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => {
                        if (currentPage !== page) {
                          e.currentTarget.style.backgroundColor = '#f9fafb';
                        }
                      }}
                      onMouseOut={(e) => {
                        if (currentPage !== page) {
                          e.currentTarget.style.backgroundColor = 'white';
                        }
                      }}
                    >
                      {page}
                    </button>
                  ))}
                  
                  {/* 마지막 페이지와 ... 표시 */}
                  {endPage < totalPages && (
                    <>
                      {endPage < totalPages - 1 && <span style={{ color: '#9ca3af' }}>...</span>}
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        style={{
                          padding: '8px 12px',
                          fontSize: '13px',
                          fontWeight: '500',
                          color: '#374151',
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                  
                  {/* 다음 페이지 버튼 */}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    style={{
                      padding: '8px 12px',
                      fontSize: '13px',
                      fontWeight: '500',
                      color: currentPage === totalPages ? '#d1d5db' : '#374151',
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => {
                      if (currentPage !== totalPages) {
                        e.currentTarget.style.backgroundColor = '#f9fafb';
                      }
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = 'white';
                    }}
                  >
                    다음
                  </button>
                </div>
              );
            })()}
            </>
          )}
        </div>

        {/* 상세 모달 */}
        {selectedApp && (
          <>
            {/* 백드롭 */}
            <div
              onClick={closeModal}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                zIndex: 998
              }}
            />
            
            {/* 모달 */}
            <div style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '600px',
              maxWidth: '90vw',
              maxHeight: '90vh',
              backgroundColor: 'white',
              borderRadius: '16px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
              zIndex: 999,
              overflow: 'auto'
            }}>
              {/* 모달 헤더 */}
              <div style={{
                padding: '24px',
                borderBottom: '1px solid #e5e7eb'
              }}>
                <h2 style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: '#111827',
                  margin: 0
                }}>
                  신청 상세 정보
                </h2>
              </div>

              {/* 모달 바디 */}
              <div style={{ padding: '24px' }}>
                {/* 기본 정보 */}
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '16px'
                  }}>
                    기본 정보
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>신청일</p>
                      <p style={{ fontSize: '14px', color: '#111827' }}>
                        {new Date(selectedApp.submitted_at || selectedApp.created_at).toLocaleString('ko-KR')}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>요청유형</p>
                      <p style={{ fontSize: '14px', color: '#111827' }}>
                        {REQUEST_TYPE_LABELS[selectedApp.request_type] || selectedApp.request_type}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>회원번호</p>
                      <p style={{ fontSize: '14px', color: '#111827' }}>{selectedApp.member_id}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>매장명</p>
                      <p style={{ fontSize: '14px', color: '#111827', fontWeight: '600' }}>
                        {selectedApp.store_name}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>담당자명</p>
                      <p style={{ fontSize: '14px', color: '#111827' }}>{selectedApp.contact_name}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>연락처</p>
                      <p style={{ fontSize: '14px', color: '#111827' }}>{selectedApp.contact_phone}</p>
                    </div>
                  </div>
                </div>

                {/* 추가 정보 - 가입/미팅 신청일 때만 */}
                {(selectedApp.request_type === 'SIGNUP' || selectedApp.request_type === 'MEETING') && (
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '16px'
                    }}>
                      추가 정보
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      {selectedApp.payment_type && (
                        <div>
                          <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>결제유형</p>
                          <p style={{ fontSize: '14px', color: '#111827' }}>
                            {PAYMENT_TYPE_LABELS[selectedApp.payment_type] || selectedApp.payment_type}
                          </p>
                        </div>
                      )}
                      {selectedApp.pos_system && (
                        <div>
                          <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>POS 정보</p>
                          <p style={{ fontSize: '14px', color: '#111827' }}>
                            {POS_LABELS[selectedApp.pos_system] || selectedApp.pos_system}
                          </p>
                        </div>
                      )}
                      {selectedApp.preferred_date && (
                        <div>
                          <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>희망방문일</p>
                          <p style={{ fontSize: '14px', color: '#111827' }}>
                            {selectedApp.preferred_date}
                          </p>
                        </div>
                      )}
                      {selectedApp.preferred_time && (
                        <div>
                          <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>희망방문시간</p>
                          <p style={{ fontSize: '14px', color: '#111827' }}>
                            {selectedApp.preferred_time}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 메뉴신청일 때 테이블수 표시 */}
                {selectedApp.request_type === 'MENU' && selectedApp.table_count && (
                  <div style={{
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '20px'
                  }}>
                    <h4 style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '12px'
                    }}>
                      메뉴 정보
                    </h4>
                    <div>
                      <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>테이블수</p>
                      <p style={{ fontSize: '14px', color: '#111827' }}>
                        {selectedApp.table_count}개
                      </p>
                    </div>
                  </div>
                )}

                {/* 처리 정보 */}
                {selectedApp.status === 'PENDING' && (
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '16px'
                    }}>
                      처리 정보
                    </h3>
                    
                    {/* 담당자 선택 */}
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#374151',
                        marginBottom: '6px'
                      }}>
                        담당자 배정
                      </label>
                      <select
                        value={modalData.assigned_owner_id}
                        onChange={(e) => setModalData(prev => ({ ...prev, assigned_owner_id: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '14px',
                          outline: 'none'
                        }}
                      >
                        <option value="">선택하세요</option>
                        {managers.map(manager => (
                          <option key={manager.userId || manager.email} value={manager.userId || manager.email}>
                            {manager.name} ({manager.userId || manager.email})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 메모 */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#374151',
                        marginBottom: '6px'
                      }}>
                        메모
                      </label>
                      <textarea
                        value={modalData.memo}
                        onChange={(e) => setModalData(prev => ({ ...prev, memo: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '14px',
                          outline: 'none',
                          resize: 'vertical',
                          minHeight: '80px'
                        }}
                        placeholder="처리 관련 메모를 입력하세요"
                      />
                    </div>
                  </div>
                )}

                {/* 기존 메모 표시 */}
                {selectedApp.memo && (
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '16px'
                    }}>
                      메모
                    </h3>
                    <p style={{
                      fontSize: '14px',
                      color: '#111827',
                      padding: '12px',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px'
                    }}>
                      {selectedApp.memo}
                    </p>
                  </div>
                )}
              </div>

              {/* 모달 푸터 */}
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
                    color: '#374151',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  닫기
                </button>
                
                {selectedApp.status === 'PENDING' && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={handleDelete}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer'
                      }}
                    >
                      삭제
                    </button>
                    <button
                      onClick={() => handleStatusUpdate('REJECTED')}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#f59e0b',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer'
                      }}
                    >
                      거절
                    </button>
                    <button
                      onClick={() => handleStatusUpdate('APPROVED')}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer'
                      }}
                    >
                      승인
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default ApplicationsPage;