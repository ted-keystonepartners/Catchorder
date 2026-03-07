import React, { useState, useEffect } from 'react';
import {
  getKeyTasks,
  createKeyTask,
  updateKeyTask,
  deleteKeyTask,
  createKeyTaskAction,
  updateKeyTaskAction,
  deleteKeyTaskAction
} from '../../api/reportsApi.js';
import KeyTaskModal from './KeyTaskModal.jsx';

const ACCENT = '#FF3D00';

const KeyTaskSection = ({ dateRange }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState({});
  const [expandedActions, setExpandedActions] = useState({});

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [selectedActionId, setSelectedActionId] = useState(null);
  const [initialData, setInitialData] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await getKeyTasks();
      if (response.success && response.data?.tasks) {
        const taskData = response.data.tasks;
        setTasks(taskData);

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

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const toggleTask = (taskId) => {
    setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const toggleAction = (actionId) => {
    setExpandedActions(prev => ({ ...prev, [actionId]: !prev[actionId] }));
  };

  const getStatusStyle = (status) => {
    if (status === '완료') return { color: '#16a34a', backgroundColor: '#f0fdf4' };
    if (status === '진행중') return { color: '#ea580c', backgroundColor: '#fff7ed' };
    return { color: '#6b7280', backgroundColor: '#f3f4f6' };
  };

  // Modal handlers
  const handleCreateTask = () => {
    setModalMode('create-task');
    setSelectedTaskId(null);
    setSelectedActionId(null);
    setInitialData(null);
    setModalOpen(true);
  };

  const handleEditTask = (e, task) => {
    e.stopPropagation();
    setModalMode('edit-task');
    setSelectedTaskId(task.id);
    setSelectedActionId(null);
    setInitialData(task);
    setModalOpen(true);
  };

  const handleDeleteTask = async (e, taskId) => {
    e.stopPropagation();
    if (!confirm('Task와 하위 Action Items를 모두 삭제하시겠습니까?')) return;

    try {
      const result = await deleteKeyTask(taskId);
      if (result.success) {
        fetchData();
      } else {
        alert('삭제 실패: ' + (result.error || '알 수 없는 오류'));
      }
    } catch (err) {
      alert('삭제 실패: ' + err.message);
    }
  };

  const handleAddAction = (e, taskId) => {
    e.stopPropagation();
    setModalMode('add-action');
    setSelectedTaskId(taskId);
    setSelectedActionId(null);
    setInitialData(null);
    setModalOpen(true);
  };

  const handleEditAction = (e, taskId, action) => {
    e.stopPropagation();
    setModalMode('edit-action');
    setSelectedTaskId(taskId);
    setSelectedActionId(action.id);
    setInitialData(action);
    setModalOpen(true);
  };

  const handleDeleteAction = async (e, taskId, actionId) => {
    e.stopPropagation();
    if (!confirm('Action Item을 삭제하시겠습니까?')) return;

    try {
      const result = await deleteKeyTaskAction(taskId, actionId);
      if (result.success) {
        fetchData();
      } else {
        alert('삭제 실패: ' + (result.error || '알 수 없는 오류'));
      }
    } catch (err) {
      alert('삭제 실패: ' + err.message);
    }
  };

  const handleModalSuccess = async (formData, { taskId, actionId, mode }) => {
    let result;

    switch (mode) {
      case 'create-task':
        result = await createKeyTask(formData);
        break;
      case 'edit-task':
        result = await updateKeyTask(taskId, formData);
        break;
      case 'add-action':
        result = await createKeyTaskAction(taskId, formData);
        break;
      case 'edit-action':
        result = await updateKeyTaskAction(taskId, actionId, formData);
        break;
      default:
        throw new Error('Invalid mode');
    }

    if (!result.success) {
      throw new Error(result.error || '저장에 실패했습니다.');
    }

    setModalOpen(false);
    fetchData();
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

  const ActionButton = ({ onClick, color, bgColor, children }) => (
    <button
      onClick={onClick}
      style={{
        padding: '4px 8px',
        fontSize: '11px',
        fontWeight: '500',
        color: color,
        backgroundColor: bgColor,
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer'
      }}
    >
      {children}
    </button>
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
        <button
          onClick={handleCreateTask}
          style={{
            padding: '8px 14px',
            backgroundColor: ACCENT,
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ActionButton onClick={(e) => handleAddAction(e, task.id)} color="#3b82f6" bgColor="#eff6ff">
                    + Action
                  </ActionButton>
                  <ActionButton onClick={(e) => handleEditTask(e, task)} color="#6b7280" bgColor="#f3f4f6">
                    수정
                  </ActionButton>
                  <ActionButton onClick={(e) => handleDeleteTask(e, task.id)} color="#dc2626" bgColor="#fef2f2">
                    삭제
                  </ActionButton>
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
              </div>

              {/* Action Items */}
              {expandedTasks[task.id] && (
                <div style={{ borderTop: '1px solid #e5e7eb' }}>
                  {task.actionItems?.length === 0 ? (
                    <div style={{
                      padding: '20px 40px',
                      textAlign: 'center',
                      color: '#9ca3af',
                      fontSize: '13px',
                      backgroundColor: '#fafafa'
                    }}>
                      Action Item이 없습니다. "+ Action" 버튼을 눌러 추가하세요.
                    </div>
                  ) : (
                    task.actionItems?.map((action, idx) => (
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <ActionButton onClick={(e) => handleEditAction(e, task.id, action)} color="#6b7280" bgColor="#f3f4f6">
                              수정
                            </ActionButton>
                            <ActionButton onClick={(e) => handleDeleteAction(e, task.id, action.id)} color="#dc2626" bgColor="#fef2f2">
                              삭제
                            </ActionButton>
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
                        </div>

                        {/* Content Area */}
                        {expandedActions[action.id] && (
                          <div style={{
                            padding: '12px 16px 16px 56px',
                            backgroundColor: '#f9fafb'
                          }}>
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
                              {action.content || '내용이 없습니다.'}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <KeyTaskModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        mode={modalMode}
        taskId={selectedTaskId}
        actionId={selectedActionId}
        initialData={initialData}
        onSuccess={handleModalSuccess}
      />

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
