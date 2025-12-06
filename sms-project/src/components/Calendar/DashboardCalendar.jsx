import React, { useState, useEffect } from 'react';
import { getAllSchedules } from '../../api/scheduleApi.js';
import { useAuth } from '../../hooks/useAuth.js';

/**
 * 대시보드용 캘린더 컴포넌트
 * 모든 매장의 일정을 표시
 */
const DashboardCalendar = ({ stores = [], managers = [] }) => {
  console.log('DashboardCalendar - stores:', stores?.length, 'managers:', managers?.length);
  const { isAdmin } = useAuth();
  const isAdminUser = isAdmin(); // 한 번만 호출하여 값 저장
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false); // 초기값을 false로 변경
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

  // 매장 목록은 props로 받음 - fetchStores 제거

  // 모든 일정 가져오기
  const fetchAllSchedules = async () => {
    // stores와 managers 모두 필요
    if (stores.length === 0 || managers.length === 0) {
      setSchedules([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    
    try {
      const currentMonthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      // ADMIN이면 isAdmin 플래그를 true로 전달
      const schedulesData = await getAllSchedules(stores, currentMonthStr, isAdminUser);
      setSchedules(schedulesData || []);
    } catch (error) {
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  // stores와 managers가 모두 로드된 후에 일정 데이터 로드
  useEffect(() => {
    // stores와 managers 둘 다 있어야 함
    if (stores.length === 0 || managers.length === 0) {
      return; // 데이터 로딩 될 때까지 기다림
    }
    fetchAllSchedules();
  }, [stores, managers, currentDate.getMonth(), currentDate.getFullYear()]);

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
                        {schedule.visit_time?.substring(0, 5)} {schedule.store_name || '매장명 없음'}
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
            borderRadius: '16px',
            width: '540px',
            maxWidth: '90vw',
            maxHeight: '80vh',
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            {/* 모달 헤더 */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    backgroundColor: '#FF3D00',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <svg width="20" height="20" fill="white" viewBox="0 0 24 24">
                      <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 style={{
                      fontSize: '18px',
                      fontWeight: '700',
                      color: '#111827',
                      margin: 0,
                      fontFamily: 'SUIT'
                    }}>
                      {selectedDate.getFullYear()}년 {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일
                    </h3>
                    <p style={{
                      fontSize: '13px',
                      color: '#6b7280',
                      margin: '2px 0 0 0'
                    }}>
                      일정 {getSchedulesForDate(selectedDate).length}개
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  style={{
                    width: '32px',
                    height: '32px',
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'white';
                  }}
                >
                  <svg width="18" height="18" fill="#6b7280" viewBox="0 0 24 24">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* 모달 본문 */}
            <div style={{
              padding: '20px 24px',
              maxHeight: 'calc(80vh - 140px)',
              overflowY: 'auto'
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                {getSchedulesForDate(selectedDate).map((schedule, index) => {
                  // stores 배열에서 매장 찾기 (String으로 변환해서 비교)
                  const store = stores.find(s => {
                    const storeId = s.store_id || s.storeId || s.id || s.seq;
                    const scheduleStoreId = schedule.store_id || schedule.storeId;
                    return String(storeId) === String(scheduleStoreId);
                  });
                  
                  // 매장명은 이미 schedule에 포함되어 있음 (getAllSchedules에서 처리)
                  const storeName = schedule.store_name || '매장명 없음';
                  
                  // 담당자 찾기 - schedule의 owner_id나 store의 ownerId 사용
                  const ownerId = schedule.owner_id || store?.ownerId || store?.owner_id;
                  
                  // managers 배열에서 담당자 찾기
                  const manager = ownerId ? managers.find(m => {
                    // 다양한 필드로 매칭 시도
                    return m.email === ownerId || 
                           m.id === ownerId || 
                           m.userId === ownerId ||
                           m.user_id === ownerId ||
                           String(m.id) === String(ownerId) ||
                           String(m.userId) === String(ownerId);
                  }) : null;
                  
                  const managerName = manager?.name || '미배정';
                  
                  return (
                    <div
                      key={schedule.id || index}
                      style={{
                        backgroundColor: 'white',
                        border: '1px solid #f3f4f6',
                        borderRadius: '12px',
                        padding: '20px',
                        transition: 'all 0.2s',
                        cursor: 'default'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = '#fafafa';
                        e.currentTarget.style.borderColor = '#e5e7eb';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = 'white';
                        e.currentTarget.style.borderColor = '#f3f4f6';
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        marginBottom: '16px'
                      }}>
                        <div style={{ flex: 1 }}>
                          <h4 style={{
                            fontSize: '16px',
                            fontWeight: '700',
                            color: '#191f28',
                            margin: '0 0 4px 0',
                            fontFamily: 'SUIT'
                          }}>
                            {storeName}
                          </h4>
                          <p style={{
                            fontSize: '14px',
                            color: '#8b95a1',
                            margin: 0
                          }}>
                            {schedule.visit_time?.substring(0, 5)} 방문 예정
                          </p>
                        </div>
                        <span style={{
                          padding: '4px 10px',
                          backgroundColor: schedule.visit_type === 'first' ? '#fff3e0' : '#f3f4f6',
                          color: schedule.visit_type === 'first' ? '#FF3D00' : '#4e5968',
                          border: `1px solid ${schedule.visit_type === 'first' ? '#ffe0b2' : '#e5e7eb'}`,
                          borderRadius: '16px',
                          fontSize: '12px',
                          fontWeight: '600',
                          whiteSpace: 'nowrap'
                        }}>
                          {schedule.visit_type === 'first' ? '첫방문' : '재방문'}
                        </span>
                      </div>
                      
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        fontSize: '14px'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px'
                        }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            backgroundColor: '#f8f9fa',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <svg width="16" height="16" fill="#8b95a1" viewBox="0 0 24 24">
                              <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                            </svg>
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{
                              color: '#8b95a1',
                              margin: '0 0 2px 0',
                              fontSize: '12px'
                            }}>방문 목적</p>
                            <p style={{
                              color: '#333d4b',
                              margin: 0,
                              fontWeight: '500'
                            }}>
                              {schedule.visit_purpose}
                            </p>
                          </div>
                        </div>
                        
                        {isAdminUser && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                          }}>
                            <div style={{
                              width: '32px',
                              height: '32px',
                              backgroundColor: '#f8f9fa',
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              <svg width="16" height="16" fill="#8b95a1" viewBox="0 0 24 24">
                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                              </svg>
                            </div>
                            <div style={{ flex: 1 }}>
                              <p style={{
                                color: '#8b95a1',
                                margin: '0 0 2px 0',
                                fontSize: '12px'
                              }}>담당자</p>
                              <p style={{
                                color: '#333d4b',
                                margin: 0,
                                fontWeight: '500'
                              }}>
                                {managerName}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardCalendar;