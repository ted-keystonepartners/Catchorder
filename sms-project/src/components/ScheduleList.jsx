import React, { useState, useEffect } from 'react';
import { getSchedules, deleteSchedule, VISIT_TYPE_LABELS } from '../api/scheduleApi.js';

/**
 * 일정 목록 컴포넌트
 * @param {Object} props
 * @param {string} props.storeId - 매장 ID
 * @param {string} props.month - 조회할 월 (YYYY-MM, 선택사항)
 * @param {Function} props.onRefresh - 새로고침 콜백
 */
const ScheduleList = ({ storeId, month, onRefresh }) => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 일정 목록 조회
  const loadSchedules = async () => {
    if (!storeId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await getSchedules(storeId, month);
      
      // 날짜순으로 정렬 (최신순)
      const sortedData = Array.isArray(data) ? 
        data.sort((a, b) => new Date(b.visit_date) - new Date(a.visit_date)) : 
        [];
      
      setSchedules(sortedData);
    } catch (error) {
      console.error('❌ 일정 목록 조회 실패:', error);
      setError(error.message || '일정 목록 조회에 실패했습니다.');
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  // storeId나 month가 변경되면 다시 로드
  useEffect(() => {
    loadSchedules();
  }, [storeId, month]);

  // 외부에서 새로고침 요청이 오면 다시 로드
  useEffect(() => {
    if (onRefresh) {
      // onRefresh가 변경될 때마다 실행되지 않도록 처리
    }
  }, []);

  // 새로고침 함수를 외부에 노출
  React.useImperativeHandle(onRefresh, () => ({
    refresh: loadSchedules
  }), [loadSchedules]);

  // 일정 삭제
  const handleDelete = async (scheduleId) => {
    if (!window.confirm('이 일정을 삭제하시겠습니까?')) {
      return;
    }

    try {
      await deleteSchedule(scheduleId, storeId);
      
      // 삭제 후 목록 새로고침
      loadSchedules();
      
    } catch (error) {
      console.error('❌ 일정 삭제 실패:', error);
      alert(error.message || '일정 삭제에 실패했습니다.');
    }
  };

  // 날짜 포맷팅 함수
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).replace(/\. /g, '.').replace('.', '');
    } catch (error) {
      return dateString;
    }
  };

  // 시간 포맷팅 함수
  const formatTime = (timeString) => {
    try {
      // HH:MM:SS 형식을 HH:MM으로 변환
      return timeString.substring(0, 5);
    } catch (error) {
      return timeString;
    }
  };

  if (loading) {
    return (
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '24px',
        textAlign: 'center'
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
        <p style={{ color: '#6b7280', margin: '0' }}>일정을 불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '24px'
      }}>
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '6px',
          padding: '12px',
          color: '#dc2626',
          fontSize: '14px',
          textAlign: 'center'
        }}>
          {error}
        </div>
        <button
          onClick={loadSchedules}
          style={{
            backgroundColor: '#FF3D00',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            marginTop: '12px',
            display: 'block',
            margin: '12px auto 0'
          }}
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '24px'
    }}>
      <h3 style={{
        fontSize: '18px',
        fontWeight: '600',
        color: '#111827',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        📋 일정 목록 ({schedules.length}개)
      </h3>

      {schedules.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          color: '#6b7280'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📅</div>
          <p style={{ fontSize: '16px', margin: '0 0 8px 0' }}>등록된 일정이 없습니다.</p>
          <p style={{ fontSize: '14px', margin: '0' }}>위에서 새 일정을 추가해보세요.</p>
        </div>
      ) : (
        <div style={{ 
          overflowX: 'auto',
          border: '1px solid #e5e7eb',
          borderRadius: '8px'
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  방문날짜
                </th>
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  방문시간
                </th>
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  방문목적
                </th>
                <th style={{
                  padding: '12px',
                  textAlign: 'center',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  방문타입
                </th>
                <th style={{
                  padding: '12px',
                  textAlign: 'center',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  borderBottom: '1px solid #e5e7eb',
                  width: '120px'
                }}>
                  작업
                </th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((schedule, index) => (
                <tr 
                  key={schedule.id || index}
                  style={{
                    borderBottom: index < schedules.length - 1 ? '1px solid #f3f4f6' : 'none'
                  }}
                >
                  <td style={{
                    padding: '12px',
                    fontSize: '14px',
                    color: '#111827'
                  }}>
                    {formatDate(schedule.visit_date)}
                  </td>
                  <td style={{
                    padding: '12px',
                    fontSize: '14px',
                    color: '#111827'
                  }}>
                    {formatTime(schedule.visit_time)}
                  </td>
                  <td style={{
                    padding: '12px',
                    fontSize: '14px',
                    color: '#111827'
                  }}>
                    {schedule.visit_purpose}
                  </td>
                  <td style={{
                    padding: '12px',
                    textAlign: 'center'
                  }}>
                    <span style={{
                      padding: '4px 8px',
                      backgroundColor: schedule.visit_type === 'first' ? '#dbeafe' : '#f3e8ff',
                      color: schedule.visit_type === 'first' ? '#1e40af' : '#7c3aed',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}>
                      {VISIT_TYPE_LABELS[schedule.visit_type] || schedule.visit_type}
                    </span>
                  </td>
                  <td style={{
                    padding: '12px',
                    textAlign: 'center'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      gap: '8px', 
                      justifyContent: 'center' 
                    }}>
                      <button
                        onClick={() => handleDelete(schedule.id)}
                        style={{
                          backgroundColor: '#dc2626',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          fontSize: '12px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#b91c1c'}
                        onMouseOut={(e) => e.target.style.backgroundColor = '#dc2626'}
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 새로고침 버튼 */}
      <button
        onClick={loadSchedules}
        style={{
          backgroundColor: '#6b7280',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          padding: '8px 16px',
          fontSize: '14px',
          fontWeight: '500',
          cursor: 'pointer',
          marginTop: '16px',
          transition: 'background-color 0.2s'
        }}
        onMouseOver={(e) => e.target.style.backgroundColor = '#4b5563'}
        onMouseOut={(e) => e.target.style.backgroundColor = '#6b7280'}
      >
        🔄 새로고침
      </button>
    </div>
  );
};

export default ScheduleList;