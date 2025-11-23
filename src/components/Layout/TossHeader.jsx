/**
 * 토스 스타일 헤더 컴포넌트
 */
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import Button from '../ui/Button.jsx';

const TossHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', label: '대시보드', icon: '📊' },
    { path: '/stores', label: '매장 관리', icon: '🏪' },
    ...(isAdmin ? [
      { path: '/managers', label: '관리자', icon: '👥' },
      { path: '/upload', label: '업로드', icon: '📤' }
    ] : [])
  ];

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50 backdrop-blur-sm bg-white/90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* 로고 영역 */}
          <div className="flex items-center space-x-8">
            <div 
              className="flex items-center space-x-2 cursor-pointer" 
              onClick={() => navigate('/dashboard')}
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">SMS</span>
              </div>
              <span className="font-bold text-xl text-gray-900">SMS 관리</span>
            </div>

            {/* 네비게이션 */}
            <nav className="hidden md:flex space-x-1">
              {navItems.map(item => {
                const isActive = location.pathname === item.path || 
                  (item.path === '/stores' && location.pathname.startsWith('/stores'));
                
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`
                      flex items-center space-x-2 px-4 py-2 rounded-xl font-medium text-sm transition-all duration-200
                      ${isActive 
                        ? 'bg-blue-50 text-blue-700 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }
                    `}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* 사용자 정보 & 로그아웃 */}
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-3">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {user?.name || user?.email}
                </div>
                <div className="text-xs text-gray-500">
                  {isAdmin ? '관리자' : '일반 사용자'}
                </div>
              </div>
              <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-medium">
                  {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-gray-500 hover:text-red-600"
            >
              로그아웃
            </Button>
          </div>
        </div>
      </div>

      {/* 모바일 네비게이션 */}
      <div className="md:hidden border-t border-gray-100 bg-white">
        <div className="px-4 py-3">
          <div className="flex space-x-1 overflow-x-auto">
            {navItems.map(item => {
              const isActive = location.pathname === item.path || 
                (item.path === '/stores' && location.pathname.startsWith('/stores'));
              
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`
                    flex flex-col items-center space-y-1 px-3 py-2 rounded-lg font-medium text-xs whitespace-nowrap transition-all
                    ${isActive 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }
                  `}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
};

export default TossHeader;