import React, { useState } from 'react';
import { createSchedule, VISIT_TYPE_OPTIONS } from '../api/scheduleApi.js';

/**
 * 일정 추가 폼 컴포넌트
 * @param {Object} props
 * @param {string} props.storeId - 매장 ID
 * @param {Function} props.onScheduleAdded - 일정 추가 후 콜백
 */
const ScheduleForm = ({ storeId, onScheduleAdded }) => {
  const [formData, setFormData] = useState({
    visit_date: '',
    visit_time: '',
    visit_purpose: '',
    visit_type: 'first'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // 폼 데이터 변경 핸들러
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // 입력 시 에러/성공 메시지 초기화
    if (error) setError(null);
    if (success) setSuccess(false);
  };

  // 폼 유효성 검사
  const validateForm = () => {
    if (!formData.visit_date) {
      setError('방문 날짜를 선택해주세요.');
      return false;
    }
    
    if (!formData.visit_time) {
      setError('방문 시간을 선택해주세요.');
      return false;
    }
    
    if (!formData.visit_purpose.trim()) {
      setError('방문 목적을 입력해주세요.');
      return false;
    }
    
    if (!formData.visit_type) {
      setError('방문 타입을 선택해주세요.');
      return false;
    }

    return true;
  };

  // 폼 제출 핸들러
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await createSchedule(storeId, formData);
      
      // 성공 메시지 표시
      setSuccess(true);
      
      // 폼 초기화
      setFormData({
        visit_date: '',
        visit_time: '',
        visit_purpose: '',
        visit_type: 'first'
      });

      // 부모 컴포넌트에 추가 완료 알림
      if (onScheduleAdded) {
        onScheduleAdded();
      }

      // 성공 메시지는 3초 후 자동 제거
      setTimeout(() => {
        setSuccess(false);
      }, 3000);

    } catch (error) {
      console.error('일정 추가 실패:', error);
      setError(error.message || '일정 추가에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      backgroundColor: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '24px',
      marginBottom: '24px'
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
        📅 새 일정 추가
      </h3>

      {/* 에러 메시지 */}
      {error && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '6px',
          padding: '12px',
          marginBottom: '16px',
          color: '#dc2626',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      {/* 성공 메시지 */}
      {success && (
        <div style={{
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '6px',
          padding: '12px',
          marginBottom: '16px',
          color: '#16a34a',
          fontSize: '14px'
        }}>
          일정이 성공적으로 추가되었습니다.
        </div>
      )}

      <form onSubmit={handleSubmit}>
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
              fontWeight: '500',
              color: '#374151',
              marginBottom: '6px'
            }}>
              방문 날짜 *
            </label>
            <input
              type="date"
              name="visit_date"
              value={formData.visit_date}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: 'white'
              }}
            />
          </div>

          {/* 방문 시간 */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '6px'
            }}>
              방문 시간 *
            </label>
            <input
              type="time"
              name="visit_time"
              value={formData.visit_time}
              onChange={handleChange}
              required
              step="600"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: 'white'
              }}
            />
          </div>
        </div>

        {/* 방문 목적 */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '6px'
          }}>
            방문 목적 *
          </label>
          <input
            type="text"
            name="visit_purpose"
            value={formData.visit_purpose}
            onChange={handleChange}
            placeholder="예: 설치 지원, 컨설팅, 점검 등"
            required
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: 'white'
            }}
          />
        </div>

        {/* 방문 타입 */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '8px'
          }}>
            방문 타입 *
          </label>
          <div style={{ display: 'flex', gap: '16px' }}>
            {VISIT_TYPE_OPTIONS.map(option => (
              <label key={option.value} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#374151'
              }}>
                <input
                  type="radio"
                  name="visit_type"
                  value={option.value}
                  checked={formData.visit_type === option.value}
                  onChange={handleChange}
                  style={{
                    marginRight: '4px'
                  }}
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>

        {/* 추가 버튼 */}
        <button
          type="submit"
          disabled={loading}
          style={{
            backgroundColor: loading ? '#9ca3af' : '#FF3D00',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onMouseOver={(e) => {
            if (!loading) {
              e.target.style.backgroundColor = '#E65100';
            }
          }}
          onMouseOut={(e) => {
            if (!loading) {
              e.target.style.backgroundColor = '#FF3D00';
            }
          }}
        >
          {loading ? (
            <>
              <span style={{
                display: 'inline-block',
                width: '12px',
                height: '12px',
                border: '2px solid #ffffff',
                borderTop: '2px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              추가 중...
            </>
          ) : (
            <>
              ➕ 일정 추가하기
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default ScheduleForm;