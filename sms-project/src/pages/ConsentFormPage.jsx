/**
 * 공개 동의서 페이지
 * URL: /consent/:token
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getConsentForm, submitConsentForm, getConsentResponses } from '../api/consentApi.js';
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
  const [hasExistingData, setHasExistingData] = useState(false);
  const [lastSubmittedAt, setLastSubmittedAt] = useState(null);
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
        
        // 기존 동의서 응답 조회 (인증 없이는 실패할 수 있음)
        try {
          console.log('📋 동의서 응답 조회 시도...');
          const responsesData = await getConsentResponses(storeId, 1, 10);
          
          if (responsesData && responsesData.responses && responsesData.responses.length > 0) {
            const latestResponse = responsesData.responses[0]; // 가장 최근 응답
            console.log('✅ 기존 응답 발견:', latestResponse);
            
            // 기존 응답 데이터로 폼 채우기
            setFormData({
              respondent_name: latestResponse.respondent_name || '',
              respondent_phone: latestResponse.respondent_phone || '',
              respondent_position: latestResponse.respondent_position || '',
              remote_install_date: latestResponse.remote_install_date || '',
              remote_install_time: latestResponse.remote_install_time || '',
              table_count: latestResponse.table_count || '',
              sticker_type: latestResponse.sticker_type || '',
              design_type: latestResponse.design_type || '',
              preferred_color: latestResponse.preferred_color || '',
              terms_agreement: false // 항상 다시 동의해야 함
            });
            
            setHasExistingData(true);
            setLastSubmittedAt(latestResponse.submitted_at);
            
            const submittedDate = new Date(latestResponse.submitted_at).toLocaleDateString('ko-KR');
            success(`이전에 제출된 동의서 정보를 불러왔습니다. (제출일: ${submittedDate})`);
          } else {
            console.log('📝 기존 응답 없음 - 빈 폼 표시');
            if (data.form_fields) {
              setFormData(data.form_fields);
            }
            setHasExistingData(false);
            setLastSubmittedAt(null);
          }
        } catch (err) {
          console.log('⚠️ 동의서 응답 조회 실패 (인증 없는 접근일 수 있음):', err.message);
          // 실패 시 기본 폼 데이터 사용
          if (data.form_fields) {
            setFormData(data.form_fields);
          }
          setHasExistingData(false);
          setLastSubmittedAt(null);
        }
        
        setApiError(null); // 성공 시 에러 초기화
      } catch (err) {
        console.error('매장 정보 조회 실패:', err);
        console.error('에러 상세:', err.message);
        
        let errorMessage = '매장 정보를 불러올 수 없습니다.';
        if (err.message.includes('400')) {
          errorMessage = '유효하지 않은 링크입니다. 링크를 다시 확인해주세요.';
        } else if (err.message.includes('404')) {
          errorMessage = '매장 정보를 찾을 수 없습니다.';
        } else if (err.message.includes('network')) {
          errorMessage = '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
        }
        
        setApiError(errorMessage);
        
        // 에러 발생해도 기본 매장 정보는 설정
        setStoreInfo({
          store_name: '매장 정보를 불러올 수 없음',
          store_phone: '',
          owner_name: '담당자명 없음',
          link_id: '',
          token: storeId
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

    const posIdStr = String(formData.remote_install_date || '');
    if (!posIdStr.trim()) {
      newErrors.remote_install_date = 'POS 아이디를 입력해주세요.';
    }

    const posPasswordStr = String(formData.remote_install_time || '');
    if (!posPasswordStr.trim()) {
      newErrors.remote_install_time = 'POS 패스워드를 입력해주세요.';
    }

    const tableCountStr = String(formData.table_count || '');
    if (!tableCountStr.trim()) {
      newErrors.table_count = '테이블 수를 입력해주세요.';
    } else if (isNaN(tableCountStr) || parseInt(tableCountStr) < 1) {
      newErrors.table_count = '올바른 테이블 수를 입력해주세요.';
    }

    const storeCodeStr = String(formData.sticker_type || '');
    if (!storeCodeStr.trim()) {
      newErrors.sticker_type = '매장코드를 입력해주세요.';
    }

    const agencyNameStr = String(formData.design_type || '');
    if (!agencyNameStr.trim()) {
      newErrors.design_type = '대리점명을 입력해주세요.';
    }

    const agencyPhoneStr = String(formData.preferred_color || '');
    if (!agencyPhoneStr.trim()) {
      newErrors.preferred_color = '대리점 연락처를 입력해주세요.';
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
      
      // 수정인지 신규 제출인지에 따라 다른 메시지 표시
      if (hasExistingData) {
        success('동의서가 성공적으로 수정되었습니다.');
      } else {
        success('동의서가 성공적으로 제출되었습니다.');
      }
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
            borderTopColor: '#FF3D00',
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
              backgroundColor: '#FF3D00',
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
          backgroundColor: '#FF3D00',
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
          {/* 기존 데이터 알림 배너 */}
          {hasExistingData && lastSubmittedAt && (
            <div style={{
              backgroundColor: '#e0f2fe',
              borderLeft: '4px solid #0ea5e9',
              padding: '16px',
              marginBottom: '24px',
              borderRadius: '4px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#0369a1',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                <span>ℹ️</span>
                <span>이전에 제출된 정보를 불러왔습니다</span>
              </div>
              <div style={{
                marginTop: '4px',
                fontSize: '13px',
                color: '#075985'
              }}>
                마지막 제출일: {new Date(lastSubmittedAt).toLocaleString('ko-KR', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
              <div style={{
                marginTop: '8px',
                fontSize: '12px',
                color: '#64748b'
              }}>
                필요한 항목을 수정한 후 다시 제출하시면 정보가 업데이트됩니다.
              </div>
            </div>
          )}
          
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
                  backgroundColor: '#FF3D00', 
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

          {/* POS 관련 정보 */}
          <div style={{ 
            marginBottom: '32px',
            padding: '24px',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #e2e8f0'
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              marginBottom: '16px',
              color: '#374151'
            }}>POS 관련 정보</h3>
            <div style={{
              display: 'grid',
              gap: '16px'
            }}>
              {/* POS 아이디 */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  POS 아이디 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.remote_install_date}
                  onChange={(e) => handleInputChange('remote_install_date', e.target.value)}
                  placeholder="POS 아이디를 입력해주세요"
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

              {/* POS 패스워드 */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  POS 패스워드 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.remote_install_time}
                  onChange={(e) => handleInputChange('remote_install_time', e.target.value)}
                  placeholder="POS 패스워드를 입력해주세요"
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

              {/* 매장코드 */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  매장코드 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.sticker_type}
                  onChange={(e) => handleInputChange('sticker_type', e.target.value)}
                  placeholder="매장코드를 입력해주세요"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: errors.sticker_type ? '1px solid #ef4444' : '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    backgroundColor: 'white'
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
            marginBottom: '32px',
            padding: '24px',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #e2e8f0'
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              marginBottom: '16px',
              color: '#374151'
            }}>대리점 관련 정보</h3>
            <div style={{
              display: 'grid',
              gap: '16px'
            }}>
              {/* 대리점명 */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  대리점명 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.design_type}
                  onChange={(e) => handleInputChange('design_type', e.target.value)}
                  placeholder="대리점명을 입력해주세요"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: errors.design_type ? '1px solid #ef4444' : '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    backgroundColor: 'white'
                  }}
                />
                {errors.design_type && (
                  <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                    {errors.design_type}
                  </p>
                )}
              </div>

              {/* 대리점 연락처 */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  대리점 연락처 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.preferred_color}
                  onChange={(e) => handleInputChange('preferred_color', e.target.value)}
                  placeholder="대리점 연락처를 입력해주세요"
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

          {/* QR 스티커 정보 */}
          <div style={{ 
            marginBottom: '32px',
            padding: '24px',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #e2e8f0'
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              marginBottom: '16px',
              color: '#374151'
            }}>QR 스티커 정보</h3>

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
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px'
              }}>
                <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', margin: 0 }}>캐치오더 서비스 이용약관</h4>
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
                      padding: 32px;
                      max-width: 700px;
                      max-height: 85vh;
                      overflow-y: auto;
                      width: 90%;
                      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                    `;
                    
                    content.innerHTML = `
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; border-bottom: 2px solid #f3f4f6; padding-bottom: 16px;">
                        <h2 style="font-size: 22px; font-weight: 700; color: #111827; margin: 0;">캐치오더 서비스 이용약관</h2>
                        <button onclick="this.closest('div[style*='position: fixed']').remove()" style="background: none; border: none; font-size: 28px; cursor: pointer; color: #6b7280; padding: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 6px; transition: all 0.2s;" onmouseover="this.style.backgroundColor='#f3f4f6'" onmouseout="this.style.backgroundColor='transparent'">×</button>
                      </div>
                      <div style="font-size: 15px; line-height: 1.8; color: #374151;">
                        <h3 style="font-size: 17px; font-weight: 600; margin-top: 20px; margin-bottom: 12px; color: #FF3D00;">제1조 (목적)</h3>
                        <p style="margin-bottom: 16px; padding-left: 16px;">본 약관은 캐치오더(이하 "회사")가 제공하는 QR 주문 서비스(이하 "서비스")의 이용과 관련하여 회사와 고객 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.</p>
                        
                        <h3 style="font-size: 17px; font-weight: 600; margin-top: 20px; margin-bottom: 12px; color: #FF3D00;">제2조 (서비스 내용)</h3>
                        <div style="padding-left: 16px; margin-bottom: 16px;">
                          <p style="margin-bottom: 10px;">1. 회사는 QR코드 기반의 테이블 주문 시스템을 제공합니다.</p>
                          <p style="margin-bottom: 10px;">2. POS 시스템과 연동하여 실시간 주문 처리가 가능합니다.</p>
                          <p style="margin-bottom: 10px;">3. 매장 운영에 필요한 관리 도구를 제공합니다.</p>
                          <p style="margin-bottom: 10px;">4. 주문 데이터 분석 및 통계 기능을 제공합니다.</p>
                        </div>
                        
                        <h3 style="font-size: 17px; font-weight: 600; margin-top: 20px; margin-bottom: 12px; color: #FF3D00;">제3조 (서비스 설치 및 설정)</h3>
                        <div style="padding-left: 16px; margin-bottom: 16px;">
                          <p style="margin-bottom: 10px;">1. 서비스 설치는 원격으로 진행되며, 고객의 협조가 필요합니다.</p>
                          <p style="margin-bottom: 10px;">2. POS 연동을 위해 POS 아이디, 패스워드, 매장코드 등의 정보를 정확히 제공해야 합니다.</p>
                          <p style="margin-bottom: 10px;">3. 설치 일정은 상호 협의하여 결정하며, 일정 변경 시 사전 통보가 필요합니다.</p>
                          <p style="margin-bottom: 10px;">4. 설치 후 정상 작동 확인을 위한 테스트를 진행합니다.</p>
                        </div>
                        
                        <h3 style="font-size: 17px; font-weight: 600; margin-top: 20px; margin-bottom: 12px; color: #FF3D00;">제4조 (QR 스티커 제작 및 배송)</h3>
                        <div style="padding-left: 16px; margin-bottom: 16px;">
                          <p style="margin-bottom: 10px;">1. QR 스티커는 고객이 요청한 테이블 수량에 맞춰 제작됩니다.</p>
                          <p style="margin-bottom: 10px;">2. 제작된 스티커는 지정된 주소로 배송되며, 배송기간은 약 3-5일 소요됩니다.</p>
                          <p style="margin-bottom: 10px;">3. 스티커 분실 또는 파손 시 재발급이 가능하며, 추가 비용이 발생할 수 있습니다.</p>
                          <p style="margin-bottom: 10px;">4. 배송지 주소 변경은 배송 전까지 가능합니다.</p>
                        </div>
                        
                        <h3 style="font-size: 17px; font-weight: 600; margin-top: 20px; margin-bottom: 12px; color: #FF3D00;">제5조 (개인정보보호)</h3>
                        <div style="padding-left: 16px; margin-bottom: 16px;">
                          <p style="margin-bottom: 10px;">1. 회사는 고객의 개인정보를 서비스 제공 목적으로만 사용합니다.</p>
                          <p style="margin-bottom: 10px;">2. 수집된 개인정보는 관련 법령에 따라 안전하게 보호 및 관리됩니다.</p>
                          <p style="margin-bottom: 10px;">3. 고객의 동의 없이 제3자에게 개인정보를 제공하지 않습니다.</p>
                          <p style="margin-bottom: 10px;">4. 서비스 해지 시 고객의 개인정보는 지체 없이 파기됩니다.</p>
                        </div>
                        
                        <h3 style="font-size: 17px; font-weight: 600; margin-top: 20px; margin-bottom: 12px; color: #FF3D00;">제6조 (서비스 이용료 및 결제)</h3>
                        <div style="padding-left: 16px; margin-bottom: 16px;">
                          <p style="margin-bottom: 10px;">1. 서비스 이용료는 별도 계약에 따라 책정됩니다.</p>
                          <p style="margin-bottom: 10px;">2. 이용료는 월 단위로 청구되며, 매월 지정된 날짜에 결제됩니다.</p>
                          <p style="margin-bottom: 10px;">3. 이용료 미납 시 서비스 이용이 제한될 수 있습니다.</p>
                          <p style="margin-bottom: 10px;">4. 요금제 변경은 고객센터를 통해 상담 후 가능합니다.</p>
                        </div>
                        
                        <h3 style="font-size: 17px; font-weight: 600; margin-top: 20px; margin-bottom: 12px; color: #FF3D00;">제7조 (고객지원)</h3>
                        <div style="padding-left: 16px; margin-bottom: 16px;">
                          <p style="margin-bottom: 10px;">1. 서비스 이용 중 문제 발생 시 고객센터로 연락 바랍니다.</p>
                          <p style="margin-bottom: 10px;">2. 고객센터 운영시간: 평일 09:00 ~ 18:00 (주말 및 공휴일 제외)</p>
                          <p style="margin-bottom: 10px;">3. 전화: 1588-0000 / 이메일: support@catchorder.com</p>
                          <p style="margin-bottom: 10px;">4. 긴급 장애 대응은 24시간 핫라인을 통해 지원됩니다.</p>
                        </div>
                        
                        <h3 style="font-size: 17px; font-weight: 600; margin-top: 20px; margin-bottom: 12px; color: #FF3D00;">제8조 (약관의 변경)</h3>
                        <div style="padding-left: 16px; margin-bottom: 16px;">
                          <p style="margin-bottom: 10px;">1. 회사는 필요에 따라 본 약관을 변경할 수 있습니다.</p>
                          <p style="margin-bottom: 10px;">2. 약관 변경 시 최소 7일 전에 고객에게 통지합니다.</p>
                          <p style="margin-bottom: 10px;">3. 변경된 약관에 동의하지 않을 경우 서비스 이용을 중단할 수 있습니다.</p>
                        </div>
                        
                        <div style="margin-top: 32px; padding-top: 20px; border-top: 2px solid #f3f4f6;">
                          <p style="font-size: 14px; color: #6b7280; text-align: center;">
                            <strong>본 약관은 2024년 1월 1일부터 시행됩니다.</strong><br>
                            마지막 업데이트: 2024년 12월 1일
                          </p>
                        </div>
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
                    background: '#FF3D00',
                    border: 'none',
                    color: 'white',
                    padding: '6px 16px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontWeight: '500'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.backgroundColor = '#E63600';
                    e.target.style.transform = 'translateY(-1px)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.backgroundColor = '#FF3D00';
                    e.target.style.transform = 'translateY(0)';
                  }}
                >
                  전문 보기
                </button>
              </div>
              <div style={{
                fontSize: '13px',
                lineHeight: '1.7',
                color: '#4b5563',
                backgroundColor: 'white',
                padding: '12px',
                borderRadius: '6px',
                maxHeight: '120px',
                overflowY: 'auto'
              }}>
                <p style={{ marginBottom: '8px' }}>✓ QR코드 기반 테이블 주문 시스템 제공</p>
                <p style={{ marginBottom: '8px' }}>✓ POS 연동을 통한 실시간 주문 처리</p>
                <p style={{ marginBottom: '8px' }}>✓ 개인정보는 서비스 제공 목적으로만 사용</p>
                <p style={{ marginBottom: '8px' }}>✓ QR스티커 제작 및 배송 (3-5일 소요)</p>
                <p>✓ 고객센터: 평일 09:00-18:00 (1588-0000)</p>
              </div>
            </div>

            <div>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '6px',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#FFF0EC';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}>
                <input
                  type="checkbox"
                  checked={formData.terms_agreement}
                  onChange={(e) => handleInputChange('terms_agreement', e.target.checked)}
                  style={{
                    width: '18px',
                    height: '18px',
                    accentColor: '#FF3D00',
                    cursor: 'pointer'
                  }}
                />
                <span style={{
                  fontSize: '14px',
                  color: '#374151',
                  fontWeight: '500'
                }}>
                  위 이용약관을 읽고 동의합니다 <span style={{ color: '#ef4444' }}>*</span>
                </span>
              </label>
              {errors.terms_agreement && (
                <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '8px', marginLeft: '30px' }}>
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
                  width: '16px',
                  height: '16px',
                  border: '2px solid #ffffff40',
                  borderTopColor: '#ffffff',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
              )}
              {submitting ? '제출 중...' : (hasExistingData ? '가입동의서 수정' : '가입동의서 제출')}
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