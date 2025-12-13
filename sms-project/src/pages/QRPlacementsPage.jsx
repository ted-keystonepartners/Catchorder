import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client.js';
import { useAuth } from '../hooks/useAuth.js';
import MainLayout from '../components/Layout/MainLayout.jsx';

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

  useEffect(() => {
    fetchPlacements();
  }, []);

  const fetchPlacements = async () => {
    try {
      const response = await apiClient.get('/api/placements');
      if (response.success) {
        setPlacements(response.data || []);
      }
    } catch (error) {
      console.error('비치사진 목록 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchQRMenuApplications = async () => {
    try {
      const response = await apiClient.get('/api/qrmenu');
      if (response.success) {
        setQrMenuApplications(response.data || []);
      }
    } catch (error) {
      console.error('QR메뉴 신청 목록 조회 실패:', error);
    }
  };

  const handleRowClick = async (placement) => {
    setSelectedPlacement(placement);
    setSelectedAppId(placement.application_id || '');
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
      const response = await apiClient.patch(`/api/placements/${selectedPlacement.id}`, {
        application_id: selectedAppId,
        matched_by: user?.email || user?.id
      });
      if (response.success) {
        alert('매칭이 완료되었습니다.');
        setShowModal(false);
        fetchPlacements();
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

  if (loading) {
    return (
      <MainLayout>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>로딩 중...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div style={{ backgroundColor: '#f9fafb', minHeight: 'calc(100vh - 64px)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', marginBottom: '24px' }}>
            비치사진 관리
          </h1>

          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>제출일</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>입력한 매장명</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>사진수</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>매칭상태</th>
                </tr>
              </thead>
              <tbody>
                {placements.map((placement) => (
                  <tr 
                    key={placement.id}
                    onClick={() => handleRowClick(placement)}
                    style={{
                      borderBottom: '1px solid #f3f4f6',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
                  >
                    <td style={{ padding: '16px 12px', fontSize: '14px', color: '#374151' }}>
                      {new Date(placement.created_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td style={{ padding: '16px 12px', fontSize: '14px', color: '#111827', fontWeight: '500' }}>
                      {placement.store_name_input}
                    </td>
                    <td style={{ padding: '16px 12px', fontSize: '14px', color: '#374151', textAlign: 'center' }}>
                      {placement.photo_urls?.length || 0}
                    </td>
                    <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                      {placement.status === 'MATCHED' ? (
                        <div>
                          <span style={{ 
                            color: '#10b981', 
                            fontWeight: '500',
                            display: 'block'
                          }}>
                            매칭완료
                          </span>
                          {placement.matched_store_name && (
                            <span style={{
                              fontSize: '12px',
                              color: '#6b7280',
                              display: 'block',
                              marginTop: '2px'
                            }}>
                              {placement.matched_store_name}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{
                          padding: '4px 8px',
                          backgroundColor: '#fef3c7',
                          color: '#d97706',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}>
                          대기중
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                  비치사진 상세
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
                      <p style={{ fontSize: '14px', color: '#111827', fontWeight: '500' }}>
                        {selectedPlacement.store_name_input}
                      </p>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#6b7280' }}>제출일시</label>
                      <p style={{ fontSize: '14px', color: '#111827' }}>
                        {new Date(selectedPlacement.created_at).toLocaleString('ko-KR')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 사진 표시 */}
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>
                    제출된 사진
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
                          alt={`비치사진 ${idx + 1}`}
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
                    <select
                      value={selectedAppId}
                      onChange={(e) => setSelectedAppId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="">매장을 선택하세요</option>
                      {qrMenuApplications.map(app => (
                        <option key={app.id} value={app.id}>
                          {app.store_name} ({app.member_id || '회원번호 없음'})
                        </option>
                      ))}
                    </select>
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
                        ✓ {selectedPlacement.matched_store_name}과(와) 매칭되었습니다
                      </p>
                      {selectedPlacement.matched_by && (
                        <p style={{ fontSize: '12px', color: '#166534', marginTop: '4px' }}>
                          매칭 처리자: {selectedPlacement.matched_by}
                        </p>
                      )}
                      {selectedPlacement.matched_at && (
                        <p style={{ fontSize: '12px', color: '#166534', marginTop: '2px' }}>
                          매칭 시각: {new Date(selectedPlacement.matched_at).toLocaleString('ko-KR')}
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