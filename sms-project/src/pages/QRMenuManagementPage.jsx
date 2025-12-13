import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client.js';
import MainLayout from '../components/Layout/MainLayout.jsx';

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

  useEffect(() => {
    fetchApplications();
    fetchManagers();
  }, []);

  const fetchApplications = async () => {
    try {
      const response = await apiClient.get('/api/qrmenu');
      if (response.success) {
        setApplications(response.data || []);
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
        setManagers(response.data || []);
      }
    } catch (error) {
      console.error('담당자 목록 조회 실패:', error);
    }
  };

  const handleRowClick = (app) => {
    setSelectedApp(app);
    setEditedData({
      address: app.address || '',
      table_count: app.table_count || '',
      seq: app.seq || '',
      qr_start_number: app.qr_start_number || '',
      qr_end_number: app.qr_end_number || '',
      assigned_owner_id: app.assigned_owner_id || '',
      memo: app.memo || '',
      qrfy_url_set: app.qrfy_url_set || false
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await apiClient.patch(`/api/qrmenu/${selectedApp.id}`, editedData);
      if (response.success) {
        alert('저장되었습니다.');
        setShowModal(false);
        fetchApplications();
      } else {
        alert('저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('저장 실패:', error);
      alert('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleConvert = async () => {
    if (!window.confirm('QR오더 매장으로 전환하시겠습니까?')) {
      return;
    }

    setConverting(true);
    try {
      const response = await apiClient.post(`/api/qrmenu/${selectedApp.id}/convert`, {
        assigned_owner_id: editedData.assigned_owner_id
      });
      if (response.success) {
        alert('QR오더 매장으로 전환되었습니다.');
        navigate('/stores');
      } else {
        alert('전환에 실패했습니다.');
      }
    } catch (error) {
      console.error('전환 실패:', error);
      alert('전환에 실패했습니다.');
    } finally {
      setConverting(false);
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
            QR메뉴 신청관리
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
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>신청일</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>회원번호</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>매장명</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>담당자명</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>연락처</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>테이블수</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>비치확인</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>상태</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr 
                    key={app.id}
                    onClick={() => handleRowClick(app)}
                    style={{
                      borderBottom: '1px solid #f3f4f6',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
                  >
                    <td style={{ padding: '16px 12px', fontSize: '14px', color: '#374151' }}>
                      {new Date(app.created_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td style={{ padding: '16px 12px', fontSize: '14px', color: '#374151' }}>
                      {app.member_id || '-'}
                    </td>
                    <td style={{ padding: '16px 12px', fontSize: '14px', color: '#111827', fontWeight: '500' }}>
                      {app.store_name}
                    </td>
                    <td style={{ padding: '16px 12px', fontSize: '14px', color: '#374151' }}>
                      {app.manager_name || '-'}
                    </td>
                    <td style={{ padding: '16px 12px', fontSize: '14px', color: '#374151' }}>
                      {app.manager_phone || '-'}
                    </td>
                    <td style={{ padding: '16px 12px', fontSize: '14px', color: '#374151', textAlign: 'center' }}>
                      {app.table_count || '-'}
                    </td>
                    <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                      {app.placement_matched ? (
                        <span style={{ color: '#10b981', fontWeight: '500' }}>✓ 확인완료</span>
                      ) : (
                        <span style={{ color: '#6b7280' }}>대기중</span>
                      )}
                    </td>
                    <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                      {app.converted_to_store ? (
                        <span style={{
                          padding: '4px 8px',
                          backgroundColor: '#dbeafe',
                          color: '#1d4ed8',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}>
                          전환완료
                        </span>
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
              maxWidth: '600px',
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

              <div style={{ padding: '24px', space: 'y-4' }}>
                {/* 기본 정보 */}
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>
                    기본 정보
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ fontSize: '12px', color: '#6b7280' }}>회원번호</label>
                      <p style={{ fontSize: '14px', color: '#111827', fontWeight: '500' }}>{selectedApp.member_id || '-'}</p>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#6b7280' }}>매장명</label>
                      <p style={{ fontSize: '14px', color: '#111827', fontWeight: '500' }}>{selectedApp.store_name}</p>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#6b7280' }}>담당자명</label>
                      <p style={{ fontSize: '14px', color: '#111827', fontWeight: '500' }}>{selectedApp.manager_name || '-'}</p>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#6b7280' }}>연락처</label>
                      <p style={{ fontSize: '14px', color: '#111827', fontWeight: '500' }}>{selectedApp.manager_phone || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* 수정 가능 필드 */}
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>
                    상세 정보
                  </h3>
                  <div style={{ display: 'grid', gap: '16px' }}>
                    <div>
                      <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>주소</label>
                      <input
                        type="text"
                        value={editedData.address}
                        onChange={(e) => setEditedData({ ...editedData, address: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>테이블수</label>
                        <input
                          type="number"
                          value={editedData.table_count}
                          onChange={(e) => setEditedData({ ...editedData, table_count: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Seq</label>
                        <input
                          type="text"
                          value={editedData.seq}
                          onChange={(e) => setEditedData({ ...editedData, seq: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>QR 시작번호</label>
                        <input
                          type="text"
                          value={editedData.qr_start_number}
                          onChange={(e) => setEditedData({ ...editedData, qr_start_number: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>QR 끝번호</label>
                        <input
                          type="text"
                          value={editedData.qr_end_number}
                          onChange={(e) => setEditedData({ ...editedData, qr_end_number: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>담당자</label>
                      <select
                        value={editedData.assigned_owner_id}
                        onChange={(e) => setEditedData({ ...editedData, assigned_owner_id: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      >
                        <option value="">선택하세요</option>
                        {managers.map(manager => (
                          <option key={manager.id} value={manager.email}>
                            {manager.name} ({manager.email})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>메모</label>
                      <textarea
                        value={editedData.memo}
                        onChange={(e) => setEditedData({ ...editedData, memo: e.target.value })}
                        rows={3}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px',
                          resize: 'vertical'
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <input
                        type="checkbox"
                        id="qrfy_url_set"
                        checked={editedData.qrfy_url_set}
                        onChange={(e) => setEditedData({ ...editedData, qrfy_url_set: e.target.checked })}
                        style={{ marginRight: '8px' }}
                      />
                      <label htmlFor="qrfy_url_set" style={{ fontSize: '14px', color: '#374151', cursor: 'pointer' }}>
                        QRFY URL 설정완료
                      </label>
                    </div>
                  </div>
                </div>

                {/* 비치사진 매칭 상태 */}
                {selectedApp.placement_matched && (
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>
                      비치사진 매칭
                    </h3>
                    <p style={{ fontSize: '14px', color: '#10b981', fontWeight: '500' }}>
                      ✓ 비치사진이 매칭되었습니다
                    </p>
                    {selectedApp.placement_photos && selectedApp.placement_photos.length > 0 && (
                      <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {selectedApp.placement_photos.map((photo, idx) => (
                          <img
                            key={idx}
                            src={photo}
                            alt={`비치사진 ${idx + 1}`}
                            style={{
                              width: '80px',
                              height: '80px',
                              objectFit: 'cover',
                              borderRadius: '6px',
                              border: '1px solid #e5e7eb',
                              cursor: 'pointer'
                            }}
                            onClick={() => window.open(photo, '_blank')}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{
                padding: '24px',
                borderTop: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  {selectedApp.converted_to_store && (
                    <span style={{
                      padding: '6px 12px',
                      backgroundColor: '#dbeafe',
                      color: '#1d4ed8',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}>
                      전환완료
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
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
                    취소
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#FF6B00',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: saving ? 'not-allowed' : 'pointer',
                      opacity: saving ? 0.5 : 1
                    }}
                  >
                    {saving ? '저장 중...' : '저장'}
                  </button>
                  {!selectedApp.converted_to_store && (
                    <button
                      onClick={handleConvert}
                      disabled={converting}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: converting ? 'not-allowed' : 'pointer',
                        opacity: converting ? 0.5 : 1
                      }}
                    >
                      {converting ? '전환 중...' : 'QR오더 전환'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default QRMenuManagementPage;