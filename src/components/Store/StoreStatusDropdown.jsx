import React, { useState } from 'react';
import Card from '../Common/Card.jsx';
import Button from '../Common/Button.jsx';
import Select from '../Common/Select.jsx';
import Badge from '../Common/Badge.jsx';
import { STORE_STATUS } from '../../utils/constants.js';
import { getStatusLabel } from '../../utils/formatter.js';

/**
 * StoreStatusDropdown 컴포넌트 - 매장 상태 변경
 * @param {Object} props
 * @param {Object} props.store - 매장 정보
 * @param {Function} props.onStatusChange - 상태 변경 핸들러
 * @param {boolean} props.loading - 로딩 상태
 */
const StoreStatusDropdown = ({ store, onStatusChange, loading = false }) => {
  const [selectedStatus, setSelectedStatus] = useState(store.status);
  const [isChanging, setIsChanging] = useState(false);

  const statusOptions = Object.keys(STORE_STATUS).map(status => ({
    value: status,
    label: getStatusLabel(status)
  }));

  const handleStatusChange = async () => {
    if (selectedStatus === store.status) return;
    
    setIsChanging(true);
    try {
      await onStatusChange(selectedStatus);
    } catch (error) {
      console.error('Status change error:', error);
      setSelectedStatus(store.status); // 원래 상태로 되돌림
    } finally {
      setIsChanging(false);
    }
  };

  const hasChanges = selectedStatus !== store.status;

  return (
    <Card title="상태 관리">
      <div className="space-y-4">
        <div>
          <dt className="text-sm font-medium text-gray-500 mb-2">현재 상태</dt>
          <dd>
            <Badge variant="status" statusCode={store.status}>
              {getStatusLabel(store.status)}
            </Badge>
          </dd>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <Select
            label="상태 변경"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            options={statusOptions}
          />
          
          {hasChanges && (
            <div className="mt-3 flex space-x-2">
              <Button
                size="sm"
                onClick={handleStatusChange}
                loading={isChanging || loading}
              >
                변경
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedStatus(store.status)}
                disabled={isChanging || loading}
              >
                취소
              </Button>
            </div>
          )}
        </div>

        {/* 상태 변경 히스토리나 안내 메시지 */}
        <div className="bg-blue-50 p-3 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-800">
                상태 변경 시 라이프사이클이 자동으로 조정됩니다.
                <br />
                현재 라이프사이클: <strong>{store.lifecycle}</strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default StoreStatusDropdown;