import React, { useState, useEffect } from 'react';
import MainLayout from '../components/Layout/MainLayout.jsx';
import DashboardCalendar from '../components/Calendar/DashboardCalendar.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useStores } from '../hooks/useStores.js';
import { getAllSchedules } from '../api/scheduleApi.js';
import { useToast } from '../hooks/useToast.js';
import ToastContainer from '../components/ui/Toast.jsx';

const SchedulePage = () => {
  const { isAdmin } = useAuth();
  const { stores, isLoading: storesLoading, fetchStores } = useStores();
  const { success, error: showError, toasts, removeToast } = useToast();
  
  // 모바일용 상태
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [schedules, setSchedules] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);

  // 스케줄 데이터 가져오기 - getAllSchedules 사용
  const fetchSchedules = async () => {
    setLoadingSchedules(true);
    try {
      const currentMonthStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;
      const schedulesData = await getAllSchedules(currentMonthStr);
      setSchedules(schedulesData || []);
    } catch (error) {
      console.error('Failed to fetch schedules:', error);
      setSchedules([]);
    } finally {
      setLoadingSchedules(false);
    }
  };

  // 선택된 날짜의 일정 필터링
  const filteredSchedules = schedules.filter(schedule => {
    const scheduleDate = new Date(schedule.visit_date);
    return scheduleDate.toDateString() === selectedDate.toDateString();
  });

  // 날짜 이동 함수
  const prevDay = () => {
    setSelectedDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 1);
      return d;
    });
  };

  const nextDay = () => {
    setSelectedDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 1);
      return d;
    });
  };

  // 날짜 포맷팅
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekDay = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'][date.getDay()];
    return { year, month, day, weekDay };
  };

  const dateInfo = formatDate(selectedDate);

  // 초기 데이터 로드
  useEffect(() => {
    if (!stores || stores.length === 0) {
      fetchStores();
    }
    fetchSchedules();
  }, []);

  // 날짜가 변경될 때 해당 월의 일정 다시 로드
  useEffect(() => {
    fetchSchedules();
  }, [selectedDate.getMonth(), selectedDate.getFullYear()]);

  return (
    <MainLayout>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      <div style={{ 
        fontFamily: "'SUIT', -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif"
      }}>
        {/* 모바일 UI */}
        <div className="md:hidden" style={{ 
          margin: '-24px',  // MainLayout의 padding 제거
          marginBottom: 0
        }}>
          {/* 날짜 선택 - 헤더 바로 아래 고정 */}
          <div style={{
            position: 'sticky',
            top: '64px',  // 헤더 높이만큼
            zIndex: 90,
            backgroundColor: 'white',
            borderBottom: '1px solid #e5e7eb',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '24px'
          }}>
            <button 
              onClick={prevDay}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: '1px solid #e5e7eb',
                backgroundColor: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '20px',
                color: '#374151',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
            >
              ‹
            </button>
            <div style={{ textAlign: 'center', minWidth: '180px' }}>
              <p style={{ 
                fontSize: '17px', 
                fontWeight: '600',
                color: '#111827',
                margin: '0 0 2px 0'
              }}>
                {dateInfo.year}년 {dateInfo.month}월 {dateInfo.day}일
              </p>
              <p style={{ 
                fontSize: '13px', 
                color: '#6b7280',
                margin: 0
              }}>
                {dateInfo.weekDay}
              </p>
            </div>
            <button 
              onClick={nextDay}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: '1px solid #e5e7eb',
                backgroundColor: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '20px',
                color: '#374151',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
            >
              ›
            </button>
          </div>

          {/* 일정 리스트 */}
          <div style={{ padding: '16px', backgroundColor: '#f9fafb', minHeight: 'calc(100vh - 200px)', marginTop: '0' }}>
            {loadingSchedules ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                일정을 불러오는 중...
              </div>
            ) : filteredSchedules.length > 0 ? (
              filteredSchedules.map((schedule, index) => (
                <div key={index} style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '12px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  border: '1px solid #e5e7eb'
                }}>
                  <p style={{ 
                    fontWeight: '600', 
                    marginBottom: '8px',
                    color: '#111827',
                    fontSize: '16px'
                  }}>
                    {schedule.store_name}
                  </p>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ 
                      fontSize: '14px', 
                      color: schedule.visit_type === '첫방문' ? '#2563eb' : '#a855f7',
                      fontWeight: '500'
                    }}>
                      {schedule.visit_type}
                    </span>
                    <span style={{ fontSize: '14px', color: '#6b7280' }}>·</span>
                    <span style={{ fontSize: '14px', color: '#374151' }}>
                      {schedule.visit_time || '시간 미정'}
                    </span>
                  </div>
                  {schedule.owner_name && (
                    <p style={{ 
                      fontSize: '13px', 
                      color: '#9ca3af',
                      margin: 0
                    }}>
                      담당: {schedule.owner_name}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <div style={{ 
                textAlign: 'center', 
                padding: '60px 20px',
                backgroundColor: 'white',
                borderRadius: '12px',
                border: '1px solid #e5e7eb'
              }}>
                <svg width="48" height="48" fill="none" stroke="#e5e7eb" viewBox="0 0 24 24" style={{ margin: '0 auto 16px' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p style={{ 
                  color: '#9ca3af',
                  fontSize: '15px',
                  margin: 0
                }}>
                  이 날짜에 일정이 없습니다
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 데스크탑 캘린더 */}
        <div className="hidden md:block">
          <DashboardCalendar />
        </div>
      </div>
    </MainLayout>
  );
};

export default SchedulePage;