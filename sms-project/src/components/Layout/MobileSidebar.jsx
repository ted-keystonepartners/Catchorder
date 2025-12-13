import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const MobileSidebar = ({ isOpen, onClose, menuItems, user, onLogout }) => {
  const [expandedDropdowns, setExpandedDropdowns] = useState({});
  const location = useLocation();
  const navigate = useNavigate();

  const toggleDropdown = (menuName) => {
    setExpandedDropdowns(prev => ({
      ...prev,
      [menuName]: !prev[menuName]
    }));
  };

  const handleMenuClick = (path) => {
    navigate(path);
    onClose();
  };

  const handleSubMenuClick = (path) => {
    navigate(path);
    onClose();
    setExpandedDropdowns({});
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 전체 컨테이너 - 최상위 z-index */}
      <div 
        className="md:hidden fixed inset-0" 
        style={{ zIndex: 9999 }}
      >
        {/* 오버레이 */}
        <div
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
        />
        
        {/* 사이드바 본체 */}
        <div 
          className="absolute top-0 right-0 h-full w-72 bg-white shadow-xl overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 헤더 */}
          <div style={{
            padding: '16px',
            borderBottom: '1px solid #e5e7eb',
            backgroundColor: '#FF3D00',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{
              fontSize: '18px',
              fontWeight: '600',
              color: 'white'
            }}>
              메뉴
            </span>
            <button
              onClick={onClose}
              style={{
                padding: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <svg width="20" height="20" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 유저 정보 섹션 */}
          <div style={{
            padding: '16px',
            borderBottom: '1px solid #e5e7eb'
          }}>
            <div style={{
              padding: '12px',
              backgroundColor: '#f9fafb',
              borderRadius: '8px'
            }}>
              <p style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#111827',
                marginBottom: '4px'
              }}>
                {user?.name || '사용자'}
              </p>
              <p style={{
                fontSize: '13px',
                color: '#6b7280',
                marginBottom: '12px'
              }}>
                {user?.role === 'ADMIN' ? '관리자' : '일반 사용자'}
              </p>
              <button
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                style={{
                  width: '100%',
                  minHeight: '40px',
                  padding: '8px',
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#dc2626',
                  cursor: 'pointer'
                }}
              >
                로그아웃
              </button>
            </div>
          </div>

          {/* 메뉴 아이템들 */}
          <div style={{ padding: '16px' }}>
            {menuItems
              .filter(item => {
                if (item.children) {
                  return item.children.some(child => !child.adminOnly || user?.role === 'ADMIN');
                }
                if (item.adminOnly) {
                  return user?.role === 'ADMIN';
                }
                return true;
              })
              .map((item) => (
                <div key={item.name} style={{ marginBottom: '8px' }}>
                  {item.hasDropdown ? (
                    <>
                      {/* 드롭다운 부모 메뉴 */}
                      <button
                        onClick={() => toggleDropdown(item.name)}
                        style={{
                          width: '100%',
                          minHeight: '48px',
                          padding: '12px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          backgroundColor: item.children?.some(child => location.pathname === child.path) ? '#FFF5F3' : '#fff',
                          border: '1px solid',
                          borderColor: item.children?.some(child => location.pathname === child.path) ? '#FF3D00' : '#e5e7eb',
                          borderRadius: '8px',
                          fontSize: '15px',
                          fontWeight: '500',
                          color: item.children?.some(child => location.pathname === child.path) ? '#FF3D00' : '#374151',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {item.icon}
                          <span>{item.name}</span>
                        </div>
                        <svg 
                          width="16" 
                          height="16" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                          style={{
                            transform: expandedDropdowns[item.name] ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s'
                          }}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {/* 서브메뉴들 */}
                      {expandedDropdowns[item.name] && (
                        <div style={{ 
                          marginTop: '8px', 
                          marginLeft: '12px',
                          paddingLeft: '12px',
                          borderLeft: '2px solid #e5e7eb'
                        }}>
                          {item.children
                            ?.filter(child => !child.adminOnly || user?.role === 'ADMIN')
                            .map(child => (
                              <button
                                key={child.path}
                                onClick={() => handleSubMenuClick(child.path)}
                                style={{
                                  width: '100%',
                                  minHeight: '44px',
                                  padding: '10px 16px',
                                  marginBottom: '6px',
                                  display: 'block',
                                  textAlign: 'left',
                                  backgroundColor: location.pathname === child.path ? '#FFF5F3' : '#fff',
                                  border: '1px solid',
                                  borderColor: location.pathname === child.path ? '#FF3D00' : '#e5e7eb',
                                  borderRadius: '6px',
                                  fontSize: '14px',
                                  fontWeight: location.pathname === child.path ? '600' : '400',
                                  color: location.pathname === child.path ? '#FF3D00' : '#6b7280',
                                  cursor: 'pointer'
                                }}
                              >
                                {child.name}
                              </button>
                            ))}
                        </div>
                      )}
                    </>
                  ) : (
                    /* 일반 메뉴 */
                    <button
                      onClick={() => handleMenuClick(item.path)}
                      style={{
                        width: '100%',
                        minHeight: '48px',
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        backgroundColor: location.pathname === item.path ? '#FFF5F3' : '#fff',
                        border: '1px solid',
                        borderColor: location.pathname === item.path ? '#FF3D00' : '#e5e7eb',
                        borderRadius: '8px',
                        fontSize: '15px',
                        fontWeight: location.pathname === item.path ? '600' : '500',
                        color: location.pathname === item.path ? '#FF3D00' : '#374151',
                        cursor: 'pointer'
                      }}
                    >
                      {item.icon}
                      <span>{item.name}</span>
                    </button>
                  )}
                </div>
              ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default MobileSidebar;