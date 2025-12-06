import React, { useState } from 'react';
import Card from '../Common/Card.jsx';
import Button from '../Common/Button.jsx';
import Input from '../Common/Input.jsx';
import { formatPhone } from '../../utils/formatter.js';
import { isValidPhone, isValidStoreName, isValidAddress } from '../../utils/validation.js';

/**
 * StoreInfoSection 컴포넌트 - 매장 정보 표시 및 수정
 * @param {Object} props
 * @param {Object} props.store - 매장 정보
 * @param {Function} props.onUpdate - 업데이트 핸들러
 * @param {boolean} props.loading - 로딩 상태
 */
const StoreInfoSection = ({ store, onUpdate, loading = false }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: store.name || '',
    address: store.address || '',
    phone: store.phone || '',
    businessNumber: store.businessNumber || ''
  });
  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // 실시간 유효성 검사
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!isValidStoreName(formData.name)) {
      newErrors.name = '매장명은 2-50자 사이로 입력해주세요.';
    }

    if (!isValidAddress(formData.address)) {
      newErrors.address = '주소는 5-200자 사이로 입력해주세요.';
    }

    if (!isValidPhone(formData.phone)) {
      newErrors.phone = '올바른 전화번호를 입력해주세요.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      await onUpdate(formData);
      setIsEditing(false);
    } catch (error) {
      console.error('Store update error:', error);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: store.name || '',
      address: store.address || '',
      phone: store.phone || '',
      businessNumber: store.businessNumber || ''
    });
    setErrors({});
    setIsEditing(false);
  };

  return (
    <Card 
      title="매장 정보"
      footer={
        <div className="flex justify-end space-x-2">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={loading}
              >
                취소
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                loading={loading}
              >
                저장
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              수정
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {isEditing ? (
          <>
            <Input
              label="매장명"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              error={errors.name}
              required
            />
            
            <Input
              label="주소"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              error={errors.address}
              required
            />
            
            <Input
              label="전화번호"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              error={errors.phone}
              placeholder="010-1234-5678"
              required
            />
            
            <Input
              label="사업자등록번호"
              name="businessNumber"
              value={formData.businessNumber}
              onChange={handleInputChange}
              placeholder="123-45-67890"
            />
          </>
        ) : (
          <div className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">매장명</dt>
              <dd className="mt-1 text-sm text-gray-900 font-medium">{store.name}</dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500">주소</dt>
              <dd className="mt-1 text-sm text-gray-900">{store.address}</dd>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">전화번호</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatPhone(store.phone)}</dd>
              </div>
              
              <div>
                <dt className="text-sm font-medium text-gray-500">사업자등록번호</dt>
                <dd className="mt-1 text-sm text-gray-900">{store.businessNumber || '-'}</dd>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">등록일</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(store.createdAt).toLocaleDateString()}
                </dd>
              </div>
              
              <div>
                <dt className="text-sm font-medium text-gray-500">최종 수정일</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(store.updatedAt).toLocaleDateString()}
                </dd>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default StoreInfoSection;