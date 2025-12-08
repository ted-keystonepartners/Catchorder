import React, { useState, useEffect } from 'react';
import MainLayout from '../components/Layout/MainLayout.jsx';
import DashboardCalendar from '../components/Calendar/DashboardCalendar.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useStores } from '../hooks/useStores.js';
import { apiClient } from '../api/client.js';
import { useToast } from '../hooks/useToast.js';
import ToastContainer from '../components/ui/Toast.jsx';

const SchedulePage = () => {
  const { isAdmin } = useAuth();
  const { stores, isLoading: storesLoading, fetchStores } = useStores();
  const { success, error: showError, toasts, removeToast } = useToast();

  // 통계 계산
  const calculateStats = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    let monthlyTotal = 0;
    let firstVisitPending = 0;
    let revisitPending = 0;
    let completed = 0;

    stores.forEach(store => {
      // 방문 예정일 확인
      if (store.visitScheduleDate) {
        const visitDate = new Date(store.visitScheduleDate);
        if (visitDate.getMonth() === currentMonth && visitDate.getFullYear() === currentYear) {
          monthlyTotal++;
          
          // 상태에 따라 분류
          if (store.status === 'VISIT_PENDING') {
            firstVisitPending++;
          } else if (store.status === 'VISIT_COMPLETED') {
            completed++;
          } else if (store.status === 'ADMIN_SETTING' || store.status === 'QR_LINKING' || store.status === 'QR_MENU_ONLY') {
            revisitPending++;
          }
        }
      }
      
      // 재방문 예정일 확인
      if (store.revisitScheduleDate) {
        const revisitDate = new Date(store.revisitScheduleDate);
        if (revisitDate.getMonth() === currentMonth && revisitDate.getFullYear() === currentYear) {
          monthlyTotal++;
          revisitPending++;
        }
      }
    });

    return {
      monthlyTotal,
      firstVisitPending,
      revisitPending,
      completed
    };
  };

  const stats = calculateStats();

  // 초기 데이터 로드 (stores만 필요)
  useEffect(() => {
    // stores 가져오기
    if (!stores || stores.length === 0) {
      fetchStores();
    }
  }, []);

  return (
    <MainLayout>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      <div style={{ 
        fontFamily: "'SUIT', -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif"
      }}>
        {/* 통계 카드 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          {/* 이번 달 일정 */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <p style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  margin: '0 0 4px 0',
                  fontWeight: '500',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  이번 달 일정
                </p>
                <p style={{
                  fontSize: '28px',
                  fontWeight: '700',
                  color: '#111827',
                  margin: 0
                }}>
                  {stats.monthlyTotal}
                </p>
              </div>
              <div style={{
                width: '48px',
                height: '48px',
                backgroundColor: '#fff5f3',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="24" height="24" fill="#FF3D00" viewBox="0 0 24 24">
                  <path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/>
                </svg>
              </div>
            </div>
          </div>

          {/* 첫방문 예정 */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <p style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  margin: '0 0 4px 0',
                  fontWeight: '500',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  첫방문 예정
                </p>
                <p style={{
                  fontSize: '28px',
                  fontWeight: '700',
                  color: '#111827',
                  margin: 0
                }}>
                  {stats.firstVisitPending}
                </p>
              </div>
              <div style={{
                width: '48px',
                height: '48px',
                backgroundColor: '#e0f2fe',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="24" height="24" fill="#0284c7" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
            </div>
          </div>

          {/* 재방문 예정 */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <p style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  margin: '0 0 4px 0',
                  fontWeight: '500',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  재방문 예정
                </p>
                <p style={{
                  fontSize: '28px',
                  fontWeight: '700',
                  color: '#111827',
                  margin: 0
                }}>
                  {stats.revisitPending}
                </p>
              </div>
              <div style={{
                width: '48px',
                height: '48px',
                backgroundColor: '#f3e8ff',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="24" height="24" fill="#7c3aed" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
            </div>
          </div>

          {/* 완료된 일정 */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <p style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  margin: '0 0 4px 0',
                  fontWeight: '500',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  완료된 일정
                </p>
                <p style={{
                  fontSize: '28px',
                  fontWeight: '700',
                  color: '#111827',
                  margin: 0
                }}>
                  {stats.completed}
                </p>
              </div>
              <div style={{
                width: '48px',
                height: '48px',
                backgroundColor: '#d1fae5',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="24" height="24" fill="#10b981" viewBox="0 0 24 24">
                  <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* 캘린더 */}
        <DashboardCalendar />
      </div>
    </MainLayout>
  );
};

export default SchedulePage;