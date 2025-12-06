import React, { useState } from 'react';
import Modal from '../Common/Modal.jsx';
import Button from '../Common/Button.jsx';
import Input from '../Common/Input.jsx';
import Select from '../Common/Select.jsx';
import { ACTIVITY_TYPES } from '../../utils/constants.js';
import { getActivityTypeLabel } from '../../utils/formatter.js';

/**
 * ActivityLogModal 컴포넌트 - 활동 로그 기록 모달
 * @param {Object} props
 * @param {boolean} props.isOpen - 모달 열림 상태
 * @param {Function} props.onClose - 모달 닫기 핸들러
 * @param {Function} props.onSave - 저장 핸들러
 * @param {boolean} props.loading - 로딩 상태
 * @param {Object} props.initialData - 초기 데이터 (수정 시)
 */
const ActivityLogModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  loading = false,
  initialData = null 
}) => {
  const [formData, setFormData] = useState({
    type: initialData?.type || 'CALL',
    content: initialData?.content || '',
    scheduledAt: initialData?.scheduledAt ? 
      new Date(initialData.scheduledAt).toISOString().slice(0, 16) : '',
    completed: initialData?.completed || false
  });
  const [errors, setErrors] = useState({});

  // 활동 타입 옵션
  const activityOptions = Object.keys(ACTIVITY_TYPES).map(type => ({
    value: type,
    label: getActivityTypeLabel(type)
  }));

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // 에러 클리어
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.type) {
      newErrors.type = '활동 타입을 선택해주세요.';
    }

    if (!formData.content.trim()) {
      newErrors.content = '활동 내용을 입력해주세요.';
    }

    // SCHEDULE 타입의 경우 예정일 필수
    if (formData.type.startsWith('SCHEDULE_') && !formData.scheduledAt) {
      newErrors.scheduledAt = '예정일을 입력해주세요.';
    }

    // 예정일이 현재 시간보다 과거인지 확인
    if (formData.scheduledAt) {
      const scheduledDate = new Date(formData.scheduledAt);
      const now = new Date();
      if (scheduledDate <= now) {
        newErrors.scheduledAt = '예정일은 현재 시간보다 미래여야 합니다.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    const dataToSave = {
      ...formData,
      // SCHEDULE 타입이 아니면 scheduledAt을 null로 설정
      scheduledAt: formData.type.startsWith('SCHEDULE_') ? formData.scheduledAt : null
    };

    try {
      await onSave(dataToSave);
      handleClose();
    } catch (error) {
      console.error('Save activity error:', error);
    }
  };

  const handleClose = () => {
    setFormData({
      type: 'CALL',
      content: '',
      scheduledAt: '',
      completed: false
    });
    setErrors({});
    onClose();
  };

  const isScheduleType = formData.type.startsWith('SCHEDULE_');

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={initialData ? '활동 로그 수정' : '새 활동 로그 기록'}
      size="md"
      footer={
        <>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            취소
          </Button>
          <Button
            onClick={handleSave}
            loading={loading}
          >
            {initialData ? '수정' : '저장'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select
          label="활동 타입"
          name="type"
          value={formData.type}
          onChange={handleInputChange}
          options={activityOptions}
          error={errors.type}
          required
        />

        <Input
          type="textarea"
          label="활동 내용"
          name="content"
          value={formData.content}
          onChange={handleInputChange}
          placeholder="활동 내용을 상세히 기록해주세요..."
          error={errors.content}
          required
        />

        {isScheduleType && (
          <Input
            type="datetime-local"
            label="예정일시"
            name="scheduledAt"
            value={formData.scheduledAt}
            onChange={handleInputChange}
            error={errors.scheduledAt}
            required
          />
        )}

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="completed"
            name="completed"
            checked={formData.completed}
            onChange={handleInputChange}
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <label htmlFor="completed" className="text-sm font-medium text-gray-700">
            완료된 활동
          </label>
        </div>

        {/* 안내 메시지 */}
        <div className="bg-blue-50 p-3 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-800">
                {isScheduleType ? (
                  <>
                    <strong>예약 활동:</strong> 예정일시에 알림이 표시되며, 완료 시 체크박스를 선택하세요.
                  </>
                ) : (
                  <>
                    <strong>즉시 활동:</strong> 현재 시점에 완료된 활동을 기록합니다.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* 활동 타입별 예시 */}
        <div className="bg-gray-50 p-3 rounded-md">
          <p className="text-xs text-gray-600 mb-2">
            <strong>활동 내용 예시:</strong>
          </p>
          <div className="text-xs text-gray-500 space-y-1">
            {formData.type === 'CALL' && <p>• 도입 문의 전화, 서비스 설명, 가격 안내 등</p>}
            {formData.type === 'VISIT' && <p>• 매장 방문, 데모 시연, 계약 체결 등</p>}
            {formData.type === 'SCHEDULE_CALL' && <p>• 다음 주 화요일 오후 2시 통화 예정</p>}
            {formData.type === 'SCHEDULE_VISIT' && <p>• 12월 15일 오전 10시 매장 방문 예정</p>}
            {formData.type === 'MEMO' && <p>• 사장님 관심도 높음, 경쟁사와 비교 검토 중</p>}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ActivityLogModal;