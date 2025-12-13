import React, { useState } from 'react';
import { submitApplication, REQUEST_TYPE_LABELS, PAYMENT_TYPE_LABELS } from '../api/applicationApi.js';

const ApplyPage = () => {
  const [formData, setFormData] = useState({
    member_id: '',
    store_name: '',
    contact_name: '',
    phone_type: 'MOBILE',
    contact_phone: '',
    request_type: 'SIGNUP',
    payment_type: 'PREPAID',
    pos_system: '',
    preferred_date: '',
    preferred_time: '',
    table_count: ''
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
      
      // 전화번호 유형에 따른 처리
      if (formData.phone_type === 'MOBILE') {
        // 휴대폰: 11자리 초과 입력 방지
        if (numbers.length > 11) {
          return;
        }
        
        // 자동 하이픈 추가
        let formattedPhone = numbers;
        if (numbers.length > 3 && numbers.length <= 7) {
          formattedPhone = numbers.slice(0, 3) + '-' + numbers.slice(3);
        } else if (numbers.length > 7) {
          formattedPhone = numbers.slice(0, 3) + '-' + numbers.slice(3, 7) + '-' + numbers.slice(7, 11);
        }
        
        setFormData(prev => ({
          ...prev,
          contact_phone: formattedPhone
        }));
      } else {
        // 일반전화
        // 서울(02): 최대 10자리, 그 외: 최대 11자리
        const isSeoul = numbers.startsWith('02');
        const maxLength = isSeoul ? 10 : 11;
        
        if (numbers.length > maxLength) {
          return;
        }
        
        // 자동 하이픈 추가
        let formattedPhone = numbers;
        if (isSeoul) {
          // 서울: 02-0000-0000
          if (numbers.length > 2 && numbers.length <= 6) {
            formattedPhone = numbers.slice(0, 2) + '-' + numbers.slice(2);
          } else if (numbers.length > 6) {
            formattedPhone = numbers.slice(0, 2) + '-' + numbers.slice(2, 6) + '-' + numbers.slice(6, 10);
          }
        } else {
          // 그 외 지역: 000-000-0000 또는 000-0000-0000
          if (numbers.length > 3 && numbers.length <= 7) {
            formattedPhone = numbers.slice(0, 3) + '-' + numbers.slice(3);
          } else if (numbers.length > 7) {
            // 7자리 또는 8자리 중간 번호 처리
            if (numbers.length === 10) {
              formattedPhone = numbers.slice(0, 3) + '-' + numbers.slice(3, 6) + '-' + numbers.slice(6, 10);
            } else {
              formattedPhone = numbers.slice(0, 3) + '-' + numbers.slice(3, 7) + '-' + numbers.slice(7, 11);
            }
          }
        }
        
        setFormData(prev => ({
          ...prev,
          contact_phone: formattedPhone
        }));
      }
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
    
    // 메뉴신청 시 테이블수 필수 검증
    if (formData.request_type === 'MENU') {
      if (!formData.table_count) {
        setError('테이블수를 입력해주세요.');
        setSubmitting(false);
        return;
      }
      if (isNaN(formData.table_count) || formData.table_count < 1) {
        setError('올바른 테이블수를 입력해주세요.');
        setSubmitting(false);
        return;
      }
    }

    // 전화번호 형식 검증
    if (formData.phone_type === 'MOBILE') {
      // 휴대폰: 010-0000-0000 형식
      const mobileRegex = /^010-\d{4}-\d{4}$/;
      if (!mobileRegex.test(formData.contact_phone)) {
        setError('010-0000-0000 형식으로 입력해주세요.');
        setSubmitting(false);
        return;
      }
    } else {
      // 일반전화: 지역번호-0000-0000 형식
      const landlineRegex = /^(02|0[3-9][0-9])-\d{3,4}-\d{4}$/;
      if (!landlineRegex.test(formData.contact_phone)) {
        setError('올바른 전화번호 형식으로 입력해주세요. (예: 02-1234-5678, 031-123-4567)');
        setSubmitting(false);
        return;
      }
    }

    try {
      // 메뉴신청일 때는 결제유형, POS정보, 희망방문일시 제외
      const submitData = { ...formData };
      if (formData.request_type === 'MENU') {
        delete submitData.payment_type;
        delete submitData.pos_system;
        delete submitData.preferred_date;
        delete submitData.preferred_time;
        delete submitData.phone_type;
        // table_count는 포함
      } else {
        delete submitData.table_count;
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
        background: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '20px',
          padding: '40px',
          boxShadow: '0 20px 40px rgba(249, 115, 22, 0.1)',
          border: '1px solid rgba(249, 115, 22, 0.1)',
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
                phone_type: 'MOBILE',
                contact_phone: '',
                request_type: 'SIGNUP',
                payment_type: 'PREPAID',
                pos_system: '',
                preferred_date: '',
                preferred_time: '',
                table_count: ''
              });
            }}
            style={{
              padding: '12px 24px',
              backgroundColor: '#F97316',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 4px 14px rgba(249, 115, 22, 0.3)'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#EA580C'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#F97316'}
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
      background: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}
    className="p-4 md:p-6"
    >
      <div className="w-full max-w-lg mx-auto px-4">
        {/* 로고 및 헤더 */}
        <div style={{
          textAlign: 'center',
          marginBottom: '32px'
        }}>
          <div style={{
            fontSize: '36px',
            fontWeight: '900',
            background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '16px'
          }}>
            CatchOrder
          </div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#111827',
            marginBottom: '8px'
          }}>
            서비스 신청
          </h1>
          <p style={{
            fontSize: '14px',
            color: '#6b7280'
          }}>
            간편하게 캐치오더 서비스를 시작하세요
          </p>
        </div>

        {/* 폼 카드 */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '20px',
          boxShadow: '0 20px 40px rgba(249, 115, 22, 0.1)',
          border: '1px solid rgba(249, 115, 22, 0.1)'
        }}
        className="p-4 md:p-6"
        >
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
                  minHeight: '48px',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  WebkitAppearance: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#F97316'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
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
                  minHeight: '48px',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  WebkitAppearance: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#F97316'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
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
                  minHeight: '48px',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  WebkitAppearance: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#F97316'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
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
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  name="phone_type"
                  value={formData.phone_type}
                  onChange={handleChange}
                  style={{
                    width: '120px',
                    minHeight: '48px',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '16px',
                    outline: 'none',
                    backgroundColor: 'white',
                    transition: 'border-color 0.2s',
                    WebkitAppearance: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#F97316'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                >
                  <option value="MOBILE">휴대폰</option>
                  <option value="LANDLINE">일반전화</option>
                </select>
                <input
                  type="tel"
                  name="contact_phone"
                  value={formData.contact_phone}
                  onChange={handleChange}
                  required
                  style={{
                    flex: 1,
                    minHeight: '48px',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '16px',
                    outline: 'none',
                    WebkitAppearance: 'none'
                  }}
                  placeholder={formData.phone_type === 'MOBILE' ? '010-1234-5678' : '02-1234-5678'}
                />
              </div>
            </div>

            {/* 메뉴신청일 때 테이블수 입력 */}
            {formData.request_type === 'MENU' && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  테이블수 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="number"
                  name="table_count"
                  value={formData.table_count}
                  onChange={handleChange}
                  required
                  min="1"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                  placeholder="테이블 수를 입력해주세요"
                />
              </div>
            )}

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
                    <option value="시간무관" style={{ fontWeight: '600' }}>시간무관</option>
                    <optgroup label="오전 (09:00~12:00)">
                      <option value="09:00">09:00</option>
                      <option value="09:30">09:30</option>
                      <option value="10:00">10:00</option>
                      <option value="10:30">10:30</option>
                      <option value="11:00">11:00</option>
                      <option value="11:30">11:30</option>
                    </optgroup>
                    <optgroup label="오후 (12:00~18:00)">
                      <option value="12:00">12:00</option>
                      <option value="12:30">12:30</option>
                      <option value="13:00">13:00</option>
                      <option value="13:30">13:30</option>
                      <option value="14:00">14:00</option>
                      <option value="14:30">14:30</option>
                      <option value="15:00">15:00</option>
                      <option value="15:30">15:30</option>
                      <option value="16:00">16:00</option>
                      <option value="16:30">16:30</option>
                      <option value="17:00">17:00</option>
                      <option value="17:30">17:30</option>
                    </optgroup>
                    <optgroup label="저녁 (18:00~21:00)">
                      <option value="18:00">18:00</option>
                      <option value="18:30">18:30</option>
                      <option value="19:00">19:00</option>
                      <option value="19:30">19:30</option>
                      <option value="20:00">20:00</option>
                      <option value="20:30">20:30</option>
                      <option value="21:00">21:00</option>
                    </optgroup>
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
                padding: '14px',
                backgroundColor: submitting ? '#9ca3af' : '#F97316',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: submitting ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                boxShadow: submitting ? 'none' : '0 4px 14px rgba(249, 115, 22, 0.3)'
              }}
              onMouseOver={(e) => { if (!submitting) e.target.style.backgroundColor = '#EA580C' }}
              onMouseOut={(e) => { if (!submitting) e.target.style.backgroundColor = '#F97316' }}
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