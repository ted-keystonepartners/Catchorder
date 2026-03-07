import React, { useState, useEffect } from 'react';
import { getKeyTasks } from '../../api/reportsApi.js';

const ACCENT = '#FF3D00';

const KeyTaskSection = ({ dateRange }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState({});
  const [expandedActions, setExpandedActions] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [contents, setContents] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await getKeyTasks();
        if (response.success && response.data?.tasks) {
          const taskData = response.data.tasks;
          setTasks(taskData);

          // 초기 contents 설정
          const initial = {};
          taskData.forEach(task => {
            task.actionItems?.forEach(action => {
              initial[action.id] = action.content || '';
            });
          });
          setContents(initial);

          // 첫 번째 태스크와 첫 번째 액션 펼치기
          if (taskData.length > 0) {
            setExpandedTasks({ [taskData[0].id]: true });
            if (taskData[0].actionItems?.length > 0) {
              setExpandedActions({ [taskData[0].actionItems[0].id]: true });
            }
          }
        }
      } catch (err) {
        console.error('Key Tasks 조회 실패:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateRange]);

  const toggleTask = (taskId) => {
    setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const toggleAction = (actionId) => {
    setExpandedActions(prev => ({ ...prev, [actionId]: !prev[actionId] }));
  };

  const handleContentChange = (actionId, value) => {
    setContents(prev => ({ ...prev, [actionId]: value }));
  };

  const getStatusStyle = (status) => {
    if (status === '완료') return { color: '#16a34a', backgroundColor: '#f0fdf4' };
    if (status === '진행중') return { color: '#ea580c', backgroundColor: '#fff7ed' };
    return { color: '#6b7280', backgroundColor: '#f3f4f6' };
  };

  const LoadingSkeleton = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          height: '60px',
          backgroundColor: '#f3f4f6',
          borderRadius: '8px',
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
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h2 style={{
          fontSize: '18px',
          fontWeight: '700',
          color: '#111827',
          margin: 0
        }}>
          Key Task 현황
        </h2>
        <button style={{
          padding: '8px 14px',
          backgroundColor: ACCENT,
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: '600',
          cursor: 'pointer'
        }}>
          + 생성
        </button>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : tasks.length === 0 ? (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          color: '#9ca3af'
        }}>
          등록된 Key Task가 없습니다
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {tasks.map(task => (
            <div
              key={task.id}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                overflow: 'hidden'
              }}
            >
              {/* Key Task Header */}
              <div
                onClick={() => toggleTask(task.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  backgroundColor: expandedTasks[task.id] ? '#fafafa' : 'white',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    fontSize: '12px',
                    color: '#9ca3af',
                    transform: expandedTasks[task.id] ? 'rotate(90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.15s'
                  }}>
                    ▶
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                    {task.title}
                  </span>
                  <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                    · {task.owner}
                  </span>
                </div>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '500',
                  ...getStatusStyle(task.status)
                }}>
                  {task.status}
                </span>
              </div>

              {/* Action Items */}
              {expandedTasks[task.id] && (
                <div style={{ borderTop: '1px solid #e5e7eb' }}>
                  {task.actionItems?.map((action, idx) => (
                    <div key={action.id} style={{ borderTop: idx > 0 ? '1px solid #f3f4f6' : 'none' }}>
                      {/* Action Item Header */}
                      <div
                        onClick={() => toggleAction(action.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px 12px 40px',
                          backgroundColor: expandedActions[action.id] ? '#f9fafb' : '#fafafa',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            fontSize: '10px',
                            color: '#9ca3af',
                            transform: expandedActions[action.id] ? 'rotate(90deg)' : 'rotate(0deg)',
                            transition: 'transform 0.15s'
                          }}>
                            ▶
                          </span>
                          <span style={{ fontSize: '13px', color: '#374151' }}>
                            {action.title}
                          </span>
                        </div>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '500',
                          ...getStatusStyle(action.status)
                        }}>
                          {action.status}
                        </span>
                      </div>

                      {/* Content Area */}
                      {expandedActions[action.id] && (
                        <div style={{
                          padding: '12px 16px 16px 56px',
                          backgroundColor: '#f9fafb'
                        }}>
                          {editingId === action.id ? (
                            <div>
                              <textarea
                                value={contents[action.id] || ''}
                                onChange={(e) => handleContentChange(action.id, e.target.value)}
                                style={{
                                  width: '100%',
                                  minHeight: '120px',
                                  padding: '12px',
                                  border: '1px solid #d1d5db',
                                  borderRadius: '6px',
                                  fontSize: '13px',
                                  lineHeight: '1.6',
                                  fontFamily: 'inherit',
                                  resize: 'vertical',
                                  outline: 'none'
                                }}
                                onFocus={(e) => e.target.style.borderColor = ACCENT}
                                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                              />
                              <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                                <button
                                  onClick={() => setEditingId(null)}
                                  style={{
                                    padding: '6px 12px',
                                    backgroundColor: ACCENT,
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                  }}
                                >
                                  저장
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  style={{
                                    padding: '6px 12px',
                                    backgroundColor: '#e5e7eb',
                                    color: '#374151',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    cursor: 'pointer'
                                  }}
                                >
                                  취소
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div style={{
                                padding: '12px',
                                backgroundColor: 'white',
                                border: '1px solid #e5e7eb',
                                borderRadius: '6px',
                                fontSize: '13px',
                                lineHeight: '1.7',
                                color: '#374151',
                                whiteSpace: 'pre-wrap'
                              }}>
                                {contents[action.id] || '내용을 입력해주세요.'}
                              </div>
                              <button
                                onClick={() => setEditingId(action.id)}
                                style={{
                                  marginTop: '8px',
                                  padding: '5px 10px',
                                  backgroundColor: 'transparent',
                                  color: '#6b7280',
                                  border: '1px solid #d1d5db',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  cursor: 'pointer'
                                }}
                              >
                                수정
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default KeyTaskSection;
