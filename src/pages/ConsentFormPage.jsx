/**
 * 공개 동의서 페이지
 * URL: /consent/:token
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getConsentForm, submitConsentForm } from '../api/consentApi.js';
import { formatPhoneInput } from '../utils/formatter.js';
import { useToast } from '../hooks/useToast.js';
import ToastContainer from '../components/ui/Toast.jsx';

const ConsentFormPage = () => {
  const { token: storeId } = useParams(); // URL에서는 여전히 :token이지만 storeId로 사용
  const navigate = useNavigate();
  const { success, error, toasts, removeToast } = useToast();

  // 상태 관리
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [storeInfo, setStoreInfo] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [formData, setFormData] = useState({
    respondent_name: '',
    respondent_phone: '',
    respondent_position: '',
    remote_install_date: '',
    remote_install_time: '',
    table_count: '',
    sticker_type: '', // 스탠드형, 부착형
    design_type: '', // Type A, Type B
    preferred_color: '',
    terms_agreement: false
  });
  const [errors, setErrors] = useState({});

  // 페이지 로드 시 매장 정보 조회
  useEffect(() => {
    const loadConsentForm = async () => {
      try {
        setLoading(true);
        const data = await getConsentForm(storeId);
        
        // 매장 정보 설정
        setStoreInfo({
          store_name: data.store_name || '매장 정보 없음',
          store_phone: data.store_phone || '',
          owner_name: data.owner_name || '담당자명 없음',
          link_id: data.link_id || '',
          store_id: data.store_id || storeId
        });
        
        // 폼 데이터 설정 (API에서 받은 데이터 우선, 없으면 기본값 유지)
        setFormData(prev => ({ 
          ...prev, 
          ...(data.form_fields || {})
        }));
        
        setApiError(null); // 성공 시 에러 초기화
      } catch (err) {
        console.error('매장 정보 조회 실패:', err);
        setApiError(err.message);
        
        // 에러 발생해도 기본 매장 정보는 설정
        setStoreInfo({
          store_name: '매장 정보를 불러올 수 없음',
          store_phone: '',
          owner_name: '담당자명 없음',
          link_id: '',
          token: token
        });
        
        // 기본 폼 데이터는 이미 초기화되어 있으므로 그대로 유지
      } finally {
        setLoading(false);
      }
    };

    if (storeId) {
      loadConsentForm();
    } else {
      setApiError('올바르지 않은 링크입니다.');
      setLoading(false);
    }
  }, [storeId]);

  // 입력 필드 변경 핸들러
  const handleInputChange = (field, value) => {
    if (field === 'respondent_phone') {
      value = formatPhoneInput(value, formData.respondent_phone);
    }

    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // 에러 제거
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // 폼 유효성 검사
  const validateForm = () => {
    const newErrors = {};

    if (!formData.respondent_name.trim()) {
      newErrors.respondent_name = '성명을 입력해주세요.';
    }

    if (!formData.respondent_phone.trim()) {
      newErrors.respondent_phone = '연락처를 입력해주세요.';
    } else if (!/^010-\d{4}-\d{4}$/.test(formData.respondent_phone)) {
      newErrors.respondent_phone = '010-0000-0000 형식으로 입력해주세요.';
    }

    if (!formData.respondent_position.trim()) {
      newErrors.respondent_position = '직책을 입력해주세요.';
    }

    if (!formData.remote_install_date) {
      newErrors.remote_install_date = '원격설치 가능날짜를 선택해주세요.';
    }

    if (!formData.remote_install_time) {
      newErrors.remote_install_time = '원격설치 가능시간을 선택해주세요.';
    }

    if (!formData.table_count.trim()) {
      newErrors.table_count = '테이블 수를 입력해주세요.';
    } else if (isNaN(formData.table_count) || parseInt(formData.table_count) < 1) {
      newErrors.table_count = '올바른 테이블 수를 입력해주세요.';
    }

    if (!formData.sticker_type) {
      newErrors.sticker_type = '스티커 타입을 선택해주세요.';
    }

    if (!formData.design_type) {
      newErrors.design_type = '디자인 타입을 선택해주세요.';
    }

    if (!formData.preferred_color.trim()) {
      newErrors.preferred_color = '원하는 컬러를 입력해주세요.';
    }

    if (!formData.terms_agreement) {
      newErrors.terms_agreement = '이용약관에 동의해주세요.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 폼 제출 핸들러
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      error('입력 정보를 확인해주세요.');
      return;
    }

    try {
      setSubmitting(true);
      await submitConsentForm(storeId, formData);
      success('동의서가 성공적으로 제출되었습니다.');
      setSubmitted(true);
    } catch (err) {
      console.error('제출 실패:', err);
      error(err.message || '제출 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  // 취소 핸들러
  const handleCancel = () => {
    if (window.confirm('작성 중인 내용이 삭제됩니다. 정말 취소하시겠습니까?')) {
      window.history.back();
    }
  };

  // 로딩 화면
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '16px',
          color: '#64748b'
        }}>
          <div style={{
            width: '20px',
            height: '20px',
            border: '2px solid #e2e8f0',
            borderTopColor: '#f97316',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          동의서 정보를 불러오는 중...
        </div>
        <style>
          {`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    );
  }

  // 로딩이 완료되면 항상 폼 표시 (에러 발생 시에도)

  // 제출 완료 화면
  if (submitted) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc',
        padding: '20px'
      }}>
        <div style={{
          maxWidth: '400px',
          width: '100%',
          textAlign: 'center',
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '40px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '16px'
          }}>✅</div>
          <h1 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: '#1f2937',
            marginBottom: '8px'
          }}>
            제출 완료!
          </h1>
          <p style={{
            color: '#6b7280',
            marginBottom: '24px'
          }}>
            감사합니다.<br />
            곧 담당자가 연락드리겠습니다.
          </p>
          <button
            onClick={() => {
              // 창이 스크립트로 열린 경우에만 닫기
              try {
                window.close();
              } catch (e) {
                // 닫을 수 없으면 페이지 새로고침 또는 홈으로 이동
                window.location.href = '/';
              }
            }}
            style={{
              padding: '8px 24px',
              backgroundColor: '#f97316',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            확인
          </button>
        </div>
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    );
  }

  // 메인 폼 화면
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        backgroundColor: 'white',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
      }}>
        {/* 헤더 */}
        <div style={{
          backgroundColor: '#f97316',
          color: 'white',
          padding: '24px',
          textAlign: 'center'
        }}>
          <h1 style={{
            fontSize: '24px',
            fontWeight: '600',
            margin: '0 0 8px 0'
          }}>
            캐치오더 온라인 가입동의서
          </h1>
          {storeInfo && (
            <div style={{
              fontSize: '14px',
              opacity: 0.9
            }}>
              <div>매장명: {storeInfo.store_name}</div>
              {storeInfo.owner_name && storeInfo.owner_name !== '담당자명 없음' && (
                <div>담당자: {storeInfo.owner_name}</div>
              )}
            </div>
          )}
        </div>

        {/* 에러 배너 */}
        {apiError && (
          <div style={{
            backgroundColor: '#fef2f2',
            borderLeft: '4px solid #ef4444',
            padding: '16px 24px',
            margin: '0',
            borderTop: '1px solid #e5e7eb',
            borderBottom: '1px solid #e5e7eb'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#dc2626',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              <span>⚠️</span>
              <span>{apiError}</span>
            </div>
            <div style={{
              marginTop: '4px',
              fontSize: '12px',
              color: '#7f1d1d'
            }}>
              매장 정보를 불러올 수 없지만, 아래 폼은 정상적으로 작성하실 수 있습니다.
            </div>
          </div>
        )}

        {/* 폼 */}
        <form onSubmit={handleSubmit} style={{ padding: '32px' }}>
          {/* 진행단계 설명 */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f8fafc',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ 
                  width: '32px', 
                  height: '32px', 
                  backgroundColor: '#3b82f6', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  margin: '0 auto 8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'white'
                }}>1</div>
                <div style={{ fontSize: '12px', color: '#374151', fontWeight: '500' }}>가입서작성</div>
              </div>
              <div style={{ width: '24px', height: '2px', backgroundColor: '#d1d5db', margin: '0 8px' }}></div>
              
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ 
                  width: '32px', 
                  height: '32px', 
                  backgroundColor: '#6b7280', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  margin: '0 auto 8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'white'
                }}>2</div>
                <div style={{ fontSize: '12px', color: '#374151', fontWeight: '500' }}>원격설치</div>
              </div>
              <div style={{ width: '24px', height: '2px', backgroundColor: '#d1d5db', margin: '0 8px' }}></div>
              
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ 
                  width: '32px', 
                  height: '32px', 
                  backgroundColor: '#6b7280', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  margin: '0 auto 8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'white'
                }}>3</div>
                <div style={{ fontSize: '12px', color: '#374151', fontWeight: '500' }}>제작</div>
              </div>
              <div style={{ width: '24px', height: '2px', backgroundColor: '#d1d5db', margin: '0 8px' }}></div>
              
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ 
                  width: '32px', 
                  height: '32px', 
                  backgroundColor: '#6b7280', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  margin: '0 auto 8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'white'
                }}>4</div>
                <div style={{ fontSize: '12px', color: '#374151', fontWeight: '500' }}>발송</div>
              </div>
            </div>
          </div>

          {/* 담당자 정보 */}
          <div style={{ 
            marginBottom: '32px',
            padding: '24px',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{
              display: 'grid',
              gap: '16px'
            }}>
              {/* 성명 */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  성명 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.respondent_name}
                  onChange={(e) => handleInputChange('respondent_name', e.target.value)}
                  placeholder="성명을 입력해주세요"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: errors.respondent_name ? '1px solid #ef4444' : '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    backgroundColor: 'white'
                  }}
                />
                {errors.respondent_name && (
                  <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                    {errors.respondent_name}
                  </p>
                )}
              </div>

              {/* 연락처 */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
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
                    padding: '12px',
                    border: errors.respondent_phone ? '1px solid #ef4444' : '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    backgroundColor: 'white'
                  }}
                />
                {errors.respondent_phone && (
                  <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                    {errors.respondent_phone}
                  </p>
                )}
              </div>

              {/* 직책 */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  직책 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.respondent_position}
                  onChange={(e) => handleInputChange('respondent_position', e.target.value)}
                  placeholder="직책을 입력해주세요 (예: 점장, 대표, 매니저)"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: errors.respondent_position ? '1px solid #ef4444' : '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    backgroundColor: 'white'
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

          {/* 원격설치 정보 */}
          <div style={{ 
            marginBottom: '32px',
            padding: '24px',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{
              display: 'grid',
              gap: '16px'
            }}>
              {/* 원격설치 가능날짜 */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  원격설치 가능날짜 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="date"
                  value={formData.remote_install_date}
                  onChange={(e) => handleInputChange('remote_install_date', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: errors.remote_install_date ? '1px solid #ef4444' : '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    backgroundColor: 'white'
                  }}
                />
                {errors.remote_install_date && (
                  <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                    {errors.remote_install_date}
                  </p>
                )}
              </div>

              {/* 원격설치 가능시간 */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  원격설치 가능시간 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="time"
                  value={formData.remote_install_time}
                  onChange={(e) => handleInputChange('remote_install_time', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: errors.remote_install_time ? '1px solid #ef4444' : '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    backgroundColor: 'white'
                  }}
                />
                {errors.remote_install_time && (
                  <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                    {errors.remote_install_time}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* QR 정보 */}
          <div style={{ 
            marginBottom: '32px',
            padding: '24px',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{
              display: 'grid',
              gap: '16px'
            }}>

              {/* 테이블 수 */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  테이블 수 (QR오더 스티커 제작에 필요함) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="number"
                  value={formData.table_count}
                  onChange={(e) => handleInputChange('table_count', e.target.value)}
                  placeholder="테이블 수를 입력해주세요"
                  min="1"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: errors.table_count ? '1px solid #ef4444' : '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    backgroundColor: 'white'
                  }}
                />
                {errors.table_count && (
                  <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                    {errors.table_count}
                  </p>
                )}
              </div>

              {/* 스티커 타입 선택 */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '12px'
                }}>
                  스티커 타입 선택 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                
                <div style={{ display: 'flex', gap: '16px' }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '16px',
                    border: formData.sticker_type === '스탠드형' ? '2px solid #f97316' : '1px solid #d1d5db',
                    borderRadius: '8px',
                    backgroundColor: formData.sticker_type === '스탠드형' ? '#fff7ed' : 'white',
                    cursor: 'pointer',
                    flex: 1
                  }}>
                    <input
                      type="radio"
                      name="sticker_type"
                      value="스탠드형"
                      checked={formData.sticker_type === '스탠드형'}
                      onChange={(e) => handleInputChange('sticker_type', e.target.value)}
                      style={{ margin: 0 }}
                    />
                    <span style={{ fontSize: '14px', fontWeight: '500' }}>스탠드형</span>
                  </label>
                  
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '16px',
                    border: formData.sticker_type === '부착형' ? '2px solid #f97316' : '1px solid #d1d5db',
                    borderRadius: '8px',
                    backgroundColor: formData.sticker_type === '부착형' ? '#fff7ed' : 'white',
                    cursor: 'pointer',
                    flex: 1
                  }}>
                    <input
                      type="radio"
                      name="sticker_type"
                      value="부착형"
                      checked={formData.sticker_type === '부착형'}
                      onChange={(e) => handleInputChange('sticker_type', e.target.value)}
                      style={{ margin: 0 }}
                    />
                    <span style={{ fontSize: '14px', fontWeight: '500' }}>부착형</span>
                  </label>
                </div>
                
                {errors.sticker_type && (
                  <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '8px' }}>
                    {errors.sticker_type}
                  </p>
                )}
              </div>

              {/* 디자인 타입 선택 */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '12px'
                }}>
                  디자인 타입 선택 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                
                {/* Type 이미지 표시 */}
                <div style={{
                  marginBottom: '16px',
                  textAlign: 'center',
                  padding: '16px',
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0'
                }}>
                  <div style={{
                    fontSize: '14px',
                    color: '#6b7280',
                    marginBottom: '12px'
                  }}>
                    Type A: 심플한 디자인 | Type B: 컬러풀한 디자인
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    <img 
                      src="/type.png"
                      alt="디자인 타입 참고 이미지"
                      style={{
                        maxWidth: '350px',
                        maxHeight: '250px',
                        width: '100%',
                        height: 'auto',
                        borderRadius: '4px',
                        border: '1px solid #e2e8f0',
                        cursor: 'pointer',
                        transition: 'transform 0.2s ease'
                      }}
                      onClick={() => {
                        const modal = document.createElement('div');
                        modal.style.cssText = `
                          position: fixed;
                          top: 0;
                          left: 0;
                          width: 100%;
                          height: 100%;
                          background: rgba(0, 0, 0, 0.8);
                          display: flex;
                          justify-content: center;
                          align-items: center;
                          z-index: 9999;
                          cursor: pointer;
                        `;
                        
                        const img = document.createElement('img');
                        img.src = '/type.png';
                        img.style.cssText = `
                          max-width: 90%;
                          max-height: 90%;
                          border-radius: 8px;
                          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                        `;
                        
                        modal.appendChild(img);
                        document.body.appendChild(modal);
                        
                        modal.onclick = () => {
                          document.body.removeChild(modal);
                        };
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'scale(1.02)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'scale(1)';
                      }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentElement.nextSibling.style.display = 'block';
                      }}
                    />
                  </div>
                  <p style={{ 
                    fontSize: '12px', 
                    color: '#9ca3af', 
                    margin: '8px 0 0 0',
                    display: 'none'
                  }}>
                    이미지를 불러올 수 없습니다
                  </p>
                  <p style={{ 
                    fontSize: '11px', 
                    color: '#9ca3af', 
                    margin: '8px 0 0 0'
                  }}>
                    클릭하여 크게 보기
                  </p>
                </div>
                
                <div style={{ display: 'flex', gap: '16px' }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '16px',
                    border: formData.design_type === 'Type A' ? '2px solid #f97316' : '1px solid #d1d5db',
                    borderRadius: '8px',
                    backgroundColor: formData.design_type === 'Type A' ? '#fff7ed' : 'white',
                    cursor: 'pointer',
                    flex: 1
                  }}>
                    <input
                      type="radio"
                      name="design_type"
                      value="Type A"
                      checked={formData.design_type === 'Type A'}
                      onChange={(e) => handleInputChange('design_type', e.target.value)}
                      style={{ margin: 0 }}
                    />
                    <span style={{ fontSize: '14px', fontWeight: '500' }}>Type A</span>
                  </label>
                  
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '16px',
                    border: formData.design_type === 'Type B' ? '2px solid #f97316' : '1px solid #d1d5db',
                    borderRadius: '8px',
                    backgroundColor: formData.design_type === 'Type B' ? '#fff7ed' : 'white',
                    cursor: 'pointer',
                    flex: 1
                  }}>
                    <input
                      type="radio"
                      name="design_type"
                      value="Type B"
                      checked={formData.design_type === 'Type B'}
                      onChange={(e) => handleInputChange('design_type', e.target.value)}
                      style={{ margin: 0 }}
                    />
                    <span style={{ fontSize: '14px', fontWeight: '500' }}>Type B</span>
                  </label>
                </div>
                
                {errors.design_type && (
                  <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '8px' }}>
                    {errors.design_type}
                  </p>
                )}
              </div>

              {/* 원하는 컬러 */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  원하는 컬러 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.preferred_color}
                  onChange={(e) => handleInputChange('preferred_color', e.target.value)}
                  placeholder="원하는 컬러를 입력해주세요 (예: 블루, 레드, 기본 컬러 등)"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: errors.preferred_color ? '1px solid #ef4444' : '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    backgroundColor: 'white'
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

          {/* 이용약관 동의 */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{
              padding: '20px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              marginBottom: '16px'
            }}>
              <div style={{
                maxHeight: '150px',
                overflowY: 'auto',
                fontSize: '13px',
                lineHeight: '1.6',
                color: '#374151'
              }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>캐치오더 서비스 이용약관</h4>
                <p style={{ marginBottom: '8px' }}>1. 본 서비스는 QR코드 기반 주문 시스템을 제공합니다.</p>
                <p style={{ marginBottom: '8px' }}>2. 원격설치를 통해 서비스를 설정하며, 고객의 협조가 필요합니다.</p>
                <p style={{ marginBottom: '8px' }}>3. 제작된 QR스티커는 요청하신 디자인과 수량에 따라 배송됩니다.</p>
                <p style={{ marginBottom: '8px' }}>4. 서비스 이용 중 문제 발생 시 고객센터로 연락해주시기 바랍니다.</p>
                <p style={{ marginBottom: '8px' }}>5. 개인정보는 서비스 제공 목적으로만 사용되며 관련 법령에 따라 보호됩니다.</p>
              </div>
            </div>

            <div>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={formData.terms_agreement}
                  onChange={(e) => handleInputChange('terms_agreement', e.target.checked)}
                  style={{
                    width: '18px',
                    height: '18px',
                    accentColor: '#f97316'
                  }}
                />
                <span style={{
                  fontSize: '14px',
                  color: '#374151'
                }}>
                  위 이용약관을 읽고 동의합니다 <span style={{ color: '#ef4444' }}>*</span>
                </span>
              </label>
              {errors.terms_agreement && (
                <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '8px' }}>
                  {errors.terms_agreement}
                </p>
              )}
            </div>
          </div>

          {/* 버튼 */}
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end'
          }}>
            <button
              type="button"
              onClick={handleCancel}
              disabled={submitting}
              style={{
                padding: '12px 24px',
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
                padding: '12px 24px',
                backgroundColor: submitting ? '#9ca3af' : '#f97316',
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
                  width: '16px',
                  height: '16px',
                  border: '2px solid #ffffff40',
                  borderTopColor: '#ffffff',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
              )}
              {submitting ? '제출 중...' : '가입동의서 제출'}
            </button>
          </div>
        </form>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default ConsentFormPage;