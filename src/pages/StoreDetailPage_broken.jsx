import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { getStoreDetail, updateStoreAdditionalInfo, createStoreContact, getStoreContacts, deleteStoreContact } from '../api/storeApi.js';
import { apiClient } from '../api/client.js';

const StoreDetailPage = () => {
  const { storeId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, isAdmin, user } = useAuth();
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [managers, setManagers] = useState([]);
  const [orderSystem, setOrderSystem] = useState('');
  const [brandName, setBrandName] = useState('');
  const [additionalPhones, setAdditionalPhones] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isEditingAdditional, setIsEditingAdditional] = useState(false);
  const [additionalData, setAdditionalData] = useState({
    address: '',
    posSystem: '',
    posSystemBrand: '',
    orderSystem: '',
    brandName: ''
  });
  const [contacts, setContacts] = useState([]);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactFormData, setContactFormData] = useState({
    seq: '',
    name: '',
    phone: '',
    position: '',
    email: ''
  });

  // 담당자 목록 가져오기
  const fetchManagers = async () => {
    try {
      const response = await apiClient.get('/api/managers');
      if (response.success) {
        let managersData = [];
        if (response.data?.managers) {
          managersData = response.data.managers;
        } else if (Array.isArray(response.data)) {
          managersData = response.data;
        }
        setManagers(managersData.filter(m => m && m.email && m.name));
      }
    } catch (error) {
      console.error('담당자 목록 가져오기 실패:', error);
    }
  };

  // 담당자 이름 찾기
  const getOwnerName = (ownerId) => {
    if (!ownerId) return '미배정';
    const manager = managers.find(m => m.email === ownerId);
    return manager?.name || ownerId;
  };

  useEffect(() => {
    const fetchStore = async () => {
      try {
        setLoading(true);
        
        // 먼저 state에서 전달된 데이터 확인
        if (location.state?.storeData) {
          const storeData = location.state.storeData;
          setStore(storeData);
          // 추가 정보 데이터 초기화
          setAdditionalData({
            address: storeData.store_address || '',
            posSystem: storeData.pos_system || '',
            posSystemBrand: storeData.pos_system_brand || '',
            orderSystem: storeData.order_system || '',
            brandName: storeData.brand_name || ''
          });
          setLoading(false);
          return;
        }
        
        // API로 매장 상세 정보 조회
        const response = await getStoreDetail(storeId);
        
        if (response.success) {
          // Lambda에서 반환하는 데이터 구조: response.data.store
          const storeData = response.data.store || response.data;
          console.log('🔍 API 응답 전체:', response);
          console.log('🔍 storeData:', storeData);
          console.log('🔍 추가 정보 필드들:');
          console.log('  - store_address:', storeData.store_address);
          console.log('  - pos_system:', storeData.pos_system);
          console.log('  - pos_system_brand:', storeData.pos_system_brand);
          console.log('  - order_system:', storeData.order_system);
          console.log('  - brand_name:', storeData.brand_name);
          
          setStore(storeData);
          // 추가 정보 데이터 초기화
          setAdditionalData({
            address: storeData.store_address || '',
            posSystem: storeData.pos_system || '',
            posSystemBrand: storeData.pos_system_brand || '',
            orderSystem: storeData.order_system || '',
            brandName: storeData.brand_name || ''
          });
          setError(null);
        } else {
          setError(response.error);
        }
      } catch (err) {
        console.error('매장 상세 조회 실패:', err);
        setError('매장 정보를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    if (storeId) {
      fetchStore();
      fetchManagers();
      fetchContacts();
    }
  }, [storeId, location.state]);

  // store 데이터가 변경될 때 additionalData 동기화
  useEffect(() => {
    if (store) {
      setAdditionalData({
        address: store.store_address || '',
        posSystem: store.pos_system || '',
        posSystemBrand: store.pos_system_brand || '',
        orderSystem: store.order_system || '',
        brandName: store.brand_name || ''
      });
    }
  }, [store]);

  // 직원 연락처 목록 가져오기
  const fetchContacts = async () => {
    try {
      const response = await getStoreContacts(storeId);
      if (response.success) {
        setContacts(response.data.contacts || []);
      }
    } catch (error) {
      console.error('직원 연락처 가져오기 실패:', error);
    }
  };

  // 직원 연락처 추가
  const handleSaveContact = async () => {
    try {
      if (!contactFormData.name || !contactFormData.phone) {
        alert('이름과 전화번호는 필수입니다.');
        return;
      }

      const response = await createStoreContact(storeId, contactFormData);
      
      if (response.success) {
        setContacts(prev => [...prev, response.data.contact]);
        setContactFormData({
          seq: '',
          name: '',
          phone: '',
          position: '',
          email: ''
        });
        setShowContactModal(false);
        alert('직원 연락처가 등록되었습니다.');
      } else {
        alert(`등록 실패: ${response.error}`);
      }
    } catch (error) {
      console.error('직원 연락처 저장 실패:', error);
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  // 직원 연락처 삭제
  const handleDeleteContact = async (contactId) => {
    try {
      if (confirm('해당 직원 연락처를 삭제하시겠습니까?')) {
        const response = await deleteStoreContact(storeId, contactId);
        
        if (response.success) {
          setContacts(prev => prev.filter(contact => contact.contact_id !== contactId));
          alert('직원 연락처가 삭제되었습니다.');
        } else {
          alert(`삭제 실패: ${response.error}`);
        }
      }
    } catch (error) {
      console.error('직원 연락처 삭제 실패:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // 추가 정보 저장 핸들러
  const handleSaveAdditionalInfo = async () => {
    try {
      console.log('추가 정보 저장 시도:', additionalData);
      
      // updateStoreAdditionalInfo API 함수 사용 (PATCH 방식)
      const response = await updateStoreAdditionalInfo(storeId, {
        address: additionalData.address,
        posSystem: additionalData.posSystem,
        posSystemBrand: additionalData.posSystemBrand,
        orderSystem: additionalData.orderSystem,
        brandName: additionalData.brandName
      });
      
      if (response.success) {
        // 서버에서 업데이트된 데이터로 로컬 상태 업데이트
        setStore(prevStore => ({
          ...prevStore,
          store_address: additionalData.address,
          pos_system: additionalData.posSystem,
          pos_system_brand: additionalData.posSystemBrand,
          order_system: additionalData.orderSystem,
          brand_name: additionalData.brandName,
          updated_at: new Date().toISOString()
        }));
        
        setIsEditingAdditional(false);
        alert('추가 정보가 저장되었습니다.');
      } else {
        console.error('저장 실패:', response.error);
        alert(`저장 실패: ${response.error}`);
      }
      
    } catch (error) {
      console.error('추가 정보 저장 실패:', error);
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  // 상태 표시 함수
  const getStatusDisplay = (status) => {
    const statusConfig = {
      'CONTACT_PENDING': { label: '연락대기', bg: '#f3f4f6', text: '#6b7280' },
      'CONTACT_COMPLETED': { label: '연락완료', bg: '#dbeafe', text: '#1e40af' },
      'PROPOSAL_SENT': { label: '제안서발송', bg: '#f3e8ff', text: '#7c3aed' },
      'UNDER_REVIEW': { label: '검토중', bg: '#fef3c7', text: '#d97706' },
      'ADOPTION_CONFIRMED': { label: '도입확정', bg: '#fed7aa', text: '#ea580c' },
      'SIGNUP_COMPLETED': { label: '가입완료', bg: '#dcfce7', text: '#16a34a' },
      'IN_PROGRESS': { label: '진행중', bg: '#fef3c7', text: '#d97706' },
      'PRE_INTRODUCTION': { label: '도입전', bg: '#f3f4f6', text: '#6b7280' }
    };
    
    return statusConfig[status] || { label: status || '미정', bg: '#f3f4f6', text: '#6b7280' };
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            border: '3px solid #f97316', 
            borderTop: '3px solid transparent', 
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
          <p style={{ marginTop: '20px', fontSize: '16px', color: '#64748b', fontWeight: '500' }}>매장 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
        <div style={{ 
          textAlign: 'center', 
          backgroundColor: 'white', 
          padding: '48px 32px', 
          borderRadius: '24px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          maxWidth: '400px',
          margin: '20px'
        }}>
          <div style={{ 
            width: '64px', 
            height: '64px', 
            backgroundColor: '#fee2e2', 
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px'
          }}>
            <svg width="32" height="32" fill="#dc2626" viewBox="0 0 24 24">
              <path d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', margin: '0 0 12px 0' }}>오류가 발생했습니다</h3>
          <p style={{ fontSize: '15px', color: '#6b7280', marginBottom: '32px', lineHeight: '1.6' }}>{error}</p>
          <button
            onClick={() => navigate('/stores')}
            style={{
              padding: '16px 32px',
              backgroundColor: '#f97316',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              width: '100%',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#ea580c'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#f97316'}
          >
            매장 목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
        <div style={{ 
          textAlign: 'center',
          backgroundColor: 'white', 
          padding: '48px 32px', 
          borderRadius: '24px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          maxWidth: '400px',
          margin: '20px'
        }}>
          <div style={{ 
            width: '64px', 
            height: '64px', 
            backgroundColor: '#f3f4f6', 
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px'
          }}>
            <svg width="32" height="32" fill="#9ca3af" viewBox="0 0 24 24">
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', margin: '0 0 12px 0' }}>매장을 찾을 수 없습니다</h3>
          <p style={{ fontSize: '15px', color: '#6b7280', marginBottom: '32px' }}>요청하신 매장 정보가 존재하지 않습니다.</p>
          <button
            onClick={() => navigate('/stores')}
            style={{
              padding: '16px 32px',
              backgroundColor: '#f97316',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              width: '100%',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#ea580c'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#f97316'}
          >
            매장 목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const statusDisplay = getStatusDisplay(store.status);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'SUIT, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}>
      {/* 헤더 - 매장 목록 페이지와 동일한 스타일 */}
      <div style={{ 
        backgroundColor: '#f97316',
        padding: '12px 0',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        width: '100%'
      }}>
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto',
          padding: '0 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div 
              style={{ 
                width: '32px', 
                height: '32px', 
                backgroundColor: 'rgba(255, 255, 255, 0.2)', 
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              onClick={() => navigate('/stores')}
            >
              <svg width="18" height="18" fill="white" viewBox="0 0 24 24">
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
              </svg>
            </div>
            <h1 style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              color: 'white',
              margin: 0
            }}>
              매장 프로필 관리
            </h1>
          </div>
          
          {/* 버튼들 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              style={{
                padding: '8px 16px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
              onMouseOut={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
            >
              <svg width="14" height="14" fill="white" viewBox="0 0 24 24">
                <path d="M17 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14c1.1 0 2-.9 2-2V7l-4-4zM12 19c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zM15 9H5V5h10v4z"/>
              </svg>
              저장하기
            </button>
            
            {isAdmin() && (
              <button
                onClick={() => setIsEditing(!isEditing)}
                style={{
                  padding: '8px 12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
                onMouseOut={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
              >
                <svg width="14" height="14" fill="white" viewBox="0 0 24 24">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                </svg>
                {isEditing ? '완료' : '편집'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px' }}>
          
          {/* 왼쪽 - 프로필 영역 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* 기본 정보 카드 (수정 불가) */}
            <div style={{ 
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h3 style={{ 
                  fontSize: '16px', 
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
                    backgroundColor: '#f97316',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <svg width="12" height="12" fill="white" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                  </div>
                  기본 정보
                </h3>
              </div>
              
              <div style={{ 
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '16px'
              }}>
                <div>
                  <label style={{ 
                    fontSize: '12px', 
                    fontWeight: '600', 
                    color: '#6b7280',
                    display: 'block',
                    marginBottom: '8px'
                  }}>
                    Seq 번호
                  </label>
                  <div style={{
                    padding: '12px',
                    backgroundColor: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}>
                    <p style={{ 
                      fontSize: '14px', 
                      color: '#1f2937',
                      margin: 0,
                      fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
                      fontWeight: '400'
                    }}>
                      {store.seq || '-'}
                    </p>
                  </div>
                </div>
                
                <div>
                  <label style={{ 
                    fontSize: '12px', 
                    fontWeight: '600', 
                    color: '#6b7280',
                    display: 'block',
                    marginBottom: '8px'
                  }}>
                    매장명
                  </label>
                  <div style={{
                    padding: '12px',
                    backgroundColor: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}>
                    <p style={{ 
                      fontSize: '14px', 
                      color: '#1f2937',
                      margin: 0,
                      fontWeight: '500'
                    }}>
                      {store.store_name || '매장명 없음'}
                    </p>
                  </div>
                </div>
                
                <div>
                  <label style={{ 
                    fontSize: '12px', 
                    fontWeight: '600', 
                    color: '#6b7280',
                    display: 'block',
                    marginBottom: '8px'
                  }}>
                    대표번호
                  </label>
                  <div style={{
                    padding: '12px',
                    backgroundColor: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}>
                    <p style={{ 
                      fontSize: '14px', 
                      color: '#1f2937',
                      margin: 0,
                      fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
                      fontWeight: '400'
                    }}>
                      {store.store_phone || store.store_contact_phone || '-'}
                    </p>
                  </div>
                </div>
                
                <div>
                  <label style={{ 
                    fontSize: '12px', 
                    fontWeight: '600', 
                    color: '#6b7280',
                    display: 'block',
                    marginBottom: '8px'
                  }}>
                    담당자
                  </label>
                  <div style={{
                    padding: '12px',
                    backgroundColor: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}>
                    <p style={{ 
                      fontSize: '14px', 
                      color: store.owner_id ? '#1f2937' : '#9ca3af',
                      margin: 0,
                      fontWeight: '400'
                    }}>
                      {getOwnerName(store.owner_id)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 추가 정보 카드 (편집 가능) */}
            <div style={{ 
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h3 style={{ 
                  fontSize: '16px', 
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
                    backgroundColor: '#f97316',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <svg width="12" height="12" fill="white" viewBox="0 0 24 24">
                      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                    </svg>
                  </div>
                  추가 정보
                </h3>
                
                <button
                  onClick={() => {
                    if (isEditingAdditional) {
                      handleSaveAdditionalInfo();
                    } else {
                      setIsEditingAdditional(true);
                    }
                  }}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: isEditingAdditional ? '#10b981' : '#f97316',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <svg width="12" height="12" fill="white" viewBox="0 0 24 24">
                    {isEditingAdditional ? (
                      <path d="M17 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14c1.1 0 2-.9 2-2V7l-4-4zM12 19c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zM15 9H5V5h10v4z"/>
                    ) : (
                      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                    )}
                  </svg>
                  {isEditingAdditional ? '저장' : '편집'}
                </button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* 주소 */}
                <div>
                  <label style={{ 
                    fontSize: '12px', 
                    fontWeight: '600', 
                    color: '#6b7280',
                    display: 'block',
                    marginBottom: '8px'
                  }}>
                    주소
                  </label>
                  {isEditingAdditional ? (
                    <input
                      type="text"
                      value={additionalData.address}
                      onChange={(e) => setAdditionalData(prev => ({ ...prev, address: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px',
                      }}
                      placeholder="매장 주소를 입력해주세요"
                    />
                  ) : (
                    <div style={{
                      padding: '12px',
                      backgroundColor: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}>
                      <p style={{ 
                        fontSize: '14px', 
                        color: '#1f2937',
                        margin: 0
                      }}>
                        {additionalData.address || '주소 정보 없음'}
                      </p>
                    </div>
                  )}
                </div>
                
                {/* 사용 POS */}
                <div>
                  <label style={{ 
                    fontSize: '12px', 
                    fontWeight: '600', 
                    color: '#6b7280',
                    display: 'block',
                    marginBottom: '8px'
                  }}>
                    사용 POS
                  </label>
                  {isEditingAdditional ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <select
                        value={additionalData.posSystem}
                        onChange={(e) => setAdditionalData(prev => ({ ...prev, posSystem: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '12px 40px 12px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '14px',
                          backgroundColor: 'white',
                          appearance: 'none',
                          backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'m6 8 4 4 4-4\'/%3e%3c/svg%3e")',
                          backgroundPosition: 'right 12px center',
                          backgroundRepeat: 'no-repeat',
                          backgroundSize: '16px'
                        }}
                      >
                        <option value="">POS 시스템을 선택해주세요</option>
                        <option value="오케이포스">오케이포스</option>
                        <option value="이지포스">이지포스</option>
                        <option value="유니온포스">유니온포스</option>
                        <option value="기타">기타</option>
                      </select>
                      
                      {additionalData.posSystem === '기타' && (
                        <input
                          type="text"
                          value={additionalData.posSystemBrand}
                          onChange={(e) => setAdditionalData(prev => ({ ...prev, posSystemBrand: e.target.value }))}
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '14px'
                          }}
                          placeholder="POS 브랜드명을 입력해주세요"
                        />
                      )}
                    </div>
                  ) : (
                    <div style={{
                      padding: '12px',
                      backgroundColor: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}>
                      <p style={{ 
                        fontSize: '14px', 
                        color: '#1f2937',
                        margin: 0
                      }}>
                        {additionalData.posSystem ? `${additionalData.posSystem}${additionalData.posSystem === '기타' && additionalData.posSystemBrand ? ` (${additionalData.posSystemBrand})` : ''}` : 'POS 정보 없음'}
                      </p>
                    </div>
                  )}
                </div>
                
                {/* 오더 사용여부 */}
                <div>
                  <label style={{ 
                    fontSize: '12px', 
                    fontWeight: '600', 
                    color: '#6b7280',
                    display: 'block',
                    marginBottom: '8px'
                  }}>
                    오더 사용여부
                  </label>
                  {isEditingAdditional ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <select
                        value={additionalData.orderSystem}
                        onChange={(e) => setAdditionalData(prev => ({ ...prev, orderSystem: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '12px 40px 12px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '14px',
                          backgroundColor: 'white',
                          appearance: 'none',
                          backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'m6 8 4 4 4-4\'/%3e%3c/svg%3e")',
                          backgroundPosition: 'right 12px center',
                          backgroundRepeat: 'no-repeat',
                          backgroundSize: '16px'
                        }}
                      >
                        <option value="">오더 시스템을 선택해주세요</option>
                        <option value="테블릿오더">테블릿오더</option>
                        <option value="QR오더">QR오더</option>
                        <option value="키오스크">키오스크</option>
                        <option value="기타">기타</option>
                      </select>
                      
                      {additionalData.orderSystem && (
                        <input
                          type="text"
                          value={additionalData.brandName}
                          onChange={(e) => setAdditionalData(prev => ({ ...prev, brandName: e.target.value }))}
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '14px',
                              }}
                          placeholder="브랜드명을 입력해주세요"
                        />
                      )}
                    </div>
                  ) : (
                    <div style={{
                      padding: '12px',
                      backgroundColor: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}>
                      <p style={{ 
                        fontSize: '14px', 
                        color: '#1f2937',
                        margin: 0
                      }}>
                        {additionalData.orderSystem ? `${additionalData.orderSystem}${additionalData.brandName ? ` (${additionalData.brandName})` : ''}` : '오더 시스템 정보 없음'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 직원 연락처 관리 카드 */}
            <div style={{ 
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h3 style={{ 
                  fontSize: '16px', 
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
                    backgroundColor: '#f97316',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <svg width="12" height="12" fill="white" viewBox="0 0 24 24">
                      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                    </svg>
                  </div>
                  직원 연락처
                </h3>
                <button
                  onClick={() => setShowContactModal(true)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#f97316',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    fontFamily: 'SUIT'
                  }}
                >
                  + 등록
                </button>
              </div>
              
              <div>
                {/* 등록된 직원 연락처 테이블 */}
                {contacts.length > 0 ? (
                  <div style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    overflow: 'hidden'
                  }}>
                    {/* 테이블 헤더 */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '60px 1fr 120px 80px 120px 60px',
                      backgroundColor: '#f9fafb',
                      borderBottom: '1px solid #e5e7eb',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#374151'
                    }}>
                      <div style={{ padding: '8px 12px' }}>Seq</div>
                      <div style={{ padding: '8px 12px' }}>이름</div>
                      <div style={{ padding: '8px 12px' }}>전화번호</div>
                      <div style={{ padding: '8px 12px' }}>직급</div>
                      <div style={{ padding: '8px 12px' }}>이메일</div>
                      <div style={{ padding: '8px 12px' }}>삭제</div>
                    </div>
                    
                    {/* 테이블 본문 */}
                    {contacts.map((contact, index) => (
                      <div
                        key={contact.contact_id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '60px 1fr 120px 80px 120px 60px',
                          borderBottom: index < contacts.length - 1 ? '1px solid #f3f4f6' : 'none',
                          fontSize: '12px'
                        }}
                      >
                        <div style={{ padding: '8px 12px', color: '#6b7280' }}>{contact.seq || '-'}</div>
                        <div style={{ padding: '8px 12px', fontWeight: '500' }}>{contact.name}</div>
                        <div style={{ padding: '8px 12px', fontFamily: 'SUIT, monospace' }}>{contact.phone}</div>
                        <div style={{ padding: '8px 12px', color: '#6b7280' }}>{contact.position || '-'}</div>
                        <div style={{ padding: '8px 12px', color: '#6b7280', fontSize: '11px' }}>{contact.email || '-'}</div>
                        <div style={{ padding: '8px 12px' }}>
                          <button
                            onClick={() => handleDeleteContact(contact.contact_id)}
                            style={{
                              color: '#ef4444',
                              backgroundColor: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '11px',
                              fontFamily: 'SUIT'
                            }}
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{
                    padding: '40px 20px',
                    textAlign: 'center',
                    color: '#9ca3af',
                    fontSize: '14px'
                  }}>
                    <p style={{ margin: '0 0 8px 0', fontFamily: 'SUIT' }}>등록된 직원 연락처가 없습니다.</p>
                    <p style={{ 
                      margin: 0, 
                      fontSize: '12px', 
                      color: '#d1d5db',
                      fontFamily: 'SUIT'
                    }}>
                      상단의 "+ 등록" 버튼을 눌러 직원 연락처를 추가하세요.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 연락처 정보 카드 */}
            <div style={{ 
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h3 style={{ 
                  fontSize: '16px', 
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
                    backgroundColor: '#f97316',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <svg width="12" height="12" fill="white" viewBox="0 0 24 24">
                      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                    </svg>
                  </div>
                  직원 연락처
                </h3>
                <button
                  onClick={() => setShowContactModal(true)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#f97316',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  + 등록
                </button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                
                {/* 등록된 직원 연락처 테이블 */}
                {contacts.length > 0 ? (
                  <div style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    overflow: 'hidden'
                  }}>
                    {/* 테이블 헤더 */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '60px 1fr 120px 80px 80px 60px',
                      backgroundColor: '#f9fafb',
                      borderBottom: '1px solid #e5e7eb',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#374151'
                    }}>
                      <div style={{ padding: '8px 12px' }}>Seq</div>
                      <div style={{ padding: '8px 12px' }}>이름</div>
                      <div style={{ padding: '8px 12px' }}>전화번호</div>
                      <div style={{ padding: '8px 12px' }}>직급</div>
                      <div style={{ padding: '8px 12px' }}>이메일</div>
                      <div style={{ padding: '8px 12px' }}>삭제</div>
                    </div>
                    
                    {/* 테이블 본문 */}
                    {contacts.map((contact, index) => (
                      <div
                        key={contact.contact_id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '60px 1fr 120px 80px 80px 60px',
                          borderBottom: index < contacts.length - 1 ? '1px solid #f3f4f6' : 'none',
                          fontSize: '12px'
                        }}
                      >
                    {isEditingAdditional ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px', alignItems: 'end' }}>
                        <input
                          type="text"
                          value={contact.name}
                          onChange={(e) => {
                            const updated = [...additionalPhones];
                            updated[index].name = e.target.value;
                            setAdditionalPhones(updated);
                          }}
                          style={{
                            padding: '8px',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            fontSize: '14px'
                          }}
                          placeholder="담당자명"
                        />
                        <input
                          type="tel"
                          value={contact.phone}
                          onChange={(e) => {
                            const updated = [...additionalPhones];
                            updated[index].phone = e.target.value;
                            setAdditionalPhones(updated);
                          }}
                          style={{
                            padding: '8px',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            fontSize: '14px',
                            fontFamily: 'monospace'
                          }}
                          placeholder="연락처"
                        />
                        <button
                          onClick={() => {
                            const updated = additionalPhones.filter((_, i) => i !== index);
                            setAdditionalPhones(updated);
                          }}
                          style={{
                            padding: '8px',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          삭제
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{
                          fontSize: '12px',
                          fontWeight: '400',
                          color: '#374151'
                        }}>
                          {contact.name || '직원'}
                        </span>
                        <span style={{
                          fontSize: '14px',
                          fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
                          color: '#374151'
                        }}>
                          {contact.phone}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
                
                {!isEditing && additionalPhones.length === 0 && (
                  <div style={{
                    padding: '20px',
                    textAlign: 'center',
                    color: '#9ca3af',
                    fontSize: '14px'
                  }}>
                    등록된 직원 연락처가 없습니다.
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* 오른쪽 영역 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* 진행 상태 영역 */}
            <div style={{ 
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '24px'
            }}>
              <h3 style={{ 
                fontSize: '16px', 
                fontWeight: '600', 
                color: '#1f2937',
                margin: '0 0 20px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  backgroundColor: '#f97316',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg width="12" height="12" fill="white" viewBox="0 0 24 24">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                진행 상태
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ 
                    fontSize: '12px', 
                    fontWeight: '600', 
                    color: '#6b7280',
                    display: 'block',
                    marginBottom: '8px'
                  }}>
                    현재 상태
                  </label>
                  <div style={{
                    padding: '12px',
                    backgroundColor: statusDisplay.bg,
                    border: `1px solid ${statusDisplay.bg}`,
                    borderRadius: '8px'
                  }}>
                    <p style={{ 
                      fontSize: '14px', 
                      color: statusDisplay.text,
                      margin: 0,
                      fontWeight: '400'
                    }}>
                      {statusDisplay.label}
                    </p>
                  </div>
                </div>
                
                {isAdmin() && (
                  <div>
                    <label style={{ 
                      fontSize: '12px', 
                      fontWeight: '400', 
                      color: '#6b7280',
                      display: 'block',
                      marginBottom: '8px'
                    }}>
                      상태 변경
                    </label>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px',
                        backgroundColor: 'white'
                      }}
                    >
                      <option value="">상태를 선택해주세요</option>
                      <option value="CONTACT_PENDING">연락대기</option>
                      <option value="CONTACT_COMPLETED">연락완료</option>
                      <option value="PROPOSAL_SENT">제안서발송</option>
                      <option value="UNDER_REVIEW">검토중</option>
                      <option value="ADOPTION_CONFIRMED">도입확정</option>
                      <option value="SIGNUP_COMPLETED">가입완료</option>
                      <option value="INSTALLATION_PENDING">설치대기</option>
                      <option value="SERVICE_ACTIVE">서비스활성</option>
                      <option value="PAUSED">일시중지</option>
                      <option value="CANCELLED">해지</option>
                      <option value="REJECTED">거절</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Sales Log (메모 영역) */}
            <div style={{ 
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h3 style={{ 
                  fontSize: '16px', 
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
                    backgroundColor: '#f97316',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <svg width="12" height="12" fill="white" viewBox="0 0 24 24">
                      <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                  </div>
                  Sales Log
                </h3>
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <textarea
                  placeholder="특이사항이나 영업 활동을 기록해주세요..."
                  style={{
                    width: '100%',
                    minHeight: '120px',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                      resize: 'vertical'
                  }}
                />
              </div>
              
              {/* 기록된 로그 목록 */}
              <div style={{ 
                borderTop: '1px solid #e5e7eb',
                paddingTop: '16px',
                marginBottom: '20px'
              }}>
                <h4 style={{ 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  color: '#1f2937',
                  margin: '0 0 12px 0'
                }}>
                  이전 기록
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* 예시 로그 항목 */}
                  <div style={{
                    padding: '12px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    borderLeft: '3px solid #f97316'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: '400',
                        color: '#1f2937'
                      }}>
                        {getOwnerName(store.owner_id)}
                      </span>
                      <span style={{
                        fontSize: '11px',
                        color: '#6b7280'
                      }}>
                        2024-01-15
                      </span>
                    </div>
                    <p style={{
                      fontSize: '13px',
                      color: '#4b5563',
                      margin: 0,
                      lineHeight: '1.4'
                    }}>
                      고객 연락 완료. 제안서 검토 중이며 다음주 미팅 예정.
                    </p>
                  </div>
                  
                  <div style={{
                    padding: '12px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    borderLeft: '3px solid #10b981'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: '400',
                        color: '#1f2937'
                      }}>
                        {getOwnerName(store.owner_id)}
                      </span>
                      <span style={{
                        fontSize: '11px',
                        color: '#6b7280'
                      }}>
                        2024-01-10
                      </span>
                    </div>
                    <p style={{
                      fontSize: '13px',
                      color: '#4b5563',
                      margin: 0,
                      lineHeight: '1.4'
                    }}>
                      첫 연락 시도. 사장님 부재로 직원과 통화. 재연락 예정.
                    </p>
                  </div>
                </div>
                
                <div style={{
                  textAlign: 'center',
                  marginTop: '16px'
                }}>
                  <p style={{
                    fontSize: '12px',
                    color: '#9ca3af',
                    margin: 0
                  }}>
                    총 2개의 기록
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* 직원 연락처 등록 모달 */}
      {showContactModal && (
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
            width: '400px',
            maxWidth: '90vw'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#1f2937',
              margin: '0 0 20px 0'
            }}>
              직원 연락처 등록
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* 직원번호 (선택) */}
              <div>
                <label style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#6b7280',
                  display: 'block',
                  marginBottom: '6px'
                }}>
                  직원번호
                </label>
                <input
                  type="text"
                  value={contactFormData.seq}
                  onChange={(e) => setContactFormData(prev => ({ ...prev, seq: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'SUIT'
                  }}
                  placeholder="직원번호 (선택사항)"
                />
              </div>
              
              {/* 이름 (필수) */}
              <div>
                <label style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#6b7280',
                  display: 'block',
                  marginBottom: '6px'
                }}>
                  이름 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={contactFormData.name}
                  onChange={(e) => setContactFormData(prev => ({ ...prev, name: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'SUIT'
                  }}
                  placeholder="이름을 입력하세요"
                />
              </div>
              
              {/* 전화번호 (필수) */}
              <div>
                <label style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#6b7280',
                  display: 'block',
                  marginBottom: '6px'
                }}>
                  전화번호 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="tel"
                  value={contactFormData.phone}
                  onChange={(e) => setContactFormData(prev => ({ ...prev, phone: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'SUIT, monospace'
                  }}
                  placeholder="010-1234-5678"
                />
              </div>
              
              {/* 직급/직책 (선택) */}
              <div>
                <label style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#6b7280',
                  display: 'block',
                  marginBottom: '6px'
                }}>
                  직급/직책
                </label>
                <input
                  type="text"
                  value={contactFormData.position}
                  onChange={(e) => setContactFormData(prev => ({ ...prev, position: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'SUIT'
                  }}
                  placeholder="예: 매니저, 사장님, 직원"
                />
              </div>
              
              {/* 이메일 (선택) */}
              <div>
                <label style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#6b7280',
                  display: 'block',
                  marginBottom: '6px'
                }}>
                  이메일
                </label>
                <input
                  type="email"
                  value={contactFormData.email}
                  onChange={(e) => setContactFormData(prev => ({ ...prev, email: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'SUIT'
                  }}
                  placeholder="example@email.com"
                />
              </div>
            </div>
            
            <div style={{
              display: 'flex',
              gap: '12px',
              marginTop: '24px'
            }}>
              <button
                onClick={() => setShowContactModal(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  fontFamily: 'SUIT'
                }}
              >
                취소
              </button>
              <button
                onClick={handleSaveContact}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#f97316',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  fontFamily: 'SUIT'
                }}
              >
                등록
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default StoreDetailPage;