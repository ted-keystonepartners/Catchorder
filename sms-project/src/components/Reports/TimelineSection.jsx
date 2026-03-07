import React, { useState, useEffect } from 'react';
import { getKeyTasks } from '../../api/reportsApi.js';

const ACCENT = '#FF3D00';

const months = ['1월', '2월', '3월', '4월', '5월', '6월'];

const TimelineSection = ({ dateRange }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await getKeyTasks();
        if (response.success && response.data?.tasks) {
          setTasks(response.data.tasks);
        }
      } catch (err) {
        console.error('Timeline 데이터 조회 실패:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateRange]);

  const toggleTask = (taskId) => {
    setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const getBarColor = (status, isAction = false) => {
    if (status === '완료') return isAction ? '#86efac' : '#16a34a';
    if (status === '진행중') return isAction ? '#fdba74' : ACCENT;
    return isAction ? '#e5e7eb' : '#d1d5db';
  };

  const getStatusStyle = (status) => {
    if (status === '완료') return { color: '#16a34a', backgroundColor: '#f0fdf4' };
    if (status === '진행중') return { color: '#ea580c', backgroundColor: '#fff7ed' };
    return { color: '#6b7280', backgroundColor: '#f3f4f6' };
  };

  const renderBar = (startMonth, endMonth, status, isAction = false) => {
    return (
      <div style={{ display: 'flex', flex: 1 }}>
        {months.map((_, idx) => {
          const monthNum = idx + 1;
          const isInRange = monthNum >= startMonth && monthNum <= endMonth;
          const isStart = monthNum === startMonth;
          const isEnd = monthNum === endMonth;

          return (
            <div
              key={idx}
              style={{
                flex: 1,
                height: isAction ? '6px' : '8px',
                backgroundColor: isInRange ? getBarColor(status, isAction) : 'transparent',
                borderRadius: isStart && isEnd ? '4px' : isStart ? '4px 0 0 4px' : isEnd ? '0 4px 4px 0' : '0',
                marginRight: '2px'
              }}
            />
          );
        })}
      </div>
    );
  };

  const LoadingSkeleton = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          height: '48px',
          backgroundColor: '#f3f4f6',
          borderRadius: '4px',
          animation: 'pulse 1.5s infinite'
        }} />
      ))}
    </div>
  );

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
    }}>
      <h2 style={{
        fontSize: '18px',
        fontWeight: '700',
        color: '#111827',
        margin: '0 0 20px 0'
      }}>
        타임라인
      </h2>

      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        paddingBottom: '12px',
        borderBottom: '1px solid #e5e7eb',
        marginBottom: '8px'
      }}>
        <div style={{ width: '180px', flexShrink: 0, fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
          Task
        </div>
        <div style={{ display: 'flex', flex: 1 }}>
          {months.map(month => (
            <div key={month} style={{
              flex: 1,
              textAlign: 'center',
              fontSize: '12px',
              fontWeight: '600',
              color: '#6b7280'
            }}>
              {month}
            </div>
          ))}
        </div>
        <div style={{ width: '70px', flexShrink: 0, textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
          상태
        </div>
      </div>

      {/* Tasks */}
      {loading ? (
        <LoadingSkeleton />
      ) : tasks.length === 0 ? (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          color: '#9ca3af'
        }}>
          타임라인 데이터가 없습니다
        </div>
      ) : (
        <div>
          {tasks.map(task => (
            <div key={task.id}>
              {/* Key Task Row */}
              <div
                onClick={() => toggleTask(task.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 0',
                  cursor: 'pointer',
                  borderBottom: expandedTasks[task.id] ? 'none' : '1px solid #f3f4f6'
                }}
              >
                <div style={{
                  width: '180px',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{
                    fontSize: '10px',
                    color: '#9ca3af',
                    transform: expandedTasks[task.id] ? 'rotate(90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.15s'
                  }}>
                    ▶
                  </span>
                  <span style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#111827',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {task.title}
                  </span>
                </div>
                {renderBar(task.startMonth || 1, task.endMonth || 6, task.status, false)}
                <div style={{ width: '70px', flexShrink: 0, textAlign: 'center' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '500',
                    minWidth: '52px',
                    ...getStatusStyle(task.status)
                  }}>
                    {task.status}
                  </span>
                </div>
              </div>

              {/* Action Items */}
              {expandedTasks[task.id] && (
                <div style={{ marginBottom: '4px' }}>
                  {task.actionItems?.map((action, idx) => (
                    <div
                      key={action.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '10px 0 10px 24px',
                        borderBottom: idx === task.actionItems.length - 1 ? '1px solid #f3f4f6' : 'none',
                        backgroundColor: '#fafafa'
                      }}
                    >
                      <div style={{
                        width: '156px',
                        flexShrink: 0,
                        fontSize: '12px',
                        color: '#6b7280',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {action.title}
                      </div>
                      {renderBar(action.startMonth || 1, action.endMonth || 6, action.status, true)}
                      <div style={{ width: '70px', flexShrink: 0, textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '500',
                          minWidth: '52px',
                          ...getStatusStyle(action.status)
                        }}>
                          {action.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div style={{
        display: 'flex',
        gap: '20px',
        marginTop: '16px',
        paddingTop: '12px',
        borderTop: '1px solid #f3f4f6'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '16px', height: '6px', backgroundColor: '#16a34a', borderRadius: '3px' }} />
          <span style={{ fontSize: '11px', color: '#6b7280' }}>완료</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '16px', height: '6px', backgroundColor: ACCENT, borderRadius: '3px' }} />
          <span style={{ fontSize: '11px', color: '#6b7280' }}>진행중</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '16px', height: '6px', backgroundColor: '#d1d5db', borderRadius: '3px' }} />
          <span style={{ fontSize: '11px', color: '#6b7280' }}>대기</span>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default TimelineSection;
