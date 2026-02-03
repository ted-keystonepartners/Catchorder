import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { useUIStore } from '../../context/uiStore.js';
import { storeApi } from '../../api/storeApi.js';
import MobileSidebar from './MobileSidebar';
import MobileBottomNav from './MobileBottomNav';

/**
 * MainLayout 컴포넌트
 * @param {Object} props
 * @param {React.ReactNode} props.children - 메인 콘텐츠
 * @param {string} props.searchTerm - 검색어
 * @param {function} props.setSearchTerm - 검색어 설정 함수
 * @param {boolean} props.showSearch - 검색창 표시 여부
 */
const MainLayout = ({ children, searchTerm, setSearchTerm, showSearch = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();
  const { notification, hideNotification } = useUIStore();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);

  // 헤더 검색 관련 상태
  const [headerSearchQuery, setHeaderSearchQuery] = useState('');
  const [headerSearchResults, setHeaderSearchResults] = useState([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [allStores, setAllStores] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef(null);
  const searchContainerRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // 매장 목록 로드 (최초 1회) - 검색용으로 전체 매장 조회
  useEffect(() => {
    const loadStores = async () => {
      try {
        // all=true: GENERAL 유저도 전체 매장 검색 가능
        const response = await storeApi.getStores({ all: true });
        if (response.success && response.data) {
          const stores = response.data.stores || response.data || [];
          setAllStores(stores);
        }
      } catch (err) {
        console.error('매장 목록 로드 실패:', err);
      }
    };
    loadStores();
  }, []);

  // 검색 필터링 (debounce 적용)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!headerSearchQuery.trim()) {
      setHeaderSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    setIsSearching(true);
    debounceTimerRef.current = setTimeout(() => {
      const query = headerSearchQuery.toLowerCase().trim();
      const filtered = allStores.filter(store => {
        const seq = (store.seq || store.store_id || '').toString().toLowerCase();
        const name = (store.name || store.store_name || '').toLowerCase();
        const phone = (store.phone || store.store_phone || '').toLowerCase();
        const address = (store.address || store.store_address || '').toLowerCase();
        const pos = (store.pos_system || '').toLowerCase();

        return seq.includes(query) ||
               name.includes(query) ||
               phone.includes(query) ||
               address.includes(query) ||
               pos.includes(query);
      }).slice(0, 10); // 최대 10개

      setHeaderSearchResults(filtered);
      setShowSearchDropdown(filtered.length > 0);
      setIsSearching(false);
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [headerSearchQuery, allStores]);

  // 검색 결과 클릭 핸들러
  const handleSearchResultClick = (store) => {
    const storeId = store.store_id || store.id;
    setHeaderSearchQuery('');
    setShowSearchDropdown(false);
    navigate(`/stores/${storeId}`);
  };

  // ESC 키 핸들러
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showSearchDropdown) {
        setShowSearchDropdown(false);
        searchInputRef.current?.blur();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showSearchDropdown]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside dropdown
      if (openDropdown && !event.target.closest('.dropdown-container')) {
        setOpenDropdown(null);
      }
      // Check if click is outside profile menu
      if (showProfileMenu && !event.target.closest('.profile-menu-container')) {
        setShowProfileMenu(false);
      }
      // Check if click is outside search container
      if (showSearchDropdown && !event.target.closest('.search-container')) {
        setShowSearchDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdown, showProfileMenu, showSearchDropdown]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const menuItems = [
    {
      name: 'QR오더',
      hasDropdown: true,
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      children: [
        { name: '가입신청', path: '/applications', adminOnly: true },
        { name: '매장관리', path: '/stores' },
        { name: '방문일정', path: '/schedule' },
        { name: '대리점관리', path: '/agencies', adminOnly: true }
      ]
    },
    {
      name: 'QR메뉴',
      hasDropdown: true,
      adminOnly: true, // 하위 메뉴 전체가 ADMIN 전용
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h0m-5 8h-2v-4m0-11v1m0 0h0m0 9h0m0-9h0m-4 9h2m-2 0h0m12 0h0m-4-9h0m0 9h0" />
        </svg>
      ),
      children: [
        { name: '가입신청', path: '/qr-menu', adminOnly: true },
        { name: '설치인증', path: '/qr-placements', adminOnly: true }
      ]
    },
    {
      name: 'AI 기능',
      hasDropdown: true,
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      children: [
        { name: '메뉴추출', path: '/menu-extract' },
        { name: '사진생성', path: '/menu-photo' },
        { name: '주문입력', path: '/order-upload', adminOnly: true }
      ]
    }
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <header style={{
        backgroundColor: '#FF3D00',
        borderBottom: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        paddingTop: 'env(safe-area-inset-top)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 24px',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          {/* 로고 - 왼쪽 */}
          <div 
            onClick={() => navigate('/dashboard')}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              cursor: 'pointer',
              transition: 'opacity 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
          >
            <div style={{
              width: '120px',
              height: '40px',
              backgroundImage: 'url(/logo_white.svg)',
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center'
            }}></div>
          </div>

          {/* 헤더 검색창 - 데스크탑만, 우측 정렬 */}
          <div style={{ flex: 1 }} /> {/* 스페이서 */}
          <div
            className="search-container hidden md:block"
            ref={searchContainerRef}
            style={{
              position: 'relative',
              width: '320px',
              marginRight: '16px'
            }}
          >
            <div style={{ position: 'relative' }}>
              <svg
                width="18"
                height="18"
                fill="none"
                stroke="#9ca3af"
                viewBox="0 0 24 24"
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none'
                }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Seq / 매장명 / 전화번호 / 주소 / POS 검색"
                value={headerSearchQuery}
                onChange={(e) => setHeaderSearchQuery(e.target.value)}
                onFocus={() => {
                  if (headerSearchResults.length > 0) {
                    setShowSearchDropdown(true);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '10px 16px 10px 40px',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
              />
              {isSearching && (
                <div style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)'
                }}>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid #e5e7eb',
                    borderTopColor: '#FF3D00',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                </div>
              )}
            </div>

            {/* 검색 결과 드롭다운 */}
            {showSearchDropdown && headerSearchResults.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: '8px',
                backgroundColor: 'white',
                borderRadius: '8px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                border: '1px solid #e5e7eb',
                maxHeight: '400px',
                overflowY: 'auto',
                zIndex: 200
              }}>
                <div style={{ padding: '8px 12px', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>
                    검색 결과 {headerSearchResults.length}개
                  </span>
                </div>
                {headerSearchResults.map((store, index) => (
                  <button
                    key={store.store_id || store.id || index}
                    onClick={() => handleSearchResultClick(store)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s',
                      borderBottom: index < headerSearchResults.length - 1 ? '1px solid #f9fafb' : 'none'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <div style={{
                      minWidth: '48px',
                      padding: '4px 8px',
                      backgroundColor: '#f3f4f6',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#374151',
                      textAlign: 'center'
                    }}>
                      {store.seq || store.store_id || '-'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#111827',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {store.name || store.store_name || '이름 없음'}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#6b7280',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {store.phone || store.store_phone || ''} {store.address || store.store_address ? `· ${(store.address || store.store_address).substring(0, 20)}...` : ''}
                      </div>
                    </div>
                    <svg width="16" height="16" fill="none" stroke="#9ca3af" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            )}

            {/* 검색 결과 없음 */}
            {showSearchDropdown && headerSearchQuery && headerSearchResults.length === 0 && !isSearching && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: '8px',
                backgroundColor: 'white',
                borderRadius: '8px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                border: '1px solid #e5e7eb',
                padding: '24px',
                textAlign: 'center',
                zIndex: 200
              }}>
                <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                  검색 결과가 없습니다
                </p>
              </div>
            )}
          </div>

          {/* 우측 메뉴 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* 로그아웃 버튼 (모바일) - 오른쪽 */}
            <button
              className="md:hidden flex order-last"
              onClick={handleLogout}
              style={{
                padding: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
              title="로그아웃"
            >
              <svg width="24" height="24" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>

            {/* 프로필 메뉴 - 데스크탑만 */}
            <div className="profile-menu-container hidden md:block" style={{ position: 'relative' }}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
                onMouseOut={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
              >
                <div style={{
                  width: '24px',
                  height: '24px',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  {user?.name?.charAt(0)}
                </div>
                <svg width="12" height="12" fill="white" viewBox="0 0 24 24">
                  <path d="M7 10l5 5 5-5z"/>
                </svg>
              </button>

              {/* 프로필 드롭다운 */}
              {showProfileMenu && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '8px',
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  border: '1px solid #e5e7eb',
                  minWidth: '200px',
                  zIndex: 50
                }}>
                  <div style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #f3f4f6'
                  }}>
                    <p style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#111827',
                      margin: '0 0 4px 0'
                    }}>
                      {user?.name}
                    </p>
                    <p style={{
                      fontSize: '12px',
                      color: '#6b7280',
                      margin: 0
                    }}>
                      {user?.role === 'ADMIN' ? '관리자' : '일반 사용자'}
                    </p>
                  </div>
                  {user?.role === 'ADMIN' && (
                    <>
                      <button
                        onClick={() => {
                          navigate('/managers');
                          setShowProfileMenu(false);
                        }}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '12px 16px',
                          color: '#374151',
                          backgroundColor: 'transparent',
                          border: 'none',
                          textAlign: 'left',
                          fontSize: '14px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                        onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                      >
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1L9 7V9H3V11H21V9ZM6 20V12H8V20H10V12H14V20H16V12H18V20H20V22H4V20H6Z"/>
                        </svg>
                        멤버 관리
                      </button>
                      <div style={{ 
                        height: '1px', 
                        backgroundColor: '#f3f4f6',
                        margin: '0'
                      }} />
                    </>
                  )}
                  <button
                    onClick={() => {
                      handleLogout();
                      setShowProfileMenu(false);
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '12px 16px',
                      color: '#dc2626',
                      backgroundColor: 'transparent',
                      border: 'none',
                      textAlign: 'left',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      borderRadius: user?.role === 'ADMIN' ? '0 0 8px 8px' : '0 0 8px 8px',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#fef2f2'}
                    onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                  >
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M16 17v-3H9v4l-5-5 5-5v4h7z"/>
                      <path d="M20 3h-9c-1.1 0-2 .9-2 2v4h2V5h9v14h-9v-4H9v4c0 1.1.9 2 2 2h9c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
                    </svg>
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* 모바일 검색창 - 헤더 안에 포함 */}
        {showSearch && (
          <div className="md:hidden" style={{
            padding: '0 16px 12px 16px',
            backgroundColor: '#FF3D00'
          }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 1
              }}>
                <svg width="18" height="18" fill="none" stroke="#9ca3af" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="매장명, 전화번호 검색"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  paddingLeft: '40px',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  backgroundColor: 'white',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
                onFocus={(e) => {
                  e.target.style.boxShadow = '0 0 0 3px rgba(255, 255, 255, 0.3)';
                }}
                onBlur={(e) => {
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>
        )}
      </header>

      {/* 메뉴바 - 데스크탑에서만 표시, 헤더 밑에 고정 */}
      <nav className="hidden md:block" style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        position: 'fixed',
        top: '65px',
        left: 0,
        right: 0,
        zIndex: 99
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '4px',
          padding: '8px 24px',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          {menuItems
            .filter(item => {
              // 부모 메뉴 자체가 adminOnly면 ADMIN만 표시
              if (item.adminOnly && user?.role !== 'ADMIN') {
                return false;
              }
              // 하위 메뉴 중 표시할 수 있는 것이 있는지 확인
              if (item.children) {
                return item.children.some(child => !child.adminOnly || user?.role === 'ADMIN');
              }
              return true;
            })
            .map((item) => (
            item.hasDropdown ? (
              <div key={item.name} className="dropdown-container" style={{ position: 'relative' }}>
                <button
                  onClick={() => setOpenDropdown(openDropdown === item.name ? null : item.name)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    backgroundColor: openDropdown === item.name || item.children?.some(child => location.pathname === child.path) ? '#FFF5F3' : 'transparent',
                    color: openDropdown === item.name || item.children?.some(child => location.pathname === child.path) ? '#FF3D00' : '#374151',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => {
                    if (openDropdown !== item.name && !item.children?.some(child => location.pathname === child.path)) {
                      e.currentTarget.style.backgroundColor = '#f3f4f6';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (openDropdown !== item.name && !item.children?.some(child => location.pathname === child.path)) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <span>{item.name}</span>
                  <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openDropdown === item.name && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: '4px',
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    border: '1px solid #e5e7eb',
                    minWidth: '140px',
                    zIndex: 50
                  }}>
                    {item.children?.filter(child => !child.adminOnly || user?.role === 'ADMIN').map(child => (
                      <button
                        key={child.path}
                        onClick={() => {
                          navigate(child.path);
                          setOpenDropdown(null);
                        }}
                        style={{
                          width: '100%',
                          display: 'block',
                          padding: '10px 16px',
                          color: location.pathname === child.path ? '#FF3D00' : '#374151',
                          backgroundColor: location.pathname === child.path ? '#FFF5F3' : 'transparent',
                          border: 'none',
                          textAlign: 'left',
                          fontSize: '14px',
                          fontWeight: location.pathname === child.path ? '600' : '500',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseOver={(e) => {
                          if (location.pathname !== child.path) {
                            e.target.style.backgroundColor = '#f3f4f6';
                          }
                        }}
                        onMouseOut={(e) => {
                          if (location.pathname !== child.path) {
                            e.target.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        {child.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <button
                key={item.name}
                onClick={() => navigate(item.path)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  backgroundColor: location.pathname === item.path ? '#FFF5F3' : 'transparent',
                  color: location.pathname === item.path ? '#FF3D00' : '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  if (location.pathname !== item.path) {
                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                  }
                }}
                onMouseOut={(e) => {
                  if (location.pathname !== item.path) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span>{item.name}</span>
              </button>
            )
          ))}
        </div>
      </nav>

      {/* New Mobile Sidebar Component - 데스크탑에서만 사용 */}
      <div className="hidden md:block">
        <MobileSidebar 
          isOpen={false}
          onClose={() => {}}
          menuItems={menuItems}
          user={user}
          onLogout={handleLogout}
        />
      </div>

      {/* Main content */}
      <main style={{
        padding: '24px',
        paddingTop: '130px', // 헤더(65px) + 메뉴바(50px) + 여백
        paddingBottom: '90px' // 모바일 하단 네비게이션 공간 확보
      }}
      className="md:pt-[130px] pt-[80px]"
      >
        <div style={{ maxWidth: '1152px', margin: '0 auto' }}>
          {children}
        </div>
      </main>

      {/* 모바일 하단 네비게이션 */}
      <div className="md:hidden">
        <MobileBottomNav />
      </div>

      {/* 클릭 시 메뉴 닫기 */}
      {showProfileMenu && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 40
          }}
          onClick={() => {
            setShowProfileMenu(false);
          }}
        />
      )}

      {/* Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 max-w-sm w-full">
          <div className={`rounded-lg p-4 shadow-lg ${
            notification.type === 'success' ? 'bg-green-50 border border-green-200' :
            notification.type === 'error' ? 'bg-red-50 border border-red-200' :
            notification.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
            'bg-blue-50 border border-blue-200'
          }`}>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {notification.type === 'success' && (
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
                {notification.type === 'error' && (
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
                {notification.type === 'warning' && (
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                )}
                {notification.type === 'info' && (
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="ml-3 flex-1">
                <p className={`text-sm font-medium ${
                  notification.type === 'success' ? 'text-green-800' :
                  notification.type === 'error' ? 'text-red-800' :
                  notification.type === 'warning' ? 'text-yellow-800' :
                  'text-blue-800'
                }`}>
                  {notification.message}
                </p>
              </div>
              <div className="ml-4 flex-shrink-0">
                <button
                  onClick={hideNotification}
                  className={`inline-flex ${
                    notification.type === 'success' ? 'text-green-400 hover:text-green-500' :
                    notification.type === 'error' ? 'text-red-400 hover:text-red-500' :
                    notification.type === 'warning' ? 'text-yellow-400 hover:text-yellow-500' :
                    'text-blue-400 hover:text-blue-500'
                  }`}
                >
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainLayout;