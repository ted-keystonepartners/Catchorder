import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import Loading from './Common/Loading.jsx';

/**
 * AdminRoute 컴포넌트 - 관리자 권한이 필요한 라우트를 보호
 * @param {Object} props
 * @param {React.ReactNode} props.children - 보호할 컴포넌트
 */
const AdminRoute = ({ children }) => {
  const { isAuthenticated, isLoading, isAdmin } = useAuth();

  // 로딩 중일 때
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading text="권한 확인 중..." />
      </div>
    );
  }

  // 인증되지 않은 경우 로그인 페이지로 리다이렉트
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // 관리자가 아닌 경우 대시보드로 리다이렉트
  if (!isAdmin()) {
    return <Navigate to="/dashboard" replace />;
  }

  // 관리자인 경우 자식 컴포넌트 렌더링
  return children;
};

export default AdminRoute;