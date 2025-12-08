import React, { useState } from 'react';
import { submitApplication, REQUEST_TYPE_LABELS, PAYMENT_TYPE_LABELS } from '../api/applicationApi.js';

const ApplyPage = () => {
  const [formData, setFormData] = useState({
    member_id: '',
    store_name: '',
    contact_name: '',
    contact_phone: '',
    request_type: 'SIGNUP',
    payment_type: 'PREPAID',
    pos_system: '',
    preferred_date: '',
    preferred_time: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // 전화번호 자동 포맷팅
    if (name === 'contact_phone') {
      // 숫자만 추출
      const numbers = value.replace(/[^0-9]/g, '');
      
      // 010으로 시작하지 않으면 입력 제한
      if (numbers.length > 0 && !numbers.startsWith('010')) {
        return;
      }
      
      // 자동 하이픈 추가
      let formattedPhone = '';
      if (numbers.length <= 3) {
        formattedPhone = numbers;
      } else if (numbers.length <= 7) {
        formattedPhone = `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
      } else if (numbers.length <= 11) {
        formattedPhone = `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
      } else {
        return; // 11자리 초과 입력 방지
      }
      
      setFormData(prev => ({
        ...prev,
        contact_phone: formattedPhone
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    // 필수 필드 검증
    if (!formData.member_id || !formData.store_name || !formData.contact_name || !formData.contact_phone) {
      setError('필수 항목을 모두 입력해주세요.');
      setSubmitting(false);
      return;
    }
    
    // 가입/미팅 신청 시 추가 필수 필드 검증
    if (formData.request_type === 'SIGNUP' || formData.request_type === 'MEETING') {
      if (!formData.pos_system) {
        setError('POS 정보를 선택해주세요.');
        setSubmitting(false);
        return;
      }
      if (!formData.payment_type) {
        setError('결제유형을 선택해주세요.');
        setSubmitting(false);
        return;
      }
      if (!formData.preferred_date) {
        setError('희망방문일을 선택해주세요.');
        setSubmitting(false);
        return;
      }
      if (!formData.preferred_time) {
        setError('희망방문시간을 선택해주세요.');
        setSubmitting(false);
        return;
      }
    }

    // 전화번호 형식 검증 (010-0000-0000 형식)
    const phoneRegex = /^010-\d{4}-\d{4}$/;
    if (!phoneRegex.test(formData.contact_phone)) {
      setError('010-0000-0000 형식으로 입력해주세요.');
      setSubmitting(false);
      return;
    }

    try {
      // 메뉴신청일 때는 결제유형, POS정보, 희망방문일시 제외
      const submitData = { ...formData };
      if (formData.request_type === 'MENU') {
        delete submitData.payment_type;
        delete submitData.pos_system;
        delete submitData.preferred_date;
        delete submitData.preferred_time;
      }

      await submitApplication(submitData);
      setSubmitted(true);
    } catch (error) {
      setError('신청 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f9fafb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '40px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
          maxWidth: '500px',
          width: '100%',
          textAlign: 'center'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            backgroundColor: '#d1fae5',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px'
          }}>
            <svg width="32" height="32" fill="#059669" viewBox="0 0 24 24">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
            </svg>
          </div>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#111827',
            marginBottom: '12px'
          }}>
            신청이 완료되었습니다
          </h2>
          <p style={{
            fontSize: '16px',
            color: '#6b7280',
            marginBottom: '32px'
          }}>
            담당자가 확인 후 연락드리겠습니다.
          </p>
          <button
            onClick={() => {
              setSubmitted(false);
              setFormData({
                member_id: '',
                store_name: '',
                contact_name: '',
                contact_phone: '',
                request_type: 'SIGNUP',
                payment_type: 'PREPAID',
                pos_system: '',
                preferred_date: '',
                preferred_time: ''
              });
            }}
            style={{
              padding: '12px 24px',
              backgroundColor: '#FF3D00',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            새 신청하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      padding: '40px 20px'
    }}>
      <div style={{
        maxWidth: '600px',
        margin: '0 auto'
      }}>
        {/* 헤더 */}
        <div style={{
          textAlign: 'center',
          marginBottom: '40px'
        }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: '700',
            color: '#111827',
            marginBottom: '8px'
          }}>
            캐치오더 신청하기
          </h1>
          <p style={{
            fontSize: '16px',
            color: '#6b7280'
          }}>
            서비스 이용을 위해 아래 정보를 입력해주세요
          </p>
        </div>

        {/* 폼 */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.05)'
        }}>
          <form onSubmit={handleSubmit}>
            {/* 요청유형 */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px'
              }}>
                요청유형 <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: '12px' }}>
                {Object.entries(REQUEST_TYPE_LABELS).map(([value, label]) => (
                  <label
                    key={value}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="radio"
                      name="request_type"
                      value={value}
                      checked={formData.request_type === value}
                      onChange={handleChange}
                      style={{ marginRight: '6px' }}
                    />
                    <span style={{
                      fontSize: '14px',
                      color: '#111827'
                    }}>
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* 회원번호 */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '6px'
              }}>
                회원번호 <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                name="member_id"
                value={formData.member_id}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none'
                }}
                placeholder="캐치테이블 회원번호를 입력하세요"
              />
            </div>

            {/* 매장명 */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '6px'
              }}>
                매장명 <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                name="store_name"
                value={formData.store_name}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none'
                }}
                placeholder="매장명을 입력하세요"
              />
            </div>

            {/* 담당자명 */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '6px'
              }}>
                담당자명 <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                name="contact_name"
                value={formData.contact_name}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none'
                }}
                placeholder="담당자 이름을 입력하세요"
              />
            </div>

            {/* 연락처 */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '6px'
              }}>
                연락처 <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="tel"
                name="contact_phone"
                value={formData.contact_phone}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none'
                }}
                placeholder="010-1234-5678"
              />
            </div>

            {/* 조건부 필드 - 가입신청 또는 미팅신청일 때만 표시 */}
            {(formData.request_type === 'SIGNUP' || formData.request_type === 'MEETING') && (
              <>
                {/* 결제유형 */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    결제유형 <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    {Object.entries(PAYMENT_TYPE_LABELS).map(([value, label]) => (
                      <label
                        key={value}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          cursor: 'pointer'
                        }}
                      >
                        <input
                          type="radio"
                          name="payment_type"
                          value={value}
                          checked={formData.payment_type === value}
                          onChange={handleChange}
                          style={{ marginRight: '6px' }}
                        />
                        <span style={{
                          fontSize: '14px',
                          color: '#111827'
                        }}>
                          {label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* POS 정보 */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    POS 정보 <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    name="pos_system"
                    value={formData.pos_system}
                    onChange={handleChange}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      backgroundColor: 'white'
                    }}
                  >
                    <option value="">선택해주세요</option>
                    <option value="OKPOS">오케이포스</option>
                    <option value="EASYPOS">이지포스</option>
                    <option value="UNIONPOS">유니온포스</option>
                  </select>
                  <p style={{
                    fontSize: '12px',
                    color: '#dc2626',
                    marginTop: '6px',
                    margin: '6px 0 0 0'
                  }}>
                    ※ 오케이포스 / 이지포스 / 유니온포스 외의 POS를 사용하시는 경우 메뉴신청만 가능합니다.
                  </p>
                </div>

                {/* 희망방문일 */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    희망방문일 <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="date"
                    name="preferred_date"
                    value={formData.preferred_date}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* 희망방문시간 */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    희망방문시간 <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    name="preferred_time"
                    value={formData.preferred_time}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      backgroundColor: 'white'
                    }}
                  >
                    <option value="">선택하세요</option>
                    {(() => {
                      const times = [];
                      // 09:00부터 21:00까지 10분 단위
                      for (let hour = 9; hour <= 21; hour++) {
                        for (let minute = 0; minute < 60; minute += 10) {
                          const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                          times.push(
                            <option key={timeStr} value={timeStr}>
                              {timeStr}
                            </option>
                          );
                        }
                      }
                      return times;
                    })()}
                  </select>
                </div>
              </>
            )}

            {/* 에러 메시지 */}
            {error && (
              <div style={{
                padding: '12px',
                backgroundColor: '#fee2e2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                <p style={{
                  fontSize: '14px',
                  color: '#dc2626',
                  margin: 0
                }}>
                  {error}
                </p>
              </div>
            )}

            {/* 제출 버튼 */}
            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: submitting ? '#9ca3af' : '#FF3D00',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: submitting ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s'
              }}
            >
              {submitting ? '제출 중...' : '신청하기'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ApplyPage;