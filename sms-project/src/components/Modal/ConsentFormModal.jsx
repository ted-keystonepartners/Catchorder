import React, { useState, useEffect } from 'react';
import { getConsentForm, submitConsentForm, getConsentResponses } from '../../api/consentApi.js';
import { formatPhoneInput } from '../../utils/formatter.js';
import { useToast } from '../../hooks/useToast.js';

const ConsentFormModal = ({ isOpen, onClose, storeId, storeName, storePhone, ownerName }) => {
  const { success, error } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasExistingData, setHasExistingData] = useState(false);
  const [lastSubmittedAt, setLastSubmittedAt] = useState(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [formData, setFormData] = useState({
    respondent_name: '',
    respondent_phone: '',
    respondent_position: '',
    remote_install_date: '',
    remote_install_time: '',
    table_count: '',
    sticker_type: '',
    design_type: '',
    preferred_color: '',
    terms_agreement: false
  });
  const [errors, setErrors] = useState({});

  // 팝업이 열릴 때마다 데이터 로드
  useEffect(() => {
    if (isOpen && storeId) {
      loadFormData();
    }
  }, [isOpen, storeId]);

  const loadFormData = async () => {
    try {
      setLoading(true);
      
      // 기존 동의서 응답 조회
      try {
        const responsesData = await getConsentResponses(storeId, 1, 10);
        
        if (responsesData && responsesData.responses && responsesData.responses.length > 0) {
          const latestResponse = responsesData.responses[0];
          
          setFormData({
            respondent_name: latestResponse.respondent_name || '',
            respondent_phone: latestResponse.respondent_phone || '',
            respondent_position: latestResponse.respondent_position || '',
            remote_install_date: latestResponse.remote_install_date || '',
            remote_install_time: latestResponse.remote_install_time || '',
            table_count: String(latestResponse.table_count || ''),
            sticker_type: latestResponse.sticker_type || '',
            design_type: latestResponse.design_type || '',
            preferred_color: latestResponse.preferred_color || '',
            terms_agreement: false
          });
          
          setHasExistingData(true);
          setLastSubmittedAt(latestResponse.submitted_at);
        } else {
          // 기존 데이터가 없으면 빈 폼
          resetForm();
          setHasExistingData(false);
          setLastSubmittedAt(null);
        }
      } catch (err) {
        console.log('동의서 응답 조회 실패:', err);
        resetForm();
        setHasExistingData(false);
        setLastSubmittedAt(null);
      }
    } catch (err) {
      console.error('데이터 로드 실패:', err);
      error('데이터를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      respondent_name: '',
      respondent_phone: '',
      respondent_position: '',
      remote_install_date: '',
      remote_install_time: '',
      table_count: '',
      sticker_type: '',
      design_type: '',
      preferred_color: '',
      terms_agreement: false
    });
    setErrors({});
  };

  const handleInputChange = (field, value) => {
    if (field === 'respondent_phone') {
      value = formatPhoneInput(value, formData.respondent_phone);
    }

    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    const nameStr = String(formData.respondent_name || '');
    if (!nameStr.trim()) {
      newErrors.respondent_name = '성명을 입력해주세요.';
    }

    const phoneStr = String(formData.respondent_phone || '');
    if (!phoneStr.trim()) {
      newErrors.respondent_phone = '연락처를 입력해주세요.';
    } else if (!/^010-\d{4}-\d{4}$/.test(phoneStr)) {
      newErrors.respondent_phone = '010-0000-0000 형식으로 입력해주세요.';
    }

    const positionStr = String(formData.respondent_position || '');
    if (!positionStr.trim()) {
      newErrors.respondent_position = '직책을 입력해주세요.';
    }

    // POS 정보 검증
    if (!formData.remote_install_date?.trim()) {
      newErrors.remote_install_date = 'POS 아이디를 입력해주세요.';
    }

    if (!formData.remote_install_time?.trim()) {
      newErrors.remote_install_time = 'POS 패스워드를 입력해주세요.';
    }

    if (!formData.sticker_type?.trim()) {
      newErrors.sticker_type = '매장코드를 입력해주세요.';
    }

    // 대리점 정보 검증
    if (!formData.design_type?.trim()) {
      newErrors.design_type = '대리점명을 입력해주세요.';
    }

    const agencyPhoneStr = String(formData.preferred_color || '');
    if (!agencyPhoneStr.trim()) {
      newErrors.preferred_color = '대리점 연락처를 입력해주세요.';
    }

    // 테이블 수 검증
    const tableCountStr = String(formData.table_count || '');
    if (!tableCountStr.trim()) {
      newErrors.table_count = '테이블 수를 입력해주세요.';
    } else if (isNaN(tableCountStr) || parseInt(tableCountStr) < 1) {
      newErrors.table_count = '올바른 테이블 수를 입력해주세요.';
    }

    if (!formData.terms_agreement) {
      newErrors.terms_agreement = '이용약관에 동의해주세요.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      error('입력 정보를 확인해주세요.');
      return;
    }

    try {
      setSubmitting(true);
      await submitConsentForm(storeId, formData);
      
      if (hasExistingData) {
        success('동의서가 성공적으로 수정되었습니다.');
      } else {
        success('동의서가 성공적으로 제출되었습니다.');
      }
      
      onClose();
    } catch (err) {
      console.error('제출 실패:', err);
      error(err.message || '제출 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleClose = () => {
    // 입력된 데이터가 있는지 확인
    const hasData = Object.values(formData).some(value => 
      value !== '' && value !== false
    );

    if (hasData && !submitting) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  };

  const confirmClose = () => {
    setShowCloseConfirm(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px'
      }}
    >
      <div 
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* 헤더 */}
        <div style={{
          backgroundColor: '#FF3D00',
          color: 'white',
          padding: '20px',
          position: 'relative'
        }}>
          <button
            onClick={handleClose}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              backgroundColor: 'transparent',
              border: 'none',
              color: 'white',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '0',
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>
          
          <h2 style={{
            fontSize: '20px',
            fontWeight: '600',
            margin: '0 0 8px 0'
          }}>
            캐치오더 온라인 가입동의서
          </h2>
          <div style={{
            fontSize: '14px',
            opacity: 0.9
          }}>
            <div>매장명: {storeName}</div>
            {ownerName && <div>담당자: {ownerName}</div>}
          </div>
        </div>

        {/* 기존 데이터 알림 */}
        {hasExistingData && lastSubmittedAt && (
          <div style={{
            backgroundColor: '#e0f2fe',
            borderLeft: '4px solid #0ea5e9',
            padding: '12px 20px',
            fontSize: '13px',
            color: '#0369a1'
          }}>
            <div style={{ fontWeight: '500', marginBottom: '4px' }}>
              ℹ️ 이전에 제출된 정보를 불러왔습니다
            </div>
            <div style={{ fontSize: '12px', color: '#075985' }}>
              마지막 제출: {new Date(lastSubmittedAt).toLocaleDateString('ko-KR')} {new Date(lastSubmittedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        )}

        {/* 스크롤 가능한 폼 영역 */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px'
        }}>
          {loading ? (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '40px'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                border: '3px solid #f3f4f6',
                borderTop: '3px solid #FF3D00',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* 담당자 정보 */}
              <div style={{
                marginBottom: '24px',
                padding: '16px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
              }}>
                <h3 style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  marginBottom: '12px',
                  color: '#374151'
                }}>담당자 정보</h3>
                
                <div style={{ display: 'grid', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                      성명 <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.respondent_name}
                      onChange={(e) => handleInputChange('respondent_name', e.target.value)}
                      placeholder="성명을 입력해주세요"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: errors.respondent_name ? '1px solid #ef4444' : '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                    {errors.respondent_name && (
                      <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                        {errors.respondent_name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                      연락처 <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="tel"
                      value={formData.respondent_phone}
                      onChange={(e) => handleInputChange('respondent_phone', e.target.value)}
                      placeholder="010-0000-0000"
                      maxLength={13}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: errors.respondent_phone ? '1px solid #ef4444' : '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                    {errors.respondent_phone && (
                      <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                        {errors.respondent_phone}
                      </p>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                      직책 <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.respondent_position}
                      onChange={(e) => handleInputChange('respondent_position', e.target.value)}
                      placeholder="직책을 입력해주세요"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: errors.respondent_position ? '1px solid #ef4444' : '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                    {errors.respondent_position && (
                      <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                        {errors.respondent_position}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* POS 관련 정보 */}
              <div style={{
                marginBottom: '24px',
                padding: '16px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
              }}>
                <h3 style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  marginBottom: '12px',
                  color: '#374151'
                }}>POS 관련 정보</h3>
                
                <div style={{ display: 'grid', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                      POS 아이디 <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.remote_install_date}
                      onChange={(e) => handleInputChange('remote_install_date', e.target.value)}
                      placeholder="POS 아이디를 입력해주세요"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: errors.remote_install_date ? '1px solid #ef4444' : '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                    {errors.remote_install_date && (
                      <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                        {errors.remote_install_date}
                      </p>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                      POS 패스워드 <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.remote_install_time}
                      onChange={(e) => handleInputChange('remote_install_time', e.target.value)}
                      placeholder="POS 패스워드를 입력해주세요"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: errors.remote_install_time ? '1px solid #ef4444' : '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                    {errors.remote_install_time && (
                      <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                        {errors.remote_install_time}
                      </p>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                      매장코드 <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.sticker_type}
                      onChange={(e) => handleInputChange('sticker_type', e.target.value)}
                      placeholder="매장코드를 입력해주세요"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: errors.sticker_type ? '1px solid #ef4444' : '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                    {errors.sticker_type && (
                      <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                        {errors.sticker_type}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* 대리점 관련 정보 */}
              <div style={{
                marginBottom: '24px',
                padding: '16px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
              }}>
                <h3 style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  marginBottom: '12px',
                  color: '#374151'
                }}>대리점 관련 정보</h3>
                
                <div style={{ display: 'grid', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                      대리점명 <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.design_type}
                      onChange={(e) => handleInputChange('design_type', e.target.value)}
                      placeholder="대리점명을 입력해주세요"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: errors.design_type ? '1px solid #ef4444' : '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                    {errors.design_type && (
                      <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                        {errors.design_type}
                      </p>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                      대리점 연락처 <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.preferred_color}
                      onChange={(e) => handleInputChange('preferred_color', e.target.value)}
                      placeholder="대리점 연락처를 입력해주세요"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: errors.preferred_color ? '1px solid #ef4444' : '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                    {errors.preferred_color && (
                      <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                        {errors.preferred_color}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* QR 스티커 정보 */}
              <div style={{
                marginBottom: '24px',
                padding: '16px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
              }}>
                <h3 style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  marginBottom: '12px',
                  color: '#374151'
                }}>QR 스티커 정보</h3>
                
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                    테이블 수 <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.table_count}
                    onChange={(e) => handleInputChange('table_count', e.target.value)}
                    placeholder="테이블 수를 입력해주세요"
                    min="1"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: errors.table_count ? '1px solid #ef4444' : '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                  {errors.table_count && (
                    <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                      {errors.table_count}
                    </p>
                  )}
                </div>
              </div>

              {/* 이용약관 */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{
                  padding: '16px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  marginBottom: '12px'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px'
                  }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#374151', margin: 0 }}>캐치오더 서비스 이용약관</h4>
                    <button
                      type="button"
                      onClick={() => {
                        const modal = document.createElement('div');
                        modal.style.cssText = `
                          position: fixed;
                          top: 0;
                          left: 0;
                          width: 100%;
                          height: 100%;
                          background: rgba(0, 0, 0, 0.5);
                          display: flex;
                          justify-content: center;
                          align-items: center;
                          z-index: 10000;
                        `;
                        
                        const content = document.createElement('div');
                        content.style.cssText = `
                          background: white;
                          border-radius: 12px;
                          padding: 24px;
                          max-width: 600px;
                          max-height: 80vh;
                          overflow-y: auto;
                          width: 90%;
                        `;
                        
                        content.innerHTML = `
                          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                            <h2 style="font-size: 18px; font-weight: 600; color: #111827; margin: 0;">캐치오더 서비스 이용약관</h2>
                            <button onclick="this.closest('div[style*='position: fixed']').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #6b7280;">×</button>
                          </div>
                          <div style="font-size: 14px; line-height: 1.8; color: #374151;">
                            <h3 style="font-size: 15px; font-weight: 600; margin-top: 16px; margin-bottom: 8px;">제1조 (목적)</h3>
                            <p style="margin-bottom: 12px;">본 약관은 캐치오더(이하 "회사")가 제공하는 QR 주문 서비스(이하 "서비스")의 이용과 관련하여 회사와 고객 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.</p>
                            
                            <h3 style="font-size: 15px; font-weight: 600; margin-top: 16px; margin-bottom: 8px;">제2조 (서비스 내용)</h3>
                            <p style="margin-bottom: 8px;">1. 회사는 QR코드 기반의 테이블 주문 시스템을 제공합니다.</p>
                            <p style="margin-bottom: 8px;">2. POS 시스템과 연동하여 실시간 주문 처리가 가능합니다.</p>
                            <p style="margin-bottom: 12px;">3. 매장 운영에 필요한 관리 도구를 제공합니다.</p>
                            
                            <h3 style="font-size: 15px; font-weight: 600; margin-top: 16px; margin-bottom: 8px;">제3조 (서비스 설치)</h3>
                            <p style="margin-bottom: 8px;">1. 서비스 설치는 원격으로 진행되며, 고객의 협조가 필요합니다.</p>
                            <p style="margin-bottom: 8px;">2. POS 연동을 위해 필요한 정보를 정확히 제공해야 합니다.</p>
                            <p style="margin-bottom: 12px;">3. 설치 일정은 상호 협의하여 결정합니다.</p>
                            
                            <h3 style="font-size: 15px; font-weight: 600; margin-top: 16px; margin-bottom: 8px;">제4조 (QR 스티커)</h3>
                            <p style="margin-bottom: 8px;">1. QR 스티커는 고객이 요청한 수량과 디자인으로 제작됩니다.</p>
                            <p style="margin-bottom: 8px;">2. 제작된 스티커는 지정된 주소로 배송됩니다.</p>
                            <p style="margin-bottom: 12px;">3. 스티커 재발급 시 추가 비용이 발생할 수 있습니다.</p>
                            
                            <h3 style="font-size: 15px; font-weight: 600; margin-top: 16px; margin-bottom: 8px;">제5조 (개인정보보호)</h3>
                            <p style="margin-bottom: 8px;">1. 회사는 고객의 개인정보를 서비스 제공 목적으로만 사용합니다.</p>
                            <p style="margin-bottom: 8px;">2. 개인정보는 관련 법령에 따라 안전하게 보호됩니다.</p>
                            <p style="margin-bottom: 12px;">3. 고객의 동의 없이 제3자에게 정보를 제공하지 않습니다.</p>
                            
                            <h3 style="font-size: 15px; font-weight: 600; margin-top: 16px; margin-bottom: 8px;">제6조 (서비스 이용료)</h3>
                            <p style="margin-bottom: 8px;">1. 서비스 이용료는 별도 계약에 따릅니다.</p>
                            <p style="margin-bottom: 8px;">2. 이용료 미납 시 서비스가 제한될 수 있습니다.</p>
                            <p style="margin-bottom: 12px;">3. 요금제 변경은 고객센터를 통해 가능합니다.</p>
                            
                            <h3 style="font-size: 15px; font-weight: 600; margin-top: 16px; margin-bottom: 8px;">제7조 (고객지원)</h3>
                            <p style="margin-bottom: 8px;">1. 서비스 이용 중 문제 발생 시 고객센터로 연락주시기 바랍니다.</p>
                            <p style="margin-bottom: 8px;">2. 고객센터 운영시간: 평일 09:00 ~ 18:00</p>
                            <p style="margin-bottom: 12px;">3. 긴급 문의는 별도 핫라인을 이용해 주세요.</p>
                            
                            <p style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 13px; color: #6b7280;">본 약관은 2024년 1월 1일부터 시행됩니다.</p>
                          </div>
                        `;
                        
                        modal.appendChild(content);
                        document.body.appendChild(modal);
                        
                        modal.onclick = (e) => {
                          if (e.target === modal) {
                            document.body.removeChild(modal);
                          }
                        };
                      }}
                      style={{
                        background: 'none',
                        border: '1px solid #FF3D00',
                        color: '#FF3D00',
                        padding: '4px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.backgroundColor = '#FF3D00';
                        e.target.style.color = 'white';
                      }}
                      onMouseOut={(e) => {
                        e.target.style.backgroundColor = 'transparent';
                        e.target.style.color = '#FF3D00';
                      }}
                    >
                      전문 보기
                    </button>
                  </div>
                  <div style={{
                    fontSize: '12px',
                    lineHeight: '1.6',
                    color: '#6b7280',
                    maxHeight: '100px',
                    overflowY: 'auto'
                  }}>
                    <p style={{ marginBottom: '6px' }}>• QR코드 기반 주문 시스템 제공</p>
                    <p style={{ marginBottom: '6px' }}>• POS 연동을 통한 실시간 주문 처리</p>
                    <p style={{ marginBottom: '6px' }}>• 개인정보는 서비스 제공 목적으로만 사용</p>
                    <p style={{ marginBottom: '6px' }}>• 제작된 QR스티커는 요청하신 수량으로 배송</p>
                    <p>• 서비스 문의: 평일 09:00-18:00 고객센터 이용</p>
                  </div>
                </div>
                
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={formData.terms_agreement}
                    onChange={(e) => handleInputChange('terms_agreement', e.target.checked)}
                    style={{
                      width: '16px',
                      height: '16px',
                      accentColor: '#FF3D00'
                    }}
                  />
                  <span style={{ fontSize: '13px', color: '#374151', fontWeight: '500' }}>
                    위 이용약관을 읽고 동의합니다 <span style={{ color: '#ef4444' }}>*</span>
                  </span>
                </label>
                {errors.terms_agreement && (
                  <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', marginLeft: '24px' }}>
                    {errors.terms_agreement}
                  </p>
                )}
              </div>

              {/* 버튼 */}
              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end'
              }}>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={submitting}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#f8fafc',
                    color: '#374151',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.6 : 1
                  }}
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: submitting ? '#9ca3af' : '#FF3D00',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {submitting && (
                    <div style={{
                      width: '14px',
                      height: '14px',
                      border: '2px solid #ffffff40',
                      borderTopColor: '#ffffff',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                  )}
                  {submitting ? '제출 중...' : (hasExistingData ? '동의서 수정' : '동의서 제출')}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* 닫기 확인 모달 */}
      {showCloseConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                backgroundColor: '#FEF3C7',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <div>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#111827',
                  margin: '0 0 4px 0'
                }}>
                  작성 중인 내용이 있습니다
                </h3>
                <p style={{
                  fontSize: '14px',
                  color: '#6B7280',
                  margin: 0
                }}>
                  저장되지 않은 내용은 사라집니다. 정말 닫으시겠습니까?
                </p>
              </div>
            </div>
            
            <div style={{
              display: 'flex',
              gap: '8px',
              marginTop: '20px'
            }}>
              <button
                onClick={() => setShowCloseConfirm(false)}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#F9FAFB';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'white';
                }}
              >
                계속 작성
              </button>
              <button
                onClick={confirmClose}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  backgroundColor: '#EF4444',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'white',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#DC2626';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#EF4444';
                }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsentFormModal;