import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useStores } from '../hooks/useStores.js';
import { apiClient } from '../api/client.js';
import MainLayout from '../components/Layout/MainLayout.jsx';
import { TossCard, TossStatsCard, TossEmptyState } from '../components/Layout/TossLayout.jsx';
import Button from '../components/ui/Button.jsx';
import StoreTable from '../components/Store/StoreTable.jsx';
import { SectionLoading } from '../components/ui/LoadingStates.jsx';
import DashboardCalendar from '../components/Calendar/DashboardCalendar.jsx';
import Icon from '../components/ui/Icon.jsx';
const DashboardPage = () => {
  const navigate = useNavigate();
  const { logout, user, isAdmin } = useAuth();
  const { stores = [], loading: storesLoading, error: storesError, fetchStores } = useStores();
  const [lastUpdated, setLastUpdated] = useState(new Date());
  
  // 담당자 목록
  const [managers, setManagers] = useState([]);

  // 담당자 목록 가져오기
  const fetchManagers = async () => {
    try {
      const response = await apiClient.get('/api/managers');
      
      if (response.success) {
        let managersData = [];
        
        if (response.data?.managers) {
          managersData = response.data.managers;
        } else if (Array.isArray(response.data)) {
          managersData = response.data;
        } else if (response.data?.data?.managers) {
          managersData = response.data.data.managers;
        }
        
        const managersWithEmail = managersData.filter(manager => 
          manager && manager.email && manager.email.trim() && manager.name && manager.name.trim()
        );
        
        setManagers(managersWithEmail);
      }
    } catch (error) {
      console.error('담당자 목록 가져오기 실패:', error);
    }
  };

  useEffect(() => {
    // Lambda Cold Start 대응: 초기 로드 시 지연 추가
    const delayedFetch = async () => {
      // 첫 번째 API 호출 전 500ms 대기
      await new Promise(resolve => setTimeout(resolve, 500));
      await fetchStores();
      
      // 두 번째 API 호출 전 추가 200ms 대기
      await new Promise(resolve => setTimeout(resolve, 200));
      await fetchManagers();
    };
    
    delayedFetch();
  }, []);

  const handleRefresh = useCallback(async () => {
    await fetchStores();
    setLastUpdated(new Date());
  }, [fetchStores]);

  const handleLogout = useCallback(async () => {
    await logout();
    navigate('/');
  }, [logout, navigate]);

  // 통계 계산 - stores가 변경될 때만 재계산
  const stats = useMemo(() => ({
    total: stores.length,
    preIntroduction: stores.filter(s => s.status === 'PRE_INTRODUCTION').length,
    inProgress: stores.filter(s => s.status === 'IN_PROGRESS').length,
    adoptionConfirmed: stores.filter(s => s.status === 'ADOPTION_CONFIRMED').length,
    signupCompleted: stores.filter(s => s.status === 'SIGNUP_COMPLETED').length
  }), [stores]);

  // 최근 3일 이내 수정한 매장 (updated_at 기준으로 정렬) - stores가 변경될 때만 재계산
  const recentlyModifiedStores = useMemo(() => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    return stores
      .filter(store => {
        const updateDate = new Date(store.updated_at || store.created_at || 0);
        return updateDate >= threeDaysAgo;
      })
      .sort((a, b) => {
        const dateA = new Date(a.updated_at || a.created_at || 0);
        const dateB = new Date(b.updated_at || b.created_at || 0);
        return dateB - dateA; // 최신 순으로 정렬
      });
  }, [stores]);

  if (storesLoading) {
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
          <p style={{ marginTop: '16px', fontSize: '14px', color: '#6b7280' }}>데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (storesError) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafafa' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 8px 0' }}>오류가 발생했습니다</h3>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>{storesError}</p>
          <button
            onClick={handleRefresh}
            style={{
              padding: '12px 24px',
              backgroundColor: '#f97316',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <MainLayout>

        {/* 통계 카드 */}
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{ 
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #e5e7eb',
            transition: 'transform 0.2s, box-shadow 0.2s'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  backgroundColor: '#f3f4f6', 
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px'
                }}>
                  <Icon name="dashboard" size={20} color="#6b7280" />
                </div>
                <p style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280', margin: '0 0 4px 0' }}>전체 매장</p>
                <p style={{ fontSize: '24px', fontWeight: '700', color: '#111827', margin: 0 }}>{stats.total}</p>
              </div>
            </div>
          </div>

          <div style={{ 
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  backgroundColor: '#fef3c7', 
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px'
                }}>
                  <Icon name="check" size={20} color="#d97706" />
                </div>
                <p style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280', margin: '0 0 4px 0' }}>진행중</p>
                <p style={{ fontSize: '24px', fontWeight: '700', color: '#d97706', margin: 0 }}>{stats.inProgress}</p>
              </div>
            </div>
          </div>

          <div style={{ 
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #fed7aa'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  backgroundColor: '#fed7aa', 
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px'
                }}>
                  <Icon name="check" size={20} color="#f97316" />
                </div>
                <p style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280', margin: '0 0 4px 0' }}>도입확정</p>
                <p style={{ fontSize: '24px', fontWeight: '700', color: '#f97316', margin: 0 }}>{stats.adoptionConfirmed}</p>
              </div>
            </div>
          </div>

          <div style={{ 
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #bbf7d0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  backgroundColor: '#bbf7d0', 
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px'
                }}>
                  <Icon name="checkSimple" size={20} color="#10b981" />
                </div>
                <p style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280', margin: '0 0 4px 0' }}>가입완료</p>
                <p style={{ fontSize: '24px', fontWeight: '700', color: '#10b981', margin: 0 }}>{stats.signupCompleted}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 캘린더 */}
        <div style={{ marginBottom: '24px' }}>
          <DashboardCalendar stores={stores} />
        </div>

        {/* 최근 매장 */}
        <div style={{ 
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid #e5e7eb',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              color: '#111827',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{ 
                width: '20px', 
                height: '20px', 
                backgroundColor: '#FF3D00', 
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Icon name="dashboard" size={12} color="white" />
              </div>
              최근 수정한 매장 (3일 이내)
            </h3>
          </div>

          {recentlyModifiedStores.length > 0 ? (
            <StoreTable
              stores={recentlyModifiedStores}
              loading={storesLoading}
              isAdmin={isAdmin()}
              managers={managers}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ 
                width: '48px', 
                height: '48px', 
                backgroundColor: '#f3f4f6', 
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <Icon name="dashboard" size={24} color="#9ca3af" />
              </div>
              <h3 style={{ 
                fontSize: '16px', 
                fontWeight: '500', 
                color: '#111827',
                margin: '0 0 8px 0'
              }}>
                최근 3일 내 수정된 매장이 없습니다
              </h3>
              <p style={{ 
                fontSize: '14px', 
                color: '#6b7280',
                marginBottom: '16px'
              }}>
                매장 정보를 수정하면 여기에 표시됩니다
              </p>
              <button
                onClick={() => navigate('/stores')}
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
                매장 관리로 이동
              </button>
            </div>
          )}
        </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </MainLayout>
  );
};

export default DashboardPage;