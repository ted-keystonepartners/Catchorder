import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import MainLayout from '../components/Layout/MainLayout.jsx';

const ComingSoonPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const featureName = location.state?.feature || '해당 기능';

  return (
    <MainLayout>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        textAlign: 'center',
        padding: '40px 20px'
      }}>
        {/* 아이콘 */}
        <div style={{
          width: '80px',
          height: '80px',
          backgroundColor: '#f3f4f6',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px'
        }}>
          <svg width="40" height="40" fill="#9ca3af" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </div>

        {/* 제목 */}
        <h1 style={{
          fontSize: '32px',
          fontWeight: '700',
          color: '#111827',
          marginBottom: '16px'
        }}>
          {featureName}
        </h1>

        {/* 설명 */}
        <p style={{
          fontSize: '18px',
          color: '#6b7280',
          marginBottom: '32px',
          maxWidth: '500px',
          lineHeight: '1.6'
        }}>
          해당 기능은 현재 개발 중입니다.<br />
          빠른 시일 내에 서비스를 제공할 예정입니다.
        </p>

        {/* 돌아가기 버튼 */}
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            padding: '12px 24px',
            backgroundColor: '#FF3D00',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#E65100'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#FF3D00'}
        >
          <svg width="16" height="16" fill="white" viewBox="0 0 24 24">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
          대시보드로 돌아가기
        </button>

        {/* 하단 정보 */}
        <div style={{
          marginTop: '48px',
          padding: '20px',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <p style={{
            fontSize: '14px',
            color: '#6b7280',
            margin: '0 0 8px 0'
          }}>
            기능 개발 관련 문의
          </p>
          <p style={{
            fontSize: '14px',
            color: '#FF3D00',
            fontWeight: '500',
            margin: 0
          }}>
            ted@catchtable.co.kr
          </p>
        </div>
      </div>
    </MainLayout>
  );
};

export default ComingSoonPage;