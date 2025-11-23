import React, { useState } from 'react';
import Card from '../Common/Card.jsx';
import Button from '../Common/Button.jsx';
import Badge from '../Common/Badge.jsx';
import Loading from '../Common/Loading.jsx';
import Error from '../Common/Error.jsx';
import ActivityLogModal from '../Modal/ActivityLogModal.jsx';
import { useActivities } from '../../hooks/useActivities.js';
import { useAuth } from '../../hooks/useAuth.js';
import { formatDateTime, getActivityTypeLabel } from '../../utils/formatter.js';
import { mockUsers } from '../../api/mockData.js';

/**
 * ActivityLogSection 컴포넌트 - 활동 로그 섹션
 * @param {Object} props
 * @param {string} props.storeId - 매장 ID
 */
const ActivityLogSection = ({ storeId }) => {
  const { user } = useAuth();
  const { 
    activities, 
    loading, 
    error, 
    createActivity, 
    updateActivity, 
    deleteActivity,
    pagination,
    setPage
  } = useActivities(storeId);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);

  const getUserName = (userId) => {
    const foundUser = mockUsers.find(u => u.id === userId);
    return foundUser ? foundUser.name : '알 수 없음';
  };

  const handleCreateActivity = () => {
    setEditingActivity(null);
    setModalOpen(true);
  };

  const handleEditActivity = (activity) => {
    setEditingActivity(activity);
    setModalOpen(true);
  };

  const handleSaveActivity = async (activityData) => {
    const dataWithUser = {
      ...activityData,
      createdBy: user?.id
    };

    if (editingActivity) {
      await updateActivity(editingActivity.id, dataWithUser);
    } else {
      await createActivity(dataWithUser);
    }
  };

  const handleDeleteActivity = (activity) => {
    deleteActivity(activity.id, activity.content);
  };

  const handlePageChange = (page) => {
    setPage(page);
  };

  if (loading && activities.length === 0) {
    return <Loading text="활동 로그를 불러오는 중..." />;
  }

  if (error) {
    return <Error message={error} />;
  }

  return (
    <>
      <Card 
        title="활동 로그"
        footer={
          <div className="flex justify-between items-center">
            <Button
              size="sm"
              onClick={handleCreateActivity}
            >
              + 로그 기록
            </Button>
            
            {pagination.totalPages > 1 && (
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={!pagination.hasPrev}
                >
                  이전
                </Button>
                <span className="text-sm text-gray-500">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={!pagination.hasNext}
                >
                  다음
                </Button>
              </div>
            )}
          </div>
        }
      >
        <div className="space-y-4">
          {activities.length === 0 ? (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-4 text-sm font-medium text-gray-900">활동 로그가 없습니다</h3>
              <p className="mt-2 text-sm text-gray-500">첫 번째 활동을 기록해보세요.</p>
              <div className="mt-6">
                <Button onClick={handleCreateActivity}>
                  + 첫 번째 로그 기록
                </Button>
              </div>
            </div>
          ) : (
            <div className="flow-root">
              <ul className="-mb-8">
                {activities.map((activity, index) => {
                  const isLast = index === activities.length - 1;
                  const isScheduled = activity.scheduledAt;
                  const isOverdue = isScheduled && new Date(activity.scheduledAt) < new Date();
                  const isCompleted = activity.completed;

                  return (
                    <li key={activity.id}>
                      <div className="relative pb-8">
                        {!isLast && (
                          <span
                            className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                            aria-hidden="true"
                          />
                        )}
                        
                        <div className="relative flex space-x-3">
                          <div>
                            <span className={`
                              h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white
                              ${isCompleted ? 'bg-green-500' : isOverdue ? 'bg-red-500' : 'bg-gray-400'}
                            `}>
                              {isCompleted ? (
                                <svg className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              ) : isScheduled ? (
                                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              ) : (
                                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              )}
                            </span>
                          </div>
                          
                          <div className="min-w-0 flex-1 pt-1.5">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <Badge 
                                    variant={
                                      activity.type === 'CALL' ? 'info' :
                                      activity.type === 'VISIT' ? 'success' :
                                      activity.type.startsWith('SCHEDULE_') ? 'warning' :
                                      'default'
                                    }
                                    size="sm"
                                  >
                                    {getActivityTypeLabel(activity.type)}
                                  </Badge>
                                  
                                  {isCompleted && (
                                    <Badge variant="success" size="sm">
                                      완료
                                    </Badge>
                                  )}
                                  
                                  {isOverdue && !isCompleted && (
                                    <Badge variant="error" size="sm">
                                      지연
                                    </Badge>
                                  )}
                                </div>
                                
                                <p className="text-sm text-gray-900 mb-2">
                                  {activity.content}
                                </p>
                                
                                <div className="text-xs text-gray-500 space-y-1">
                                  <p>
                                    작성자: {getUserName(activity.createdBy)} | 
                                    작성일: {formatDateTime(activity.createdAt)}
                                  </p>
                                  
                                  {isScheduled && (
                                    <p className={isOverdue ? 'text-red-600 font-medium' : ''}>
                                      예정일: {formatDateTime(activity.scheduledAt)}
                                    </p>
                                  )}
                                </div>
                              </div>
                              
                              <div className="ml-4 flex-shrink-0 flex space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditActivity(activity)}
                                >
                                  수정
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleDeleteActivity(activity)}
                                >
                                  삭제
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </Card>

      {/* 활동 로그 모달 */}
      <ActivityLogModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveActivity}
        loading={loading}
        initialData={editingActivity}
      />
    </>
  );
};

export default ActivityLogSection;