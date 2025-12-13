import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const NavItem = ({ to, icon, label }) => {
    const isActive = location.pathname === to || 
                     (to === '/stores' && location.pathname.startsWith('/stores')) ||
                     (to === '/schedule' && location.pathname.startsWith('/schedule'));
    
    return (
      <button
        onClick={() => navigate(to)}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          padding: '8px 16px',
          background: 'none',
          border: 'none',
          color: isActive ? '#FF3D00' : '#9ca3af',
          fontSize: '11px',
          fontWeight: isActive ? '600' : '400',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
      >
        <div style={{ 
          width: '24px', 
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {React.cloneElement(icon, {
            style: { 
              width: '20px', 
              height: '20px',
              stroke: isActive ? '#FF3D00' : '#9ca3af',
              fill: 'none',
              strokeWidth: isActive ? 2.5 : 2
            }
          })}
        </div>
        <span>{label}</span>
      </button>
    );
  };

  return (
    <nav className="md:hidden" style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: '60px',
      backgroundColor: 'white',
      borderTop: '1px solid #e5e7eb',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      zIndex: 100,
      paddingBottom: 'env(safe-area-inset-bottom)',
      boxShadow: '0 -1px 3px rgba(0, 0, 0, 0.05)'
    }}>
      <NavItem 
        to="/dashboard" 
        icon={
          <svg viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        } 
        label="홈" 
      />
      <NavItem 
        to="/stores" 
        icon={
          <svg viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        } 
        label="매장관리" 
      />
      <NavItem 
        to="/schedule" 
        icon={
          <svg viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        } 
        label="방문일정" 
      />
    </nav>
  );
};

export default MobileBottomNav;