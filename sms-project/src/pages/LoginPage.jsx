import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { isValidEmail } from '../utils/validation.js';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading, error, clearError } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (error) {
      setFormErrors({});
    }
  }, [error]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    if (error) {
      clearError();
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.email.trim()) {
      errors.email = '이메일을 입력해주세요.';
    } else if (!isValidEmail(formData.email)) {
      errors.email = '올바른 이메일 형식을 입력해주세요.';
    }

    if (!formData.password.trim()) {
      errors.password = '비밀번호를 입력해주세요.';
    } else if (formData.password.length < 6) {
      errors.password = '비밀번호는 6자 이상이어야 합니다.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    
    try {
      const success = await login(formData.email, formData.password);
      if (success) {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      console.error('Login error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };


  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'white' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '32px', 
            height: '32px', 
            border: '2px solid #FF3D00', 
            borderTop: '2px solid transparent', 
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
          <p style={{ marginTop: '16px', fontSize: '14px', color: '#6b7280' }}>로그인 확인 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#fafafa', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{ 
        width: '100%', 
        maxWidth: '400px', 
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '32px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb'
      }}>
        {/* 로고 */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ 
            width: '64px', 
            height: '64px', 
            backgroundImage: 'url(/favicon.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            borderRadius: '12px',
            margin: '0 auto 16px'
          }}>
          </div>
          <h1 style={{ 
            fontSize: '24px', 
            fontWeight: '700', 
            color: '#111827',
            margin: 0,
            marginBottom: '8px'
          }}>
            캐치오더 관리시스템
          </h1>
          <p style={{ 
            fontSize: '14px', 
            color: '#6b7280',
            margin: 0
          }}>
            로그인하여 매장을 관리하세요
          </p>
        </div>

        {/* 로그인 폼 */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '6px'
            }}>
              이메일
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="이메일을 입력하세요"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '14px',
                border: formErrors.email ? '1px solid #ef4444' : '1px solid #d1d5db',
                borderRadius: '8px',
                outline: 'none',
                transition: 'border-color 0.2s',
                backgroundColor: 'white'
              }}
              onFocus={(e) => e.target.style.borderColor = '#FF3D00'}
              onBlur={(e) => e.target.style.borderColor = formErrors.email ? '#ef4444' : '#d1d5db'}
            />
            {formErrors.email && (
              <p style={{ 
                marginTop: '4px', 
                fontSize: '12px', 
                color: '#ef4444' 
              }}>
                {formErrors.email}
              </p>
            )}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '6px'
            }}>
              비밀번호
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="비밀번호를 입력하세요"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '14px',
                border: formErrors.password ? '1px solid #ef4444' : '1px solid #d1d5db',
                borderRadius: '8px',
                outline: 'none',
                transition: 'border-color 0.2s',
                backgroundColor: 'white'
              }}
              onFocus={(e) => e.target.style.borderColor = '#FF3D00'}
              onBlur={(e) => e.target.style.borderColor = formErrors.password ? '#ef4444' : '#d1d5db'}
            />
            {formErrors.password && (
              <p style={{ 
                marginTop: '4px', 
                fontSize: '12px', 
                color: '#ef4444' 
              }}>
                {formErrors.password}
              </p>
            )}
          </div>

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

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: '100%',
              height: '48px',
              backgroundColor: isSubmitting ? '#fed7aa' : '#FF3D00',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseOver={(e) => {
              if (!isSubmitting) e.target.style.backgroundColor = '#E65100';
            }}
            onMouseOut={(e) => {
              if (!isSubmitting) e.target.style.backgroundColor = '#FF3D00';
            }}
          >
            {isSubmitting ? (
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ 
                  width: '16px', 
                  height: '16px', 
                  border: '2px solid #ffffff', 
                  borderTop: '2px solid transparent', 
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  marginRight: '8px'
                }}></div>
                로그인 중...
              </div>
            ) : (
              '로그인'
            )}
          </button>
        </form>

        {/* 하단 정보 */}
        <div style={{ 
          textAlign: 'center', 
          marginTop: '24px',
          paddingTop: '20px',
          borderTop: '1px solid #f3f4f6'
        }}>
          <p style={{ 
            fontSize: '12px', 
            color: '#9ca3af',
            margin: '0 0 4px 0'
          }}>
            Version 1.0.0
          </p>
          <p style={{ 
            fontSize: '12px', 
            color: '#9ca3af',
            margin: 0
          }}>
            문의: ted@catchtable.co.kr
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;