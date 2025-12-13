import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client.js';
import MainLayout from '../components/Layout/MainLayout.jsx';

// 상태 배지 컴포넌트
const StatusBadge = ({ status, isConverted, isMatched }) => {
  if (isConverted) {
    return (
      <span style={{ 
        padding: '4px 12px', 
        borderRadius: '9999px', 
        fontSize: '12px', 
        fontWeight: '500',
        backgroundColor: '#dbeafe', 
        color: '#1d4ed8',
        border: 'none'
      }}>
        전환완료
      </span>
    );
  }
  if (isMatched) {
    return (
      <span style={{ 
        padding: '4px 12px', 
        borderRadius: '9999px', 
        fontSize: '12px', 
        fontWeight: '500',
        backgroundColor: '#d1fae5', 
        color: '#065f46',
        border: 'none'
      }}>
        인증완료
      </span>
    );
  }
  return (
    <span style={{ 
      padding: '4px 12px', 
      borderRadius: '9999px', 
      fontSize: '12px', 
      fontWeight: '500',
      backgroundColor: '#fef3c7', 
      color: '#92400e',
      border: 'none'
    }}>
      대기중
    </span>
  );
};

const QRMenuManagementPage = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [managers, setManagers] = useState([]);
  const [editedData, setEditedData] = useState({});
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertOwnerId, setConvertOwnerId] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    fetchApplications();
    fetchManagers();
  }, []);

  const fetchApplications = async () => {
    try {
      const response = await apiClient.get('/api/qrmenu');
      if (response.success) {
        setApplications(response.applications || response.data?.applications || []);
      }
    } catch (error) {
      console.error('신청 목록 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchManagers = async () => {
    try {
      const response = await apiClient.get('/api/managers');
      if (response.success) {
        setManagers(response.managers || response.data?.managers || []);
      }
    } catch (error) {
      console.error('담당자 목록 조회 실패:', error);
    }
  };

  const handleRowClick = (app) => {
    setSelectedApp(app);
    setEditedData({
      address: app.address || '',
      qr_start_number: app.qr_start_number || '',
      qr_end_number: app.qr_end_number || '',
      qr_design_type: app.qr_design_type || '',
      qr_design_custom_note: app.qr_design_custom_note || ''
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!selectedApp) return;
    
    setSaving(true);
    try {
      const response = await apiClient.patch(`/api/qrmenu/${selectedApp.application_id}`, editedData);
      if (response.success) {
        alert('저장되었습니다.');
        await fetchApplications();
        setShowModal(false);
      } else {
        alert('저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('저장 실패:', error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleConvert = () => {
    setConvertOwnerId('');
    setShowConvertModal(true);
  };

  const confirmConvert = async () => {
    if (!selectedApp || !convertOwnerId) {
      alert('담당자를 선택해주세요.');
      return;
    }
    
    setConverting(true);
    try {
      const response = await apiClient.post(`/api/qrmenu/${selectedApp.application_id}/convert`, {
        owner_id: convertOwnerId
      });
      if (response.success) {
        alert('매장이 전환되었습니다.');
        await fetchApplications();
        setShowModal(false);
        setShowConvertModal(false);
      }
    } catch (error) {
      console.error('전환 실패:', error);
      alert('전환 중 오류가 발생했습니다.');
    } finally {
      setConverting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('ko-KR');
  };

  const handleDownload = () => {
    const headers = ['신청일', '회원번호', '매장명', '담당자명', '연락처', '상태'];
    const rows = filteredApplications.map(app => [
      formatDate(app.submitted_at || app.created_at),
      app.member_id || '',
      app.store_name || '',
      app.contact_name || '',
      app.contact_phone || '',
      app.is_converted || app.converted_to_store ? '전환완료' : app.placement_matched ? '인증완료' : '대기중'
    ]);
    
    const BOM = '\uFEFF';
    const csvContent = BOM + [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `QR메뉴신청_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  if (loading) {
    return (
      <MainLayout>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>로딩 중...</p>
        </div>
      </MainLayout>
    );
  }

  // 필터링된 데이터
  const filteredApplications = applications.filter(app => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'pending') return !app.converted_to_store && !app.is_converted;
    if (statusFilter === 'converted') return app.converted_to_store === true || app.is_converted === true;
    return true;
  });

  // 페이지네이션 계산
  const totalItems = filteredApplications.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredApplications.slice(startIndex, startIndex + itemsPerPage);

  return (
    <MainLayout>
      <div style={{ backgroundColor: '#f9fafb', minHeight: 'calc(100vh - 64px)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
          {/* 헤더와 필터 탭 */}
          <div style={{ marginBottom: '24px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
              QR메뉴 신청 관리
            </h1>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
              QR메뉴 신청 내역을 관리하고 QR오더 매장으로 전환합니다
            </p>
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e5e7eb' }}>
              {[
                { key: 'all', label: '전체' },
                { key: 'pending', label: '대기중' },
                { key: 'converted', label: '전환완료' }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setStatusFilter(tab.key);
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: '12px 16px',
                    fontSize: '14px',
                    fontWeight: statusFilter === tab.key ? '600' : '400',
                    color: statusFilter === tab.key ? '#FF6B00' : '#6b7280',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderBottom: statusFilter === tab.key ? '2px solid #FF6B00' : '2px solid transparent',
                    cursor: 'pointer',
                    marginBottom: '-1px'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* 정보 바와 다운로드 버튼 */}
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

          {/* 테이블 */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>신청일</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>회원번호</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>매장명</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>담당자명</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>연락처</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#374151' }}>상태</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '48px', textAlign: 'center', color: '#9ca3af', fontSize: '14px', borderBottom: '1px solid #e5e7eb' }}>
                      신청 내역이 없습니다
                    </td>
                  </tr>
                ) : (
                  currentItems.map((app) => (
                    <tr 
                      key={app.application_id}
                      onClick={() => handleRowClick(app)}
                      style={{
                        cursor: 'pointer',
                        transition: 'background-color 0.15s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#fafafa'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
                    >
                      <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827', borderBottom: '1px solid #e5e7eb' }}>
                        {formatDate(app.submitted_at || app.created_at)}
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
                        <StatusBadge 
                          status={app.status} 
                          isConverted={app.is_converted || app.converted_to_store} 
                          isMatched={app.placement_matched}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              gap: '4px', 
              marginTop: '24px' 
            }}>
              <button 
                onClick={() => setCurrentPage(1)} 
                disabled={currentPage === 1}
                style={{
                  padding: '8px 12px',
                  backgroundColor: currentPage === 1 ? '#f3f4f6' : 'white',
                  color: currentPage === 1 ? '#9ca3af' : '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
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
                  backgroundColor: currentPage === 1 ? '#f3f4f6' : 'white',
                  color: currentPage === 1 ? '#9ca3af' : '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                }}
              >
                이전
              </button>
              <span style={{ 
                padding: '8px 16px', 
                fontSize: '14px', 
                fontWeight: '600',
                color: '#111827' 
              }}>
                {currentPage} / {totalPages}
              </span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                disabled={currentPage === totalPages}
                style={{
                  padding: '8px 12px',
                  backgroundColor: currentPage === totalPages ? '#f3f4f6' : 'white',
                  color: currentPage === totalPages ? '#9ca3af' : '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                }}
              >
                다음
              </button>
              <button 
                onClick={() => setCurrentPage(totalPages)} 
                disabled={currentPage === totalPages}
                style={{
                  padding: '8px 12px',
                  backgroundColor: currentPage === totalPages ? '#f3f4f6' : 'white',
                  color: currentPage === totalPages ? '#9ca3af' : '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                }}
              >
                마지막
              </button>
            </div>
          )}
        </div>

        {/* 상세 모달 */}
        {showModal && selectedApp && (
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
              width: '90%',
              maxWidth: '700px',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{
                padding: '24px',
                borderBottom: '1px solid #e5e7eb'
              }}>
                <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#111827' }}>
                  QR메뉴 신청 상세
                </h2>
              </div>

              <div style={{ padding: '24px' }}>
                {/* 기본 정보 */}
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>
                    기본 정보
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ fontSize: '12px', color: '#6b7280' }}>회원번호</label>
                      <p style={{ fontSize: '14px', color: '#111827', marginTop: '4px' }}>{selectedApp.member_id}</p>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#6b7280' }}>매장명</label>
                      <p style={{ fontSize: '14px', color: '#111827', fontWeight: '500', marginTop: '4px' }}>{selectedApp.store_name}</p>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#6b7280' }}>담당자명</label>
                      <p style={{ fontSize: '14px', color: '#111827', marginTop: '4px' }}>{selectedApp.contact_name}</p>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#6b7280' }}>연락처</label>
                      <p style={{ fontSize: '14px', color: '#111827', marginTop: '4px' }}>{selectedApp.contact_phone}</p>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#6b7280' }}>테이블수</label>
                      <p style={{ fontSize: '14px', color: '#111827', marginTop: '4px' }}>{selectedApp.table_count || '-'}</p>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#6b7280' }}>신청일</label>
                      <p style={{ fontSize: '14px', color: '#111827', marginTop: '4px' }}>
                        {formatDate(selectedApp.submitted_at || selectedApp.created_at)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 추가 정보 */}
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>
                    추가 정보
                  </h3>
                  <div style={{ display: 'grid', gap: '16px' }}>
                    <div>
                      <label style={{ fontSize: '12px', color: '#6b7280' }}>주소</label>
                      <input
                        type="text"
                        value={editedData.address}
                        onChange={(e) => setEditedData({...editedData, address: e.target.value})}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '4px',
                          fontSize: '14px',
                          marginTop: '4px'
                        }}
                        disabled={selectedApp.is_converted || selectedApp.converted_to_store}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#6b7280' }}>QR 시작번호</label>
                      <input
                        type="text"
                        value={editedData.qr_start_number}
                        onChange={(e) => setEditedData({...editedData, qr_start_number: e.target.value})}
                        placeholder="예: 001"
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '4px',
                          fontSize: '14px',
                          marginTop: '4px'
                        }}
                        disabled={selectedApp.is_converted || selectedApp.converted_to_store}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#6b7280' }}>QR 끝번호</label>
                      <input
                        type="text"
                        value={editedData.qr_end_number || ''}
                        onChange={(e) => setEditedData({...editedData, qr_end_number: e.target.value})}
                        placeholder="예: 050"
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '4px',
                          fontSize: '14px',
                          marginTop: '4px'
                        }}
                        disabled={selectedApp.is_converted || selectedApp.converted_to_store}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#6b7280' }}>QR 디자인</label>
                      <select
                        value={editedData.qr_design_type || ''}
                        onChange={(e) => setEditedData({...editedData, qr_design_type: e.target.value})}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '4px',
                          fontSize: '14px',
                          marginTop: '4px'
                        }}
                        disabled={selectedApp.is_converted || selectedApp.converted_to_store}
                      >
                        <option value="">선택</option>
                        <option value="BASIC">기본형</option>
                        <option value="CUSTOM">커스텀요청</option>
                      </select>
                    </div>
                    {editedData.qr_design_type === 'CUSTOM' && (
                      <div style={{ gridColumn: 'span 2' }}>
                        <label style={{ fontSize: '12px', color: '#6b7280' }}>커스텀 요청 내용</label>
                        <textarea
                          value={editedData.qr_design_custom_note || ''}
                          onChange={(e) => setEditedData({...editedData, qr_design_custom_note: e.target.value})}
                          placeholder="커스텀 디자인에 대한 요구사항을 입력하세요"
                          style={{
                            width: '100%',
                            minHeight: '80px',
                            padding: '6px 8px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '4px',
                            fontSize: '14px',
                            marginTop: '4px',
                            resize: 'vertical'
                          }}
                          disabled={selectedApp.is_converted || selectedApp.converted_to_store}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* 현재 상태 */}
                <div style={{
                  padding: '16px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>현재 상태</p>
                    <StatusBadge 
                      status={selectedApp.status} 
                      isConverted={selectedApp.is_converted || selectedApp.converted_to_store} 
                      isMatched={selectedApp.placement_matched}
                    />
                  </div>
                  {(selectedApp.is_converted || selectedApp.converted_to_store) && selectedApp.converted_store_id && (
                    <button
                      onClick={() => navigate(`/stores/${selectedApp.converted_store_id}`)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      매장 보기
                    </button>
                  )}
                </div>
              </div>

              <div style={{
                padding: '24px',
                borderTop: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <button
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'white',
                    color: '#374151',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  닫기
                </button>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {!selectedApp.is_converted && !selectedApp.converted_to_store && (
                    <>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: saving ? '#d1d5db' : '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: '500',
                          cursor: saving ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {saving ? '저장 중...' : '저장'}
                      </button>
                      {selectedApp.placement_matched && (
                        <button
                          onClick={handleConvert}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer'
                          }}
                        >
                          매장 전환
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 전환 확인 모달 */}
        {showConvertModal && (
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
            zIndex: 60
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              width: '90%',
              maxWidth: '400px'
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', marginBottom: '16px' }}>
                매장 전환
              </h3>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
                이 신청을 정식 매장으로 전환하시겠습니까?
              </p>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '13px', color: '#374151', display: 'block', marginBottom: '8px' }}>
                  담당자 선택
                </label>
                <select
                  value={convertOwnerId}
                  onChange={(e) => setConvertOwnerId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option value="">선택하세요</option>
                  {managers.map(manager => (
                    <option key={manager.user_id || manager.email} value={manager.user_id || manager.email}>
                      {manager.name} ({manager.email})
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowConvertModal(false)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'white',
                    color: '#374151',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  취소
                </button>
                <button
                  onClick={confirmConvert}
                  disabled={converting || !convertOwnerId}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: converting || !convertOwnerId ? '#d1d5db' : '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: converting || !convertOwnerId ? 'not-allowed' : 'pointer'
                  }}
                >
                  {converting ? '전환 중...' : '전환'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default QRMenuManagementPage;