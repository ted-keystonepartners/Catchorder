import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { apiClient } from '../api/client.js';
import { createManager } from '../api/managerApi.js';
import { formatPhoneInput } from '../utils/formatter.js';
import MainLayout from '../components/Layout/MainLayout.jsx';

const ManagerListPage = () => {
  const navigate = useNavigate();
  const { logout, user, isAdmin, isAuthenticated } = useAuth();
  
  // 디버깅: 현재 사용자와 권한 정보 출력 
  
  // isAdmin을 boolean 값으로 계산
  const userIsAdmin = isAdmin();
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddManagerModal, setShowAddManagerModal] = useState(false);
  const [newManager, setNewManager] = useState({
    name: '',
    email: '',
    phone: '',
    department: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // AWS DynamoDB에서 담당자 데이터 로드
  const loadManagersFromAWS = async () => {
    try {
      const response = await apiClient.get('/api/managers');
      
      if (response.success) {
        // API 응답 구조: { managers: Array, total: Number }
        const managers = response.data?.managers || [];
        return managers;
      } else {
        console.error('❌ 담당자 데이터 로드 실패:', response.error);
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('💥 AWS에서 담당자 데이터 로드 실패:', error);
      throw error;
    }
  };

  // 데이터 로딩
  useEffect(() => {
    const loadData = async () => {
      // 로그인 상태 확인 및 디버깅
      
      if (!user || !isAuthenticated) {
        navigate('/login');
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const managersData = await loadManagersFromAWS();
        setManagers(managersData);
      } catch (error) {
        console.error('담당자 데이터 로드 실패:', error);
        setManagers([]);
        // CORS 오류 등 API 연결 문제에 대한 사용자 알림
        if (error.message && error.message.includes('Failed to fetch')) {
          console.warn('API 서버 연결 실패: CORS 설정을 확인하세요');
        }
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [user, isAuthenticated]); // 로그인 상태가 변경될 때 다시 로드

  // AWS DynamoDB에 새 담당자 계정 생성
  const createUserAccount = async (managerData) => {
    try {
      const result = await createManager(managerData);
      if (result.success) {
        return result.data;
      } else {
        console.error('담당자 계정 생성 실패:', result.error);
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('담당자 계정 생성 실패:', error);
      throw error;
    }
  };

  // 이메일 유효성 검사
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // 전화번호 유효성 검사
  const validatePhoneNumber = (phone) => {
    const cleanPhone = phone.replace(/\s+/g, '');
    const patterns = [
      /^010-[0-9]{4}-[0-9]{4}$/,
      /^02-[0-9]{3,4}-[0-9]{4}$/,
      /^0[3-9][0-9]-[0-9]{3,4}-[0-9]{4}$/,
    ];
    return patterns.some(pattern => pattern.test(cleanPhone));
  };

  // 폼 유효성 검사
  const validateForm = () => {
    const errors = {};

    if (!newManager.name.trim()) {
      errors.name = '담당자명은 필수입니다.';
    }

    if (!newManager.email.trim()) {
      errors.email = '이메일은 필수입니다.';
    } else if (!validateEmail(newManager.email)) {
      errors.email = '올바른 이메일 형식이 아닙니다.';
    }

    if (!newManager.phone.trim()) {
      errors.phone = '연락처는 필수입니다.';
    } else if (!validatePhoneNumber(newManager.phone)) {
      errors.phone = '올바른 전화번호 형식이 아닙니다. (010-1234-5678)';
    }

    if (!newManager.department.trim()) {
      errors.department = '부서는 필수입니다.';
    }

    return errors;
  };

  // 전화번호 포맷팅

  // 입력 필드 변경
  const handleInputChange = (field, value) => {
    let formattedValue = value;
    
    if (field === 'phone') {
      formattedValue = formatPhoneInput(value, newManager.phone);
    }
    
    setNewManager({ ...newManager, [field]: formattedValue });
    if (formErrors[field]) {
      setFormErrors({ ...formErrors, [field]: '' });
    }
  };

  // 담당자 추가
  const handleAddManager = async () => {
    const errors = validateForm();
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setIsSubmitting(true);
    
    try {
      
      // AWS API를 통해 담당자 생성
      const managerData = {
        name: newManager.name,
        email: newManager.email,
        phone: newManager.phone,
        department: newManager.department,
        role: 'GENERAL',
        password: 'catchtable1!' // 기본 비밀번호 명시적 설정
      };
      
      const createdManager = await createUserAccount(managerData);
      
      // 성공적으로 생성된 경우
      alert(`담당자가 성공적으로 추가되었습니다.\n\n로그인 정보:\n• 아이디: ${newManager.email}\n• 비밀번호: catchtable1!`);
      
      // 담당자 목록 새로고침
      const managersData = await loadManagersFromAWS();
      setManagers(managersData);
      
      // 폼 리셋
      setNewManager({ name: '', email: '', phone: '', department: '' });
      setFormErrors({});
      setShowAddManagerModal(false);
    } catch (error) {
      console.error('담당자 추가 실패:', error);
      alert('담당자 추가에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 모달 닫기
  const handleCloseModal = () => {
    setNewManager({ name: '', email: '', phone: '', department: '' });
    setFormErrors({});
    setShowAddManagerModal(false);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafafa' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '32px', 
            height: '32px', 
            border: '2px solid #f97316', 
            borderTop: '2px solid transparent', 
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
          <p style={{ marginTop: '16px', fontSize: '14px', color: '#6b7280' }}>담당자 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <MainLayout>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 20px' }}>

        {/* 담당자 목록 */}
        <div style={{ 
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '24px'
          }}>
            <h3 style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              color: '#111827',
              margin: 0
            }}>
              담당자 목록
            </h3>
            <div style={{ 
              fontSize: '14px', 
              color: '#8b95a1',
              backgroundColor: '#f2f4f6',
              padding: '4px 8px',
              borderRadius: '12px',
              fontWeight: '500'
            }}>
              {managers.length}명
            </div>
          </div>

          {managers.length > 0 ? (
            <div style={{ 
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              overflow: 'hidden'
            }}>
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse',
                tableLayout: 'fixed'
              }}>
                <thead>
                  <tr style={{ 
                    backgroundColor: '#f8fafc',
                    borderBottom: '1px solid #e5e7eb'
                  }}>
                    <th style={{ 
                      width: '15%',
                      padding: '12px 16px',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#6b7280',
                      textAlign: 'left',
                      border: 'none'
                    }}>이름</th>
                    <th style={{ 
                      width: '25%',
                      padding: '12px 16px',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#6b7280',
                      textAlign: 'left',
                      border: 'none'
                    }}>이메일</th>
                    <th style={{ 
                      width: '15%',
                      padding: '12px 16px',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#6b7280',
                      textAlign: 'left',
                      border: 'none'
                    }}>연락처</th>
                    <th style={{ 
                      width: '10%',
                      padding: '12px 16px',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#6b7280',
                      textAlign: 'left',
                      border: 'none'
                    }}>부서</th>
                    <th style={{ 
                      width: '10%',
                      padding: '12px 16px',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#6b7280',
                      textAlign: 'center',
                      border: 'none'
                    }}>담당매장</th>
                    <th style={{ 
                      width: '10%',
                      padding: '12px 16px',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#6b7280',
                      textAlign: 'center',
                      border: 'none'
                    }}>상태</th>
                    <th style={{ 
                      width: '15%',
                      padding: '12px 16px',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#6b7280',
                      textAlign: 'left',
                      border: 'none'
                    }}>등록일</th>
                  </tr>
                </thead>
                <tbody>
                  {managers.map((manager, index) => (
                    <tr
                      key={manager.id || `manager-${index}`}
                      style={{
                        borderBottom: index < managers.length - 1 ? '1px solid #f1f5f9' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = '#f8fafc';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <td style={{ 
                        width: '15%',
                        padding: '16px',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#111827',
                        textAlign: 'left',
                        border: 'none'
                      }}>
                        {manager.name}
                      </td>
                      <td style={{ 
                        width: '25%',
                        padding: '16px',
                        fontSize: '14px',
                        color: '#6b7280',
                        textAlign: 'left',
                        border: 'none',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {manager.email}
                      </td>
                      <td style={{ 
                        width: '15%',
                        padding: '16px',
                        fontSize: '14px',
                        color: '#6b7280',
                        textAlign: 'left',
                        border: 'none'
                      }}>
                        {manager.phone}
                      </td>
                      <td style={{ 
                        width: '10%',
                        padding: '16px',
                        fontSize: '14px',
                        color: '#6b7280',
                        textAlign: 'left',
                        border: 'none'
                      }}>
                        {manager.department}
                      </td>
                      <td style={{ 
                        width: '10%',
                        padding: '16px',
                        fontSize: '14px',
                        color: '#111827',
                        fontWeight: '500',
                        textAlign: 'center',
                        border: 'none'
                      }}>
                        {manager.assignedStores}개
                      </td>
                      <td style={{ 
                        width: '10%',
                        padding: '16px',
                        fontSize: '14px',
                        textAlign: 'center',
                        border: 'none'
                      }}>
                        <span style={{ 
                          display: 'inline-block',
                          padding: '4px 8px',
                          backgroundColor: manager.status === 'ACTIVE' ? '#dcfce7' : '#f3f4f6',
                          color: manager.status === 'ACTIVE' ? '#166534' : '#6b7280',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}>
                          {manager.status === 'ACTIVE' ? '활성' : '비활성'}
                        </span>
                      </td>
                      <td style={{ 
                        width: '15%',
                        padding: '16px',
                        fontSize: '14px',
                        color: '#6b7280',
                        textAlign: 'left',
                        border: 'none'
                      }}>
                        {new Date(manager.createdAt).toLocaleDateString('ko-KR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ 
                width: '64px', 
                height: '64px', 
                backgroundColor: '#f3f4f6', 
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px'
              }}>
                <svg width="32" height="32" fill="#9ca3af" viewBox="0 0 24 24">
                  <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1L9 7V9H3V11H21V9ZM6 20V12H8V20H10V12H14V20H16V12H18V20H20V22H4V20H6Z"/>
                </svg>
              </div>
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: '500', 
                color: '#111827',
                margin: '0 0 8px 0'
              }}>
                등록된 담당자가 없습니다
              </h3>
              <p style={{ 
                fontSize: '14px', 
                color: '#6b7280',
                marginBottom: '16px'
              }}>
                첫 번째 담당자를 추가해보세요
              </p>
              {isAdmin() && (
                <button
                  onClick={() => setShowAddManagerModal(true)}
                  style={{
                    padding: '10px 16px',
                    backgroundColor: '#f97316',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  담당자 추가
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 담당자 추가 모달 */}
      {showAddManagerModal && (
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
            borderRadius: '16px',
            padding: '32px',
            width: '500px',
            maxWidth: '90vw'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ 
                fontSize: '20px', 
                fontWeight: '700', 
                color: '#111827',
                margin: 0
              }}>
                담당자 추가
              </h2>
              <button
                onClick={handleCloseModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  color: '#6b7280',
                  cursor: 'pointer'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
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
                  value={newManager.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="담당자명을 입력하세요"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: formErrors.name ? '1px solid #ef4444' : '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
                {formErrors.name && (
                  <p style={{
                    margin: '4px 0 0 0',
                    fontSize: '12px',
                    color: '#ef4444'
                  }}>
                    {formErrors.name}
                  </p>
                )}
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  이메일 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="email"
                  value={newManager.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="email@catchtable.co.kr"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: formErrors.email ? '1px solid #ef4444' : '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
                {formErrors.email && (
                  <p style={{
                    margin: '4px 0 0 0',
                    fontSize: '12px',
                    color: '#ef4444'
                  }}>
                    {formErrors.email}
                  </p>
                )}
              </div>

              <div>
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
                  value={newManager.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="010-0000-0000"
                  maxLength={13}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: formErrors.phone ? '1px solid #ef4444' : '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
                {formErrors.phone && (
                  <p style={{
                    margin: '4px 0 0 0',
                    fontSize: '12px',
                    color: '#ef4444'
                  }}>
                    {formErrors.phone}
                  </p>
                )}
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  부서 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={newManager.department}
                  onChange={(e) => handleInputChange('department', e.target.value)}
                  placeholder="영업팀"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: formErrors.department ? '1px solid #ef4444' : '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
                {formErrors.department && (
                  <p style={{
                    margin: '4px 0 0 0',
                    fontSize: '12px',
                    color: '#ef4444'
                  }}>
                    {formErrors.department}
                  </p>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                onClick={handleCloseModal}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                취소
              </button>
              <button
                onClick={handleAddManager}
                disabled={isSubmitting}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: isSubmitting ? '#fed7aa' : '#f97316',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer'
                }}
              >
                {isSubmitting ? '추가 중...' : '담당자 추가'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </MainLayout>
  );
};

export default ManagerListPage;