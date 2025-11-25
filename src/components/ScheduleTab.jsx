import React, { useState, useEffect } from 'react';
import { getSchedules, deleteSchedule, createSchedule, VISIT_TYPE_LABELS } from '../api/scheduleApi.js';

/**
 * 일정 관리 컴포넌트 - 직원 연락처와 동일한 스타일
 * @param {Object} props
 * @param {string} props.storeId - 매장 ID
 * @param {Function} props.onAddClick - 외부에서 모달 열기 함수를 전달받음
 */
const ScheduleTab = ({ storeId, onAddClick }) => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    visit_date: '',
    visit_time: '',
    visit_purpose: '',
    visit_type: 'first'
  });
  const [formError, setFormError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // 일정 목록 조회
  const loadSchedules = async () => {
    if (!storeId) return;

    setLoading(true);
    try {
      const data = await getSchedules(storeId);
      const sortedData = Array.isArray(data) ? 
        data.sort((a, b) => new Date(b.visit_date) - new Date(a.visit_date)) : 
        [];
      setSchedules(sortedData);
    } catch (error) {
      console.error('일정 목록 조회 실패:', error);
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 일정 로드
  useEffect(() => {
    loadSchedules();
  }, [storeId]);

  // 외부에서 onAddClick을 호출하면 모달 열기
  useEffect(() => {
    if (onAddClick) {
      // onAddClick에 handleOpenModal 함수를 할당
      onAddClick.current = handleOpenModal;
    }
  }, [onAddClick]);

  // 폼 데이터 변경 핸들러
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (formError) setFormError(null);
  };

  // 모달 열기
  const handleOpenModal = () => {
    setFormData({
      visit_date: '',
      visit_time: '',
      visit_purpose: '',
      visit_type: 'first'
    });
    setFormError(null);
    setShowModal(true);
  };

  // 모달 닫기
  const handleCloseModal = () => {
    setShowModal(false);
    setFormError(null);
    setIsSaving(false);
  };

  // 폼 유효성 검사
  const validateForm = () => {
    if (!formData.visit_date) {
      setFormError('방문 날짜를 선택해주세요.');
      return false;
    }
    if (!formData.visit_time) {
      setFormError('방문 시간을 선택해주세요.');
      return false;
    }
    if (!formData.visit_purpose.trim()) {
      setFormError('방문 목적을 입력해주세요.');
      return false;
    }
    if (!formData.visit_type) {
      setFormError('방문 타입을 선택해주세요.');
      return false;
    }
    return true;
  };

  // 일정 저장
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    try {
      await createSchedule(storeId, formData);
      await loadSchedules(); // 목록 새로고침
      handleCloseModal();
    } catch (error) {
      console.error('일정 저장 실패:', error);
      setFormError(error.message || '일정 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 일정 삭제
  const handleDelete = async (schedule) => {
    
    // 가능한 모든 ID 필드를 시도
    const scheduleId = schedule.id || 
                      schedule.schedule_id || 
                      schedule.scheduleId || 
                      schedule.scheduleid ||
                      schedule.ID ||
                      schedule.SCHEDULE_ID;
    
    if (!scheduleId) {
      console.error('🗑️ 일정 ID를 찾을 수 없습니다:', schedule);
      alert('일정 ID를 찾을 수 없습니다.');
      return;
    }
    
    if (!window.confirm('이 일정을 삭제하시겠습니까?')) {
      return;
    }

    try {
      await deleteSchedule(scheduleId, storeId);
      await loadSchedules(); // 목록 새로고침
    } catch (error) {
      console.error('일정 삭제 실패:', error);
      alert(error.message || '일정 삭제에 실패했습니다.');
    }
  };

  // 날짜 포맷팅
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ko-KR', {
        year: '2-digit',
        month: '2-digit',
        day: '2-digit'
      }).replace(/\. /g, '.').replace('.', '');
    } catch (error) {
      return dateString;
    }
  };

  // 시간 포맷팅
  const formatTime = (timeString) => {
    try {
      return timeString.substring(0, 5);
    } catch (error) {
      return timeString;
    }
  };

  if (loading) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '40px 20px',
        color: '#6b7280'
      }}>
        <div style={{
          display: 'inline-block',
          width: '20px',
          height: '20px',
          border: '2px solid #f3f4f6',
          borderTop: '2px solid #FF3D00',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '8px'
        }} />
        <p style={{ margin: '0', fontSize: '14px', fontFamily: 'SUIT' }}>일정을 불러오는 중...</p>
      </div>
    );
  }

  return (
    <>
      {/* 등록된 일정 테이블 */}
      {schedules.length > 0 ? (
        <div style={{
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          {/* 테이블 헤더 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '80px 60px 140px 80px 60px',
            backgroundColor: '#f9fafb',
            borderBottom: '1px solid #e5e7eb',
            fontSize: '12px',
            fontWeight: '600',
            color: '#374151'
          }}>
            <div style={{ padding: '8px 12px' }}>방문날짜</div>
            <div style={{ padding: '8px 12px' }}>시간</div>
            <div style={{ padding: '8px 12px' }}>방문목적</div>
            <div style={{ padding: '8px 12px' }}>타입</div>
            <div style={{ padding: '8px 12px' }}>관리</div>
          </div>
          
          {/* 테이블 본문 */}
          {schedules.map((schedule, index) => {
            const scheduleId = schedule.id || 
                              schedule.schedule_id || 
                              schedule.scheduleId || 
                              schedule.scheduleid ||
                              schedule.ID ||
                              schedule.SCHEDULE_ID ||
                              `schedule-${index}`;
            return (
              <div
                key={scheduleId}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '80px 60px 140px 80px 60px',
                  borderBottom: index < schedules.length - 1 ? '1px solid #f3f4f6' : 'none',
                  fontSize: '12px'
                }}
              >
                <div style={{ padding: '8px 12px', fontWeight: '500' }}>
                  {formatDate(schedule.visit_date)}
                </div>
                <div style={{ padding: '8px 12px', color: '#6b7280', fontFamily: 'monospace' }}>
                  {formatTime(schedule.visit_time)}
                </div>
                <div style={{ padding: '8px 12px' }}>
                  {schedule.visit_purpose}
                </div>
                <div style={{ padding: '8px 12px' }}>
                  <span style={{
                    padding: '2px 6px',
                    backgroundColor: schedule.visit_type === 'first' ? '#dbeafe' : '#f3e8ff',
                    color: schedule.visit_type === 'first' ? '#1e40af' : '#7c3aed',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '500'
                  }}>
                    {VISIT_TYPE_LABELS[schedule.visit_type] || schedule.visit_type}
                  </span>
                </div>
                <div style={{ padding: '8px 12px' }}>
                  <button
                    onClick={() => handleDelete(schedule)}
                    style={{
                      color: '#ef4444',
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontFamily: 'SUIT',
                      padding: '2px 4px'
                    }}
                  >
                    삭제
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // 등록된 일정이 없을 때
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          color: '#9ca3af',
          fontSize: '14px'
        }}>
          <p style={{ margin: '0 0 8px 0', fontFamily: 'SUIT' }}>등록된 일정이 없습니다.</p>
          <p style={{ 
            margin: 0, 
            fontSize: '12px', 
            color: '#d1d5db',
            fontFamily: 'SUIT'
          }}>
            상단의 + 등록 버튼을 눌러 새 일정을 추가해보세요.
          </p>
        </div>
      )}

      {/* 일정 등록 모달 */}
      {showModal && (
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
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '32px',
            width: '500px',
            maxWidth: '90vw',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#1f2937',
              margin: '0 0 24px 0',
              fontFamily: 'SUIT'
            }}>
              새 일정 등록
            </h3>

            {/* 에러 메시지 */}
            {formError && (
              <div style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                padding: '12px',
                marginBottom: '16px',
                color: '#dc2626',
                fontSize: '14px',
                fontFamily: 'SUIT'
              }}>
                {formError}
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
                marginBottom: '16px'
              }}>
                {/* 방문 날짜 */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
                    fontFamily: 'SUIT'
                  }}>
                    방문 날짜 *
                  </label>
                  <input
                    type="date"
                    name="visit_date"
                    value={formData.visit_date}
                    onChange={handleFormChange}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontFamily: 'SUIT'
                    }}
                  />
                </div>

                {/* 방문 시간 */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
                    fontFamily: 'SUIT'
                  }}>
                    방문 시간 *
                  </label>
                  <input
                    type="time"
                    name="visit_time"
                    value={formData.visit_time}
                    onChange={handleFormChange}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontFamily: 'SUIT'
                    }}
                  />
                </div>
              </div>

              {/* 방문 목적 */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px',
                  fontFamily: 'SUIT'
                }}>
                  방문 목적 *
                </label>
                <input
                  type="text"
                  name="visit_purpose"
                  value={formData.visit_purpose}
                  onChange={handleFormChange}
                  placeholder="예: 설치 지원, 컨설팅, 점검 등"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'SUIT'
                  }}
                />
              </div>

              {/* 방문 타입 */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px',
                  fontFamily: 'SUIT'
                }}>
                  방문 타입 *
                </label>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontFamily: 'SUIT' }}>
                    <input
                      type="radio"
                      name="visit_type"
                      value="first"
                      checked={formData.visit_type === 'first'}
                      onChange={handleFormChange}
                    />
                    첫방문
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontFamily: 'SUIT' }}>
                    <input
                      type="radio"
                      name="visit_type"
                      value="repeat"
                      checked={formData.visit_type === 'repeat'}
                      onChange={handleFormChange}
                    />
                    재방문
                  </label>
                </div>
              </div>
            </div>

            {/* 버튼들 */}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={handleCloseModal}
                disabled={isSaving}
                style={{
                  padding: '12px 20px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  fontFamily: 'SUIT'
                }}
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                style={{
                  padding: '12px 20px',
                  backgroundColor: isSaving ? '#9ca3af' : '#FF3D00',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  fontFamily: 'SUIT'
                }}
              >
                {isSaving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ScheduleTab;