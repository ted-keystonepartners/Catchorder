import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { getStoreDetail, updateStore, updateStoreAdditionalInfo, createStoreContact, getStoreContacts, deleteStoreContact, updateStoreStatus, createSalesLog, getSalesLogs, deleteSalesLog } from '../api/storeApi.js';
import { apiClient } from '../api/client.js';
import { formatPhoneInput } from '../utils/formatter.js';
import { createConsentLink, getConsentResponses, getConsentStatus } from '../api/consentApi.js';
import { copyToClipboard } from '../utils/clipboard.js';
import { useToast } from '../hooks/useToast.js';
import ToastContainer from '../components/ui/Toast.jsx';
import ScheduleTab from '../components/ScheduleTab.jsx';

// 안전한 날짜 포맷팅 유틸리티 함수
const formatSafeDate = (dateValue, options = { includeTime: true }) => {
  if (!dateValue) return '정보 없음';
  
  try {
    const date = new Date(dateValue);
    
    if (isNaN(date.getTime())) {
      console.error('Invalid date value:', dateValue);
      return '날짜 형식 오류';
    }
    
    if (options.includeTime) {
      return `${date.toLocaleDateString('ko-KR')} ${date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleString('ko-KR');
    }
  } catch (error) {
    console.error('Date parsing error:', error, dateValue);
    return '날짜 처리 오류';
  }
};

const StoreDetailPage = () => {
  const { storeId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, isAdmin, user } = useAuth();
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingBasic, setIsEditingBasic] = useState(false);
  const [managers, setManagers] = useState([]);
  const [basicData, setBasicData] = useState({
    seq: '',
    store_name: '',
    store_phone: '',
    store_address: ''
  });
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
    email: '',
    note: ''
  });
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [salesLogs, setSalesLogs] = useState([]);
  const [newLogContent, setNewLogContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // 동의서 관련 상태
  const [consentLink, setConsentLink] = useState(null);
  const [consentResponses, setConsentResponses] = useState([]);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentLoading, setConsentLoading] = useState(false);
  
  // 토스트 알림
  const { success, error: showError, toasts, removeToast } = useToast();
  
  // 일정 관리 ref
  const scheduleAddRef = useRef();

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

  // 성공 메시지 표시
  const showSuccess = (message) => {
    setSuccessMessage(message);
    setShowSuccessModal(true);
  };

  // 고정 동의서 링크 생성 (즉시 실행)
  const getConsentLink = () => {
    const consentUrl = `${window.location.origin}/consent/${storeId}`;
    return {
      link_id: `link_${storeId}`,
      token: storeId,
      consent_url: consentUrl,
      expires_at: null,
      message: "링크를 복사해서 고객에게 전달하세요"
    };
  };

  // URL 복사
  const handleCopyLink = async () => {
    const linkData = getConsentLink();
    
    const copied = await copyToClipboard(linkData.consent_url);
    if (copied) {
      success('링크가 클립보드에 복사되었습니다!');
    } else {
      showError('복사에 실패했습니다. 직접 복사해주세요.');
    }
  };

  // 동의서 응답 조회
  const fetchConsentResponses = async () => {
    try {
      setConsentLoading(true);
      const data = await getConsentResponses(storeId);
      
      
      setConsentResponses(data.responses || []);
    } catch (err) {
      console.error('❌ 응답 조회 실패:', err);
      showError('응답을 불러올 수 없습니다.');
      setConsentResponses([]);
    } finally {
      setConsentLoading(false);
    }
  };

  // 동의서 현황 보기 모달
  const handleShowConsentResponses = () => {
    setShowConsentModal(true);
    fetchConsentResponses();
  };

  useEffect(() => {
    const fetchStore = async () => {
      try {
        setLoading(true);
        
        // 먼저 state에서 전달된 데이터 확인
        if (location.state?.storeData) {
          const storeData = location.state.storeData;
          setStore(storeData);
          // 기본 정보 데이터 초기화
          setBasicData({
            seq: storeData.seq || '',
            store_name: storeData.store_name || '',
            store_phone: storeData.store_phone || '',
            store_address: storeData.store_address || ''
          });
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
          // 기본 정보 데이터 초기화
          setBasicData({
            seq: storeData.seq || '',
            store_name: storeData.store_name || '',
            store_phone: storeData.store_phone || '',
            store_address: storeData.store_address || ''
          });
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
      fetchSalesLogs();
      fetchConsentResponses();
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

  // 기본 정보 저장 함수
  const handleSaveBasicInfo = async () => {
    try {
      const response = await updateStore(storeId, {
        seq: basicData.seq,
        store_name: basicData.store_name,
        store_phone: basicData.store_phone,
        store_address: basicData.store_address
      });

      if (response.success) {
        setStore(prev => ({
          ...prev,
          ...basicData,
          updated_at: new Date().toISOString()
        }));
        setIsEditingBasic(false);
        showSuccess('기본 정보가 저장되었습니다.');
      } else {
        alert('저장에 실패했습니다: ' + response.error);
      }
    } catch (error) {
      console.error('기본 정보 저장 실패:', error);
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  // 직원 연락처 목록 가져오기
  const fetchContacts = async () => {
    try {
      const response = await getStoreContacts(storeId);
      if (response.success && response.data) {
        setContacts(response.data.contacts || []);
      } else {
        console.log('직원 연락처 조회 실패 또는 데이터 없음:', response.error);
        setContacts([]);
      }
    } catch (error) {
      console.error('직원 연락처 가져오기 실패:', error);
      setContacts([]);
    }
  };

  // Sales Log 목록 가져오기
  const fetchSalesLogs = async () => {
    try {
      const response = await getSalesLogs(storeId);
      if (response.success && response.data) {
        const logs = response.data.logs || [];
        // 최신순으로 정렬 (created_at 기준)
        const sortedLogs = logs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setSalesLogs(sortedLogs);
        console.log('Sales Log 데이터:', sortedLogs);
        console.log('Sales Log 개수:', sortedLogs.length);
      } else {
        console.log('Sales Log 조회 실패 또는 데이터 없음:', response.error);
        setSalesLogs([]);
      }
    } catch (error) {
      console.error('Sales Log 가져오기 실패:', error);
      setSalesLogs([]);
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
          email: '',
          note: ''
        });
        setShowContactModal(false);
        showSuccess('직원 연락처가 등록되었습니다.');
      } else {
        alert(`등록 실패: ${response.error}`);
      }
    } catch (error) {
      console.error('직원 연락처 저장 실패:', error);
      alert('저장 중 오류가 발생했습니다.');
    }
  };


  const handleLogout = async () => {
    await logout();
    navigate('/');
  };


  // 상태 변경 핸들러
  const handleStatusChange = async (newStatus) => {
    try {
      const response = await updateStoreStatus(storeId, newStatus);
      
      if (response.success) {
        // 로컬 상태 업데이트
        setStore(prevStore => ({
          ...prevStore,
          status: newStatus,
          updated_at: new Date().toISOString()
        }));
        
        showSuccess('매장 상태가 변경되었습니다.');
      } else {
        alert(`상태 변경 실패: ${response.error}`);
      }
    } catch (error) {
      console.error('상태 변경 실패:', error);
      alert('상태 변경 중 오류가 발생했습니다.');
    }
  };

  // Sales Log 저장 핸들러
  const handleSaveSalesLog = async () => {
    // 이미 저장 중이면 중단
    if (isSaving) {
      console.log('이미 저장 중입니다.');
      return;
    }

    try {
      if (!newLogContent.trim()) {
        alert('기록 내용을 입력해주세요.');
        return;
      }

      setIsSaving(true);
      console.log('Sales Log 저장 시작:', newLogContent.trim());

      const logData = {
        seq: store.seq,
        owner_id: user.email,
        owner_name: user.name || user.email,
        content: newLogContent.trim()
      };

      const response = await createSalesLog(storeId, logData);
      
      if (response.success) {
        console.log('Sales Log 저장 성공');
        // 로그 목록 새로고침
        await fetchSalesLogs();
        // 입력 내용 초기화
        setNewLogContent('');
        // contentEditable 요소도 초기화
        const editableElement = document.querySelector('[contentEditable]');
        if (editableElement) {
          editableElement.innerText = '';
          editableElement.focus();
        }
        showSuccess('Sales Log가 저장되었습니다.');
      } else {
        console.error('저장 실패:', response.error);
        alert(`저장 실패: ${response.error}`);
      }
    } catch (error) {
      console.error('Sales Log 저장 실패:', error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
      console.log('저장 프로세스 완료');
    }
  };

  // Sales Log 삭제 핸들러
  const handleDeleteSalesLog = async (logId) => {
    try {
      if (confirm('해당 기록을 삭제하시겠습니까?')) {
        const response = await deleteSalesLog(storeId, logId);
        
        if (response.success) {
          await fetchSalesLogs();
          showSuccess('Sales Log가 삭제되었습니다.');
        } else {
          alert(`삭제 실패: ${response.error}`);
        }
      }
    } catch (error) {
      console.error('Sales Log 삭제 실패:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
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
        showSuccess('추가 정보가 저장되었습니다.');
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
                
                {isAdmin() && (
                  <button
                    onClick={() => {
                      if (isEditingBasic) {
                        handleSaveBasicInfo();
                      } else {
                        setIsEditingBasic(true);
                      }
                    }}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#f97316',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#ea580c'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#f97316'}
                  >
                    <svg width="12" height="12" fill="white" viewBox="0 0 24 24">
                      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                    </svg>
                    {isEditingBasic ? '완료' : '편집'}
                  </button>
                )}
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
                  {isEditingBasic ? (
                    <input
                      type="text"
                      value={basicData.seq}
                      onChange={(e) => setBasicData(prev => ({ ...prev, seq: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
                        fontWeight: '400'
                      }}
                      placeholder="Seq 번호를 입력하세요"
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
                        margin: 0,
                        fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
                        fontWeight: '400'
                      }}>
                        {store.seq || '-'}
                      </p>
                    </div>
                  )}
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
                  {isEditingBasic ? (
                    <input
                      type="text"
                      value={basicData.store_name}
                      onChange={(e) => setBasicData(prev => ({ ...prev, store_name: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                      placeholder="매장명을 입력하세요"
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
                        margin: 0,
                        fontWeight: '500'
                      }}>
                        {store.store_name || '매장명 없음'}
                      </p>
                    </div>
                  )}
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
                  {isEditingBasic ? (
                    <input
                      type="text"
                      value={basicData.store_phone}
                      onChange={(e) => {
                        const formattedValue = formatPhoneInput(e.target.value, basicData.store_phone);
                        setBasicData(prev => ({ ...prev, store_phone: formattedValue }));
                      }}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
                        fontWeight: '400'
                      }}
                      placeholder="010-0000-0000"
                      maxLength={13}
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
                        margin: 0,
                        fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
                        fontWeight: '400'
                      }}>
                        {store.store_phone || store.store_contact_phone || '-'}
                      </p>
                    </div>
                  )}
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

            {/* 일정 관리 섹션 */}
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
                      <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
                    </svg>
                  </div>
                  일정 관리
                </h3>
                <button
                  onClick={() => {
                    // ScheduleTab의 모달 열기 함수를 호출
                    if (scheduleAddRef.current) {
                      scheduleAddRef.current();
                    }
                  }}
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
                <ScheduleTab 
                  storeId={storeId} 
                  onAddClick={scheduleAddRef}
                />
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
                      gridTemplateColumns: '100px 80px 120px 100px',
                      backgroundColor: '#f9fafb',
                      borderBottom: '1px solid #e5e7eb',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#374151'
                    }}>
                      <div style={{ padding: '8px 12px' }}>이름</div>
                      <div style={{ padding: '8px 12px' }}>직급</div>
                      <div style={{ padding: '8px 12px' }}>전화번호</div>
                      <div style={{ padding: '8px 12px' }}>참고사항</div>
                    </div>
                    
                    {/* 테이블 본문 */}
                    {contacts.map((contact, index) => (
                      <div
                        key={contact.contact_id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '100px 80px 120px 100px',
                          borderBottom: index < contacts.length - 1 ? '1px solid #f3f4f6' : 'none',
                          fontSize: '12px'
                        }}
                      >
                        <div style={{ padding: '8px 12px', fontWeight: '500' }}>{contact.name}</div>
                        <div style={{ padding: '8px 12px', color: '#6b7280' }}>{contact.position || '-'}</div>
                        <div style={{ padding: '8px 12px', fontFamily: 'SUIT, monospace' }}>{contact.phone}</div>
                        <div style={{ padding: '8px 12px', color: '#6b7280', fontSize: '11px' }}>{contact.note || '-'}</div>
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

            {/* Sales Log (메모 영역) */}
            <div style={{ 
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '24px',
              marginTop: '20px'
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
              
              <div style={{ marginBottom: '20px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '24px',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  transition: 'all 0.2s ease'
                }}>
                  <div 
                    contentEditable
                    onInput={(e) => {
                      setNewLogContent(e.target.innerText);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (newLogContent.trim() && !isSaving) {
                          handleSaveSalesLog();
                        }
                      }
                    }}
                    style={{
                      flex: 1,
                      minHeight: '20px',
                      maxHeight: '120px',
                      outline: 'none',
                      fontSize: '14px',
                      lineHeight: '1.4',
                      fontFamily: 'SUIT',
                      color: '#374151',
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}
                    data-placeholder={newLogContent ? '' : '메시지를 입력하세요...'}
                  />
                  
                  <button
                    onClick={handleSaveSalesLog}
                    disabled={!newLogContent.trim() || isSaving}
                    style={{
                      width: '32px',
                      height: '32px',
                      backgroundColor: newLogContent.trim() ? '#f97316' : '#e5e7eb',
                      border: 'none',
                      borderRadius: '16px',
                      cursor: newLogContent.trim() ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease',
                      flexShrink: 0
                    }}
                    onMouseOver={(e) => {
                      if (newLogContent.trim()) {
                        e.target.style.backgroundColor = '#ea580c';
                        e.target.style.transform = 'scale(1.05)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (newLogContent.trim()) {
                        e.target.style.backgroundColor = '#f97316';
                        e.target.style.transform = 'scale(1)';
                      }
                    }}
                  >
                    <svg 
                      width="16" 
                      height="16" 
                      fill={newLogContent.trim() ? 'white' : '#9ca3af'} 
                      viewBox="0 0 24 24"
                      style={{
                        transform: 'rotate(-45deg)'
                      }}
                    >
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                    </svg>
                  </button>
                </div>
              </div>
              
              <style>{`
                [contentEditable]:empty:before {
                  content: attr(data-placeholder);
                  color: #9ca3af;
                  pointer-events: none;
                }
              `}</style>
              
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
                  margin: '0 0 12px 0',
                  fontFamily: 'SUIT'
                }}>
                  이전 기록
                </h4>
                
                {salesLogs.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {salesLogs.map((log, index) => {
                      // 어드민이 작성한 메시지인지 확인 (owner_name이 '관리자'이거나 owner_id가 admin@example.com)
                      const isAdminMessage = log.owner_name === '관리자' || log.owner_id === 'admin@example.com' || 
                                           (log.owner_name && log.owner_name.includes('관리'));
                      
                      return (
                        <div key={log.log_id} style={{
                          maxWidth: '80%',
                          marginLeft: isAdminMessage ? '0' : 'auto',
                          marginRight: isAdminMessage ? 'auto' : '0',
                          backgroundColor: isAdminMessage ? '#e3f2fd' : '#f0f2f5',
                          borderRadius: isAdminMessage ? '18px 18px 18px 4px' : '18px 18px 4px 18px',
                          padding: '12px 16px',
                          position: 'relative',
                          border: isAdminMessage ? '1px solid #bbdefb' : 'none'
                        }}>
                          {isAdminMessage && (
                            <div style={{
                              fontSize: '10px',
                              color: '#1976d2',
                              fontWeight: '600',
                              marginBottom: '4px',
                              fontFamily: 'SUIT'
                            }}>
                              관리자
                            </div>
                          )}
                          <p style={{
                            fontSize: '14px',
                            color: isAdminMessage ? '#0d47a1' : '#1f2937',
                            margin: '0 0 6px 0',
                            lineHeight: '1.4',
                            fontFamily: 'SUIT',
                            wordBreak: 'break-word'
                          }}>
                            {log.content}
                          </p>
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <span style={{
                              fontSize: '11px',
                              color: isAdminMessage ? '#1976d2' : '#6b7280',
                              fontFamily: 'SUIT'
                            }}>
                              {new Date(log.created_at).toLocaleDateString('ko-KR')} {new Date(log.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isAdmin() && (
                              <button
                                onClick={() => handleDeleteSalesLog(log.log_id)}
                                style={{
                                  color: '#ef4444',
                                  backgroundColor: 'transparent',
                                  border: 'none',
                                  cursor: 'pointer',
                                  fontSize: '11px',
                                  fontFamily: 'SUIT',
                                  padding: '2px 4px',
                                  marginLeft: '8px'
                                }}
                              >
                                삭제
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px 20px',
                    color: '#9ca3af',
                    fontSize: '14px'
                  }}>
                    <p style={{ margin: '0 0 8px 0', fontFamily: 'SUIT' }}>등록된 Sales Log가 없습니다.</p>
                    <p style={{ 
                      margin: 0, 
                      fontSize: '12px', 
                      color: '#d1d5db',
                      fontFamily: 'SUIT'
                    }}>
                      위의 텍스트 영역에 내용을 입력하고 저장 버튼을 눌러 기록을 추가하세요.
                    </p>
                  </div>
                )}
                
                {salesLogs.length > 0 && (
                  <div style={{
                    textAlign: 'center',
                    marginTop: '16px'
                  }}>
                    <p style={{
                      fontSize: '12px',
                      color: '#9ca3af',
                      margin: 0,
                      fontFamily: 'SUIT'
                    }}>
                      총 {salesLogs.length}개의 기록
                    </p>
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
                  <select
                    value={store.status || ''}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
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
                    <option value="CONTACT_PENDING">연락대기</option>
                    <option value="CONTACT_COMPLETED">연락완료</option>
                    <option value="PROPOSAL_SENT">제안서발송</option>
                    <option value="UNDER_REVIEW">검토중</option>
                    <option value="ADOPTION_CONFIRMED">도입확정</option>
                    <option value="PAUSED">일시중지</option>
                    <option value="CANCELLED">해지</option>
                    <option value="REJECTED">거절</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 동의서 링크 섹션 - 모든 매장에 항상 표시 */}
            <div style={{ 
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '24px'
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
                        <path d="M9 12h6m-6-4h6m-5 8h4M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 010 2h-1v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6H3a1 1 0 010-2h4z"/>
                      </svg>
                    </div>
                    동의서 링크
                  </h3>
                </div>

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}>

                  {/* 고정 동의서 링크 표시 */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    {/* URL 박스와 복사 아이콘 */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      backgroundColor: '#f9fafb',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        flex: 1,
                        padding: '12px',
                        fontSize: '13px',
                        fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
                        wordBreak: 'break-all',
                        color: '#374151',
                        lineHeight: '1.5'
                      }}>
                        {`${window.location.origin}/consent/${storeId}`}
                      </div>
                      
                      {/* 복사 아이콘 버튼 */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          const consentUrl = `${window.location.origin}/consent/${storeId}`;
                          navigator.clipboard.writeText(consentUrl).then(() => {
                            alert('링크가 복사되었습니다!');
                          }).catch(() => {
                            alert('링크 복사에 실패했습니다.');
                          });
                        }}
                        title="링크 복사"
                        style={{
                          padding: '12px',
                          backgroundColor: 'transparent',
                          border: 'none',
                          borderLeft: '1px solid #e5e7eb',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease',
                          color: '#6b7280'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = '#f1f5f9';
                          e.target.style.color = '#10b981';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = 'transparent';
                          e.target.style.color = '#6b7280';
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                      </button>
                    </div>

                    <p style={{
                      fontSize: '12px',
                      color: '#6b7280',
                      margin: '4px 0 0 0',
                      fontFamily: 'SUIT'
                    }}>
                      이 링크를 고객에게 전달하면 동의서 작성이 가능합니다
                    </p>

                    </div>

                  {/* 동의서 응답 현황 */}
                  <div style={{
                    paddingTop: '16px',
                    borderTop: '1px solid #e5e7eb'
                  }}>
                    {consentResponses.length > 0 ? (
                      // 답변이 있을 때 - 바로 내용 표시
                      <div style={{
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '16px'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '12px'
                        }}>
                          <div style={{
                            width: '16px',
                            height: '16px',
                            backgroundColor: '#10b981',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <svg width="10" height="10" fill="white" viewBox="0 0 24 24">
                              <path d="M20.285 2l-11.285 11.567-5.286-5.011-3.714 3.716 9 8.728 15-15.285z"/>
                            </svg>
                          </div>
                          <span style={{
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#10b981',
                            fontFamily: 'SUIT'
                          }}>
                            동의서 응답 완료
                          </span>
                        </div>
                        {(() => {
                          const response = consentResponses[0]; // 첫 번째(유일한) 응답
                          return (
                            <div style={{ fontSize: '13px', color: '#475569', fontFamily: 'SUIT' }}>
                              <div style={{ marginBottom: '8px' }}>
                                <strong>응답자:</strong> {response.respondent_name} ({response.respondent_position})
                              </div>
                              <div style={{ marginBottom: '8px' }}>
                                <strong>연락처:</strong> {response.respondent_phone}
                              </div>
                              <div style={{ marginBottom: '8px' }}>
                                <strong>희망 설치일:</strong> {response.remote_install_date || '미정'}
                              </div>
                              <div style={{ marginBottom: '8px' }}>
                                <strong>희망 설치시간:</strong> {response.remote_install_time || '미정'}
                              </div>
                              <div style={{ marginBottom: '8px' }}>
                                <strong>테이블 수:</strong> {response.table_count || '미정'}개
                              </div>
                              <div style={{ marginBottom: '8px' }}>
                                <strong>스티커 타입:</strong> {response.sticker_type || '미정'}
                              </div>
                              <div style={{ marginBottom: '8px' }}>
                                <strong>디자인 타입:</strong> {response.design_type || '미정'}
                              </div>
                              <div style={{ marginBottom: '8px' }}>
                                <strong>선호 색상:</strong> {response.preferred_color || '미정'}
                              </div>
                              {response.note && (
                                <div style={{ marginBottom: '8px' }}>
                                  <strong>추가 사항:</strong> {response.note}
                                </div>
                              )}
                              <div style={{ 
                                fontSize: '12px', 
                                color: '#64748b',
                                marginTop: '12px',
                                paddingTop: '8px',
                                borderTop: '1px solid #e2e8f0'
                              }}>
                                제출일: {formatSafeDate(response.created_at)}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      // 답변이 없을 때
                      <div style={{
                        textAlign: 'center',
                        padding: '24px',
                        color: '#9ca3af',
                        backgroundColor: '#fafafa',
                        borderRadius: '8px',
                        border: '1px dashed #d1d5db'
                      }}>
                        <div style={{
                          fontSize: '32px',
                          marginBottom: '8px'
                        }}>⏳</div>
                        <p style={{
                          margin: '0 0 4px 0',
                          fontSize: '14px',
                          fontFamily: 'SUIT',
                          color: '#6b7280'
                        }}>
                          아직 응답이 없습니다
                        </p>
                        <p style={{
                          margin: 0,
                          fontSize: '12px',
                          color: '#9ca3af',
                          fontFamily: 'SUIT'
                        }}>
                          고객이 동의서를 제출하면 여기에 표시됩니다
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
          </div>
        </div>
      </div>


      {/* 동의서 응답 모달 */}
      {showConsentModal && (
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
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#1f2937',
                margin: 0,
                fontFamily: 'SUIT'
              }}>
                제출된 동의서 ({consentResponses.length}건)
              </h3>
              <button
                onClick={() => setShowConsentModal(false)}
                style={{
                  padding: '8px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  fontSize: '16px'
                }}
              >
                ✕
              </button>
            </div>

            {consentLoading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  border: '3px solid #f3f4f6',
                  borderTopColor: '#f97316',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 16px'
                }}></div>
                <p style={{ color: '#6b7280', margin: 0, fontFamily: 'SUIT' }}>응답을 불러오는 중...</p>
              </div>
            ) : consentResponses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <p style={{ color: '#6b7280', margin: 0, fontFamily: 'SUIT' }}>아직 제출된 응답이 없습니다.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {consentResponses.map((response, index) => (
                  <div key={response.response_id || index} style={{
                    padding: '16px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    backgroundColor: '#f8fafc'
                  }}>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '12px',
                      marginBottom: '12px'
                    }}>
                      <div>
                        <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500', fontFamily: 'SUIT' }}>응답자</span>
                        <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#1f2937', fontFamily: 'SUIT' }}>{response.respondent_name}</p>
                      </div>
                      <div>
                        <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500', fontFamily: 'SUIT' }}>연락처</span>
                        <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#1f2937', fontFamily: 'SUIT, monospace' }}>{response.respondent_phone}</p>
                      </div>
                      <div>
                        <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500', fontFamily: 'SUIT' }}>직책</span>
                        <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#1f2937', fontFamily: 'SUIT' }}>{response.respondent_position}</p>
                      </div>
                      <div>
                        <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500', fontFamily: 'SUIT' }}>동의</span>
                        <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: response.agreement ? '#10b981' : '#ef4444', fontFamily: 'SUIT' }}>
                          {response.agreement ? '✅ 예' : '❌ 아니오'}
                        </p>
                      </div>
                      <div>
                        <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500', fontFamily: 'SUIT' }}>설치예정일</span>
                        <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#1f2937', fontFamily: 'SUIT' }}>{response.desired_install_date}</p>
                      </div>
                      <div>
                        <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500', fontFamily: 'SUIT' }}>제출일</span>
                        <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#1f2937', fontFamily: 'SUIT' }}>
                          {formatSafeDate(response.created_at, { includeTime: false })}
                        </p>
                      </div>
                    </div>
                    {response.note && (
                      <div style={{ paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
                        <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500', fontFamily: 'SUIT' }}>비고</span>
                        <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#1f2937', fontFamily: 'SUIT' }}>{response.note}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

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
                  onChange={(e) => {
                    const formattedValue = formatPhoneInput(e.target.value, contactFormData.phone);
                    setContactFormData(prev => ({ ...prev, phone: formattedValue }));
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'SUIT, monospace'
                  }}
                  placeholder="010-0000-0000"
                  maxLength={13}
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
              
              {/* 참고사항 (선택) */}
              <div>
                <label style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#6b7280',
                  display: 'block',
                  marginBottom: '6px'
                }}>
                  참고사항
                </label>
                <input
                  type="text"
                  value={contactFormData.note}
                  onChange={(e) => setContactFormData(prev => ({ ...prev, note: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'SUIT'
                  }}
                  placeholder="기타 참고사항"
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

      {/* 성공 모달 */}
      {showSuccessModal && (
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
            padding: '32px',
            width: '400px',
            maxWidth: '90vw',
            textAlign: 'center'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              backgroundColor: '#10b981',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px'
            }}>
              <svg width="32" height="32" fill="white" viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            
            <h3 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#1f2937',
              margin: '0 0 12px 0',
              fontFamily: 'SUIT'
            }}>
              저장 완료
            </h3>
            
            <p style={{
              fontSize: '16px',
              color: '#6b7280',
              margin: '0 0 24px 0',
              fontFamily: 'SUIT'
            }}>
              {successMessage}
            </p>
            
            <button
              onClick={() => setShowSuccessModal(false)}
              style={{
                padding: '12px 24px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                fontFamily: 'SUIT'
              }}
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* Toast 알림 */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

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