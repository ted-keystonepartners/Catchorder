import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client.js';
import { getAllSchedules, getSchedules } from '../../api/scheduleApi.js';

/**
 * 대시보드용 캘린더 컴포넌트
 * 모든 매장의 일정을 표시
 */
const DashboardCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // 현재 월 정보
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  // 현재 월의 첫째 날과 마지막 날
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  // 캘린더 시작일 (이전 월의 날짜 포함)
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());
  
  // 캘린더 종료일 (다음 월의 날짜 포함)
  const endDate = new Date(lastDay);
  endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));

  // 매장 목록 가져오기
  const fetchStores = async () => {
    try {
      const response = await apiClient.get('/api/stores');
      if (response.success) {
        const storesData = response.data?.stores || response.data || [];
        setStores(storesData);
      }
    } catch (error) {
      console.error('매장 목록 가져오기 실패:', error);
    }
  };

  // 모든 일정 가져오기
  const fetchAllSchedules = async () => {
    setLoading(true);
    
    try {
      try {
        // 새로운 getAllSchedules API 사용
        const schedulesData = await getAllSchedules();
        
        if (schedulesData && schedulesData.length > 0) {
          setSchedules(schedulesData);
        } else {
          await fetchSchedulesByStore();
        }
      } catch (error) {
        await fetchSchedulesByStore();
      }
    } catch (error) {
      console.error('❌ 일정 가져오기 최종 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 매장별 일정 가져오기 (대안 방법)
  const fetchSchedulesByStore = async () => {
    try {
      const allSchedules = [];
      
      for (const store of stores) {
        const storeId = store.store_id || store.id;
        const storeName = store.store_name || store.name;
        
        try {
          const storeSchedules = await getSchedules(storeId);
          
          if (storeSchedules && storeSchedules.length > 0) {
            // 매장 정보 추가
            const schedulesWithStore = storeSchedules.map(schedule => ({
              ...schedule,
              store_name: storeName,
              store_id: storeId
            }));
            allSchedules.push(...schedulesWithStore);
          }
        } catch (error) {
          // 500 에러는 무시하고 계속 진행 (백엔드 미구현 API)
          console.warn(`⚠️ 매장 ${storeName} 일정 조회 스킵:`, error.message);
        }
      }
      
      setSchedules(allSchedules);
    } catch (error) {
      console.error('❌ 매장별 일정 가져오기 실패:', error);
    }
  };

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      await fetchStores();
    };
    loadData();
  }, []);

  useEffect(() => {
    if (stores.length > 0) {
      fetchAllSchedules();
    }
  }, [stores, currentDate]);

  // 특정 날짜의 일정 가져오기
  const getSchedulesForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD 형식
    const daySchedules = schedules.filter(schedule => {
      const scheduleDate = schedule.visit_date;
      return scheduleDate === dateStr;
    });
    return daySchedules;
  };

  // 날짜 클릭 핸들러
  const handleDateClick = (date) => {
    const daySchedules = getSchedulesForDate(date);
    if (daySchedules.length > 0) {
      setSelectedDate(date);
      setShowScheduleModal(true);
    }
  };

  // 모달 닫기
  const closeModal = () => {
    setShowScheduleModal(false);
    setSelectedDate(null);
  };

  // 이전 월로 이동
  const goToPrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  // 다음 월로 이동
  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // 오늘로 이동
  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // 캘린더 날짜 배열 생성
  const generateCalendarDays = () => {
    const days = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  const calendarDays = generateCalendarDays();

  // 요일 헤더
  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div style={{
      backgroundColor: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      padding: '24px',
      fontFamily: 'SUIT'
    }}>
      {/* 캘린더 헤더 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px'
      }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#1f2937',
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
            <svg width="12" height="12" fill="white" viewBox="0 0 24 24">
              <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
            </svg>
          </div>
          방문 일정 캘린더
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={goToToday}
            style={{
              padding: '6px 12px',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            오늘
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={goToPrevMonth}
              style={{
                padding: '8px',
                backgroundColor: 'transparent',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
              </svg>
            </button>
            
            <span style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#1f2937',
              minWidth: '120px',
              textAlign: 'center'
            }}>
              {year}년 {month + 1}월
            </span>
            
            <button
              onClick={goToNextMonth}
              style={{
                padding: '8px',
                backgroundColor: 'transparent',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          color: '#6b7280'
        }}>
          <div style={{
            display: 'inline-block',
            width: '20px',
            height: '20px',
            border: '2px solid #f3f4f6',
            borderTop: '2px solid #FF3D00',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '8px'
          }} />
          <p style={{ margin: 0, fontSize: '14px' }}>일정을 불러오는 중...</p>
        </div>
      )}

      {!loading && (
        <>
          {/* 요일 헤더 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '1px',
            marginBottom: '8px'
          }}>
            {weekDays.map((day, index) => (
              <div
                key={day}
                style={{
                  padding: '12px',
                  textAlign: 'center',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: index === 0 ? '#dc2626' : index === 6 ? '#2563eb' : '#374151',
                  backgroundColor: '#f9fafb'
                }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* 캘린더 본문 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '1px',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            {calendarDays.map((day, index) => {
              const daySchedules = getSchedulesForDate(day);
              const isCurrentMonth = day.getMonth() === month;
              const isToday = day.toDateString() === new Date().toDateString();
              const dayOfWeek = day.getDay();

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => handleDateClick(day)}
                  style={{
                    minHeight: '100px',
                    padding: '8px',
                    backgroundColor: isCurrentMonth ? 'white' : '#f9fafb',
                    border: isToday ? '2px solid #FF3D00' : 'none',
                    position: 'relative',
                    cursor: daySchedules.length > 0 ? 'pointer' : 'default',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (daySchedules.length > 0) {
                      e.target.style.backgroundColor = isCurrentMonth ? '#f9fafb' : '#f3f4f6';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = isCurrentMonth ? 'white' : '#f9fafb';
                  }}
                >
                  {/* 날짜 */}
                  <div style={{
                    fontSize: '14px',
                    fontWeight: isToday ? '600' : '400',
                    color: isCurrentMonth 
                      ? (dayOfWeek === 0 ? '#dc2626' : dayOfWeek === 6 ? '#2563eb' : '#374151')
                      : '#9ca3af',
                    marginBottom: '4px'
                  }}>
                    {day.getDate()}
                  </div>

                  {/* 일정 목록 */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px'
                  }}>
                    {daySchedules.slice(0, 3).map((schedule, scheduleIndex) => (
                      <div
                        key={schedule.id || scheduleIndex}
                        style={{
                          padding: '2px 4px',
                          backgroundColor: schedule.visit_type === 'first' ? '#dbeafe' : '#f3e8ff',
                          color: schedule.visit_type === 'first' ? '#1e40af' : '#7c3aed',
                          borderRadius: '3px',
                          fontSize: '10px',
                          fontWeight: '500',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                        title={`${schedule.visit_time?.substring(0, 5)} ${schedule.store_name || '매장명 없음'} - ${schedule.visit_purpose}`}
                      >
                        {schedule.visit_time?.substring(0, 5)} {schedule.store_name || '매장'}
                      </div>
                    ))}
                    
                    {/* 더 많은 일정이 있는 경우 */}
                    {daySchedules.length > 3 && (
                      <div style={{
                        padding: '2px 4px',
                        backgroundColor: '#f3f4f6',
                        color: '#6b7280',
                        borderRadius: '3px',
                        fontSize: '10px',
                        fontWeight: '500',
                        textAlign: 'center'
                      }}>
                        +{daySchedules.length - 3}개 더
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 범례 */}
          <div style={{
            marginTop: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            fontSize: '12px',
            color: '#6b7280'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{
                width: '12px',
                height: '12px',
                backgroundColor: '#dbeafe',
                borderRadius: '3px'
              }}></div>
              첫방문
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{
                width: '12px',
                height: '12px',
                backgroundColor: '#f3e8ff',
                borderRadius: '3px'
              }}></div>
              재방문
            </div>
          </div>
        </>
      )}

      {/* 일정 상세 모달 */}
      {showScheduleModal && selectedDate && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '500px',
            maxWidth: '90vw',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px'
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#1f2937',
                margin: 0,
                fontFamily: 'SUIT'
              }}>
                {selectedDate.getFullYear()}년 {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일 일정
              </h3>
              <button
                onClick={closeModal}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  color: '#6b7280',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              {getSchedulesForDate(selectedDate).map((schedule, index) => (
                <div
                  key={schedule.id || index}
                  style={{
                    padding: '16px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    backgroundColor: schedule.visit_type === 'first' ? '#f0f9ff' : '#faf5ff'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px'
                  }}>
                    <h4 style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#111827',
                      margin: 0,
                      fontFamily: 'SUIT'
                    }}>
                      {schedule.store_name || '매장명 없음'}
                    </h4>
                    <span style={{
                      padding: '4px 8px',
                      backgroundColor: schedule.visit_type === 'first' ? '#dbeafe' : '#f3e8ff',
                      color: schedule.visit_type === 'first' ? '#1e40af' : '#7c3aed',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}>
                      {schedule.visit_type === 'first' ? '첫방문' : '재방문'}
                    </span>
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    fontSize: '14px',
                    color: '#6b7280',
                    fontFamily: 'SUIT'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: '500' }}>⏰ 방문시간:</span>
                      <span>{schedule.visit_time?.substring(0, 5)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: '500' }}>📝 방문목적:</span>
                      <span>{schedule.visit_purpose}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              marginTop: '20px',
              textAlign: 'right'
            }}>
              <button
                onClick={closeModal}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#FF3D00',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  fontFamily: 'SUIT'
                }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardCalendar;