import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client.js';
import { useAuth } from '../hooks/useAuth.js';
import MainLayout from '../components/Layout/MainLayout.jsx';

const StatusBadge = ({ status, matchedStoreName }) => {
  if (status === 'MATCHED') {
    return (
      <span style={{ 
        padding: '4px 12px',
        backgroundColor: '#d1fae5',
        color: '#065f46',
        borderRadius: '9999px',
        fontSize: '12px',
        fontWeight: '500',
        border: 'none'
      }}>
        매칭완료
      </span>
    );
  }
  
  return (
    <span style={{
      padding: '4px 12px',
      backgroundColor: '#fef3c7',
      color: '#92400e',
      borderRadius: '9999px',
      fontSize: '12px',
      fontWeight: '500',
      border: 'none'
    }}>
      대기중
    </span>
  );
};

const QRPlacementsPage = () => {
  const { user } = useAuth();
  const [placements, setPlacements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlacement, setSelectedPlacement] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [qrMenuApplications, setQrMenuApplications] = useState([]);
  const [selectedAppId, setSelectedAppId] = useState('');
  const [saving, setSaving] = useState(false);
  const [expandedPhoto, setExpandedPhoto] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // 날짜 포맷팅 함수
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('ko-KR');
  };

  useEffect(() => {
    fetchPlacements();
  }, []);

  const fetchPlacements = async () => {
    try {
      const response = await apiClient.get('/api/placements');
      setPlacements(response.data?.placements || response.data || []);
    } catch (error) {
      console.error('API 에러:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchQRMenuApplications = async () => {
    try {
      const response = await apiClient.get('/api/qrmenu');
      setQrMenuApplications(response.data?.applications || response.data || []);
    } catch (error) {
      console.error('QR메뉴 API 에러:', error);
    }
  };

  const handleRowClick = async (placement) => {
    setSelectedPlacement(placement);
    setSelectedAppId(placement.application_id || '');
    setSearchTerm('');
    setSelectedApplication(null);
    await fetchQRMenuApplications();
    setShowModal(true);
  };

  const handleMatch = async () => {
    if (!selectedAppId) {
      alert('매칭할 매장을 선택해주세요.');
      return;
    }

    setSaving(true);
    try {
      const placementId = selectedPlacement.placement_id || selectedPlacement.id;
      const response = await apiClient.patch(`/api/placements/${placementId}`, {
        application_id: selectedAppId,
        matched_by: user?.email || user?.id
      });
      
      if (response || response.success || response.data) {
        alert('매칭이 완료되었습니다.');
        setShowModal(false);
        await fetchPlacements();
      } else {
        alert('매칭에 실패했습니다.');
      }
    } catch (error) {
      console.error('매칭 실패:', error);
      alert('매칭에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
    const headers = ['제출일', '입력한매장명', '사진수', '매칭상태', '매칭매장명'];
    const rows = filteredPlacements.map(placement => [
      formatDate(placement.submitted_at || placement.created_at),
      placement.store_name_input || '',
      placement.photo_urls?.length || 0,
      placement.status === 'MATCHED' ? '매칭완료' : '대기중',
      placement.matched_store_name || ''
    ]);
    
    const BOM = '\uFEFF';
    const csvContent = BOM + [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `설치인증_${new Date().toISOString().split('T')[0]}.csv`;
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
  const filteredPlacements = placements.filter(p => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'pending') return p.status !== 'MATCHED';
    if (statusFilter === 'matched') return p.status === 'MATCHED';
    return true;
  });

  const totalItems = filteredPlacements.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredPlacements.slice(startIndex, startIndex + itemsPerPage);

  return (
    <MainLayout>
      <div style={{ backgroundColor: '#f9fafb', minHeight: 'calc(100vh - 64px)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
          {/* 헤더와 필터 탭 */}
          <div style={{ marginBottom: '24px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
              설치인증 관리
            </h1>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
              매장에서 제출한 설치 인증 사진을 확인하고 매칭합니다
            </p>
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e5e7eb' }}>
              {[
                { key: 'all', label: '전체' },
                { key: 'pending', label: '대기중' },
                { key: 'matched', label: '매칭완료' }
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
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>제출일</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>입력한 매장명</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#374151' }}>사진수</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#374151' }}>매칭상태</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ padding: '48px', textAlign: 'center', color: '#9ca3af', fontSize: '14px', borderBottom: '1px solid #e5e7eb' }}>
                      설치인증 데이터가 없습니다
                    </td>
                  </tr>
                ) : (
                  currentItems.map((placement) => (
                    <tr 
                      key={placement.placement_id}
                      onClick={() => handleRowClick(placement)}
                      style={{
                        cursor: 'pointer',
                        transition: 'background-color 0.15s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#fafafa'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
                    >
                      <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827', borderBottom: '1px solid #e5e7eb' }}>
                        {formatDate(placement.submitted_at || placement.created_at)}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827', fontWeight: '500', borderBottom: '1px solid #e5e7eb' }}>
                        {placement.store_name_input}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>
                        {placement.photo_urls?.length || 0}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>
                        {placement.status === 'MATCHED' && placement.matched_store_name ? (
                          <div>
                            <StatusBadge status={placement.status} />
                            <div style={{
                              fontSize: '12px',
                              color: '#6b7280',
                              marginTop: '4px'
                            }}>
                              {placement.matched_store_name}
                            </div>
                          </div>
                        ) : (
                          <StatusBadge status={placement.status} />
                        )}
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
        {showModal && selectedPlacement && (
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
                  설치인증 상세
                </h2>
              </div>

              <div style={{ padding: '24px' }}>
                {/* 기본 정보 */}
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>
                    제출 정보
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ fontSize: '12px', color: '#6b7280' }}>입력한 매장명</label>
                      <p style={{ fontSize: '14px', color: '#111827', fontWeight: '500', marginTop: '4px' }}>
                        {selectedPlacement.store_name_input}
                      </p>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#6b7280' }}>제출일시</label>
                      <p style={{ fontSize: '14px', color: '#111827', marginTop: '4px' }}>
                        {formatDate(selectedPlacement.submitted_at || selectedPlacement.created_at)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 사진 표시 */}
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>
                    인증 사진 ({selectedPlacement.photo_urls?.length || 0}장)
                  </h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                    gap: '12px'
                  }}>
                    {selectedPlacement.photo_urls?.map((url, idx) => (
                      <div
                        key={idx}
                        style={{
                          position: 'relative',
                          paddingTop: '100%',
                          backgroundColor: '#f3f4f6',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          border: '1px solid #e5e7eb'
                        }}
                        onClick={() => setExpandedPhoto(url)}
                      >
                        <img
                          src={url}
                          alt={`인증사진 ${idx + 1}`}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* 매칭 설정 */}
                {selectedPlacement.status !== 'MATCHED' ? (
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>
                      매칭할 매장 선택
                    </h3>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        placeholder="매장명 검색..."
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setShowSearchResults(true);
                          if (!e.target.value) {
                            setSelectedApplication(null);
                            setSelectedAppId('');
                          }
                        }}
                        onFocus={() => setShowSearchResults(true)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      />
                      {searchTerm && showSearchResults && (
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          maxHeight: '200px',
                          overflowY: 'auto',
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          marginTop: '4px',
                          zIndex: 10,
                          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                        }}>
                          {qrMenuApplications
                            .filter(app => 
                              app.store_name?.toLowerCase().includes(searchTerm.toLowerCase())
                            )
                            .slice(0, 20)
                            .map((app) => (
                              <div
                                key={app.application_id}
                                onClick={() => {
                                  if (!app.placement_matched) {
                                    setSelectedApplication(app);
                                    setSelectedAppId(app.application_id);
                                    setSearchTerm(app.store_name);
                                    setShowSearchResults(false);
                                  }
                                }}
                                style={{
                                  padding: '8px 12px',
                                  cursor: app.placement_matched ? 'not-allowed' : 'pointer',
                                  borderBottom: '1px solid #f3f4f6',
                                  transition: 'background-color 0.2s',
                                  backgroundColor: app.placement_matched ? '#f3f4f6' : 'white'
                                }}
                                onMouseOver={(e) => {
                                  if (!app.placement_matched) {
                                    e.currentTarget.style.backgroundColor = '#f9fafb';
                                  }
                                }}
                                onMouseOut={(e) => {
                                  if (!app.placement_matched) {
                                    e.currentTarget.style.backgroundColor = 'white';
                                  }
                                }}
                              >
                                <div style={{ 
                                  fontSize: '14px', 
                                  fontWeight: '500', 
                                  color: app.placement_matched ? '#9ca3af' : '#111827',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between'
                                }}>
                                  <span>{app.store_name}</span>
                                  {app.placement_matched && (
                                    <span style={{ fontSize: '12px', color: '#10b981', fontWeight: '500' }}>
                                      인증완료
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '12px', color: app.placement_matched ? '#9ca3af' : '#6b7280', marginTop: '2px' }}>
                                  {app.member_id || '회원번호 없음'}
                                </div>
                              </div>
                            ))
                          }
                          {qrMenuApplications.filter(app => 
                            app.store_name?.toLowerCase().includes(searchTerm.toLowerCase())
                          ).length === 0 && (
                            <div style={{
                              padding: '12px',
                              textAlign: 'center',
                              color: '#6b7280',
                              fontSize: '14px'
                            }}>
                              검색 결과가 없습니다
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>
                      매칭 정보
                    </h3>
                    <div style={{
                      padding: '12px',
                      backgroundColor: '#f0fdf4',
                      borderRadius: '8px',
                      border: '1px solid #bbf7d0'
                    }}>
                      <p style={{ fontSize: '14px', color: '#166534', fontWeight: '500' }}>
                        {(() => {
                          const matchedApp = qrMenuApplications.find(
                            app => app.application_id === (selectedPlacement.matched_application_id || selectedPlacement.application_id)
                          );
                          return `✓ ${matchedApp?.store_name || selectedPlacement.matched_store_name || '알 수 없음'}과(와) 매칭되었습니다`;
                        })()}
                      </p>
                      {selectedPlacement.matched_by && (
                        <p style={{ fontSize: '12px', color: '#166534', marginTop: '4px' }}>
                          매칭 처리자: {selectedPlacement.matched_by}
                        </p>
                      )}
                      {selectedPlacement.matched_at && (
                        <p style={{ fontSize: '12px', color: '#166534', marginTop: '2px' }}>
                          매칭 시각: {formatDate(selectedPlacement.matched_at)}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div style={{
                padding: '24px',
                borderTop: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px'
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
                {selectedPlacement.status !== 'MATCHED' && (
                  <button
                    onClick={handleMatch}
                    disabled={saving || !selectedAppId}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: saving || !selectedAppId ? '#d1d5db' : '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: saving || !selectedAppId ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {saving ? '매칭 중...' : '매칭 저장'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 사진 확대 모달 */}
        {expandedPhoto && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
              cursor: 'pointer'
            }}
            onClick={() => setExpandedPhoto(null)}
          >
            <img
              src={expandedPhoto}
              alt="확대 이미지"
              style={{
                maxWidth: '90%',
                maxHeight: '90%',
                objectFit: 'contain'
              }}
            />
            <button
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                width: '40px',
                height: '40px',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                fontSize: '24px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onClick={() => setExpandedPhoto(null)}
            >
              ×
            </button>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default QRPlacementsPage;