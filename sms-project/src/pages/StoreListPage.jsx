/**
 * 매장 목록 페이지 - 대시보드 스타일 적용
 */
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useStores } from '../hooks/useStores.js';
import { apiClient } from '../api/client.js';
import MainLayout from '../components/Layout/MainLayout.jsx';
import StoreFilterPanel from '../components/Store/StoreFilterPanel.jsx';
import StoreTable from '../components/Store/StoreTable.jsx';
import { formatPhoneInput, getStatusLabel } from '../utils/formatter.js';
import { STORE_STATUS, POS_LABELS } from '../utils/constants.js';

const StoreListPage = () => {
  const navigate = useNavigate();
  const { logout, user, isAdmin } = useAuth();
  
  
  // isAdmin을 boolean 값으로 계산
  const userIsAdmin = isAdmin();
  const { stores = [], loading, error, fetchStores, createStore: createStoreFromHook } = useStores();
  
  
  // 필터 상태
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [dateType, setDateType] = useState('created_at'); // 'created_at' or 'updated_at'
  const [viewMode, setViewMode] = useState('table');
  const [ownerFilter, setOwnerFilter] = useState('all'); // 담당자 필터 추가
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // 모달 상태
  const [showAddStoreModal, setShowAddStoreModal] = useState(false);
  const [showExcelUploadModal, setShowExcelUploadModal] = useState(false);
  
  // 담당자 목록
  const [managers, setManagers] = useState([]);
  
  // CSV 업로드 상태
  const [uploadStatus, setUploadStatus] = useState('idle'); // 'idle', 'uploading', 'success', 'error'
  const [uploadResults, setUploadResults] = useState({
    total: 0,
    success: 0,
    failed: 0,
    errors: []
  });
  const [selectedFile, setSelectedFile] = useState(null);
  
  // 매장 추가 폼 상태
  const [newStore, setNewStore] = useState({
    seq: '',
    name: '',
    phone: '',
    managerId: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 담당자 목록 가져오기
  const fetchManagers = async () => {
    try {
      const response = await apiClient.get('/api/managers');
      
      if (response.success) {
        // 다양한 응답 구조에 대응
        let managersData = [];
        
        if (response.data?.managers) {
          managersData = response.data.managers;
        } else if (Array.isArray(response.data)) {
          managersData = response.data;
        } else if (response.data?.data?.managers) {
          managersData = response.data.data.managers;
        }
        
        // 이메일이 있는 담당자만 필터링
        const managersWithEmail = managersData.filter(manager => 
          manager && manager.email && manager.email.trim() && manager.name && manager.name.trim()
        );
        
        setManagers(managersWithEmail);
      } else {
        console.error('담당자 API 호출 실패:', response.error);
      }
    } catch (error) {
      console.error('담당자 목록 가져오기 실패:', error);
    }
  };

  useEffect(() => {
    fetchStores();
    fetchManagers();
  }, []);

  const handleRefresh = useCallback(async () => {
    await fetchStores();
  }, [fetchStores]);

  const handleLogout = useCallback(async () => {
    await logout();
    navigate('/');
  }, [logout, navigate]);

  // 내보내기 기능
  const handleExport = () => {
    // CSV 헤더
    const headers = [
      'Seq', '매장명', '주소', '전화번호', '대표자명', 
      'POS', '담당자', '상태', '등록일', '수정일'
    ];
    
    // CSV 데이터
    const csvData = filteredStores.map(store => {
      const manager = managers.find(m => m.email === store.owner_id);
      const managerName = manager?.name || store.owner_id || '미배정';
      
      return [
        store.seq || store.store_id || '',
        store.store_name || '',
        store.store_address || '',
        store.store_phone || '',
        store.owner_name || '',
        POS_LABELS[store.pos_system] || store.pos_system || '',
        managerName,
        getStatusLabel(store.status),
        store.created_at ? new Date(store.created_at).toISOString().split('T')[0] : '',
        store.updated_at ? new Date(store.updated_at).toISOString().split('T')[0] : ''
      ];
    });
    
    // CSV 문자열 생성
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => 
        row.map(cell => {
          // 쉼표나 줄바꿈이 있으면 따옴표로 감싸기
          if (cell && (cell.includes(',') || cell.includes('\n'))) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        }).join(',')
      )
    ].join('\n');
    
    // BOM 추가 (한글 깨짐 방지)
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // 다운로드
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const now = new Date();
    const fileName = `매장목록_${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 필터링된 매장 목록
  const filteredStores = useMemo(() => {
    if (!stores) return [];
    
    // 필터링
    const filtered = stores.filter(store => {
      const matchesSearch = !searchTerm || 
        store.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        store.store_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        store.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        store.store_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        store.phone?.includes(searchTerm) ||
        store.store_phone?.includes(searchTerm) ||
        store.owner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        store.pos_system?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // 상태 필터 매핑 (새 상태값과 이전 상태값 모두 처리)
      const statusMapping = {
        'PRE_INTRODUCTION': ['PRE_INTRODUCTION', 'CONTACT_PENDING'],
        'VISIT_COMPLETED': ['VISIT_COMPLETED', 'INTRODUCTION_COMPLETED', 'CONTACT_COMPLETED'],
        'REVISIT_SCHEDULED': ['REVISIT_SCHEDULED', 'IN_PROGRESS', 'UNDER_REVIEW'],
        'INFO_REQUEST': ['INFO_REQUEST', 'PROPOSAL_SENT'],
        'REMOTE_INSTALL_SCHEDULED': ['REMOTE_INSTALL_SCHEDULED', 'ADOPTION_CONFIRMED'],
        'ADMIN_SETTING': ['ADMIN_SETTING', 'SIGNUP_COMPLETED'],
        'QR_LINKING': ['QR_LINKING', 'INSTALLATION_PENDING', 'INSTALLATION_COMPLETED', 'SERVICE_ACTIVE'],
        'QR_MENU_ONLY': ['QR_MENU_ONLY'],
        'DEFECT_REPAIR': ['DEFECT_REPAIR'],
        'QR_MENU_INSTALL': ['QR_MENU_INSTALL'],
        'SERVICE_TERMINATED': ['SERVICE_TERMINATED', 'CANCELLED', 'REJECTED'],
        'UNUSED_TERMINATED': ['UNUSED_TERMINATED', 'OUT_OF_BUSINESS'],
        'PENDING': ['PENDING', 'PAUSED', 'NO_RESPONSE']
      };
      
      const matchesStatus = statusFilter === 'all' || 
        (statusMapping[statusFilter] ? statusMapping[statusFilter].includes(store.status) : store.status === statusFilter);
      
      // 담당자 필터 추가
      const matchesOwner = ownerFilter === 'all' || 
        (ownerFilter === 'unassigned' ? !store.owner_id && !store.owner_name : 
          (store.owner_id === ownerFilter || 
           // owner_name으로도 매칭 (이메일이 아닌 경우 대비)
           (managers && managers.find(m => m.email === ownerFilter)?.name === store.owner_name)));
      
      // 날짜 필터 추가
      let matchesDate = true;
      if (dateFilter !== 'all') {
        // dateType에 따라 created_at 또는 updated_at 사용
        const dateField = dateType === 'created_at' ? store.created_at : store.updated_at;
        if (!dateField) return false;
        
        const storeDate = new Date(dateField);
        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        
        switch (dateFilter) {
          case 'today':
            matchesDate = storeDate >= todayStart;
            break;
          case 'week':
            const weekStart = new Date(todayStart);
            weekStart.setDate(weekStart.getDate() - 7);
            matchesDate = storeDate >= weekStart;
            break;
          case 'month':
            const monthStart = new Date(todayStart);
            monthStart.setMonth(monthStart.getMonth() - 1);
            matchesDate = storeDate >= monthStart;
            break;
        }
      }
      
      return matchesSearch && matchesStatus && matchesDate && matchesOwner;
    });
    
    // 상태 priority로 정렬
    const getStatusPriority = (status) => {
      // 레거시 상태값을 현재 상태값으로 매핑
      const legacyMapping = {
        'INTRODUCTION_COMPLETED': 'VISIT_COMPLETED',
        'IN_PROGRESS': 'REVISIT_SCHEDULED',
        'ADOPTION_CONFIRMED': 'REMOTE_INSTALL_SCHEDULED',
        'SIGNUP_COMPLETED': 'ADMIN_SETTING',
        'INSTALLATION_PENDING': 'QR_LINKING',
        'INSTALLATION_COMPLETED': 'QR_MENU_INSTALL',
        'REJECTED': 'SERVICE_TERMINATED',
        'NO_RESPONSE': 'PENDING',
        'OUT_OF_BUSINESS': 'UNUSED_TERMINATED',
        'CONTACT_PENDING': 'PRE_INTRODUCTION',
        'CONTACT_COMPLETED': 'VISIT_COMPLETED',
        'PROPOSAL_SENT': 'INFO_REQUEST',
        'UNDER_REVIEW': 'REVISIT_SCHEDULED',
        'SERVICE_ACTIVE': 'QR_LINKING',
        'PAUSED': 'PENDING',
        'CANCELLED': 'SERVICE_TERMINATED'
      };
      
      const mappedStatus = legacyMapping[status] || status;
      return STORE_STATUS[mappedStatus]?.priority || 999;
    };
    
    return filtered.sort((a, b) => {
      return getStatusPriority(a.status) - getStatusPriority(b.status);
    });
  }, [stores, searchTerm, statusFilter, dateFilter, dateType, ownerFilter, managers]);

  // 페이지네이션
  const totalPages = Math.ceil(filteredStores.length / itemsPerPage);
  const paginatedStores = filteredStores.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // 통계 계산 - stores가 변경될 때만 재계산
  const stats = useMemo(() => ({
    total: stores.length,
    preIntroduction: stores.filter(s => s.status === 'PRE_INTRODUCTION').length,
    visitCompleted: stores.filter(s => s.status === 'VISIT_COMPLETED').length,
    remoteInstallScheduled: stores.filter(s => s.status === 'REMOTE_INSTALL_SCHEDULED').length,
    adminSetting: stores.filter(s => s.status === 'ADMIN_SETTING').length
  }), [stores]);

  const handleAddStore = useCallback(async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      const result = await createStoreFromHook(newStore);
      
      if (result) {
        setNewStore({ seq: '', name: '', phone: '', managerId: '' });
        setShowAddStoreModal(false);
        fetchStores();
      } else {
        alert('매장 생성에 실패했습니다.');
      }
    } catch (err) {
      console.error('매장 생성 실패:', err);
      alert('매장 생성에 실패했습니다: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, createStoreFromHook, newStore, fetchStores]);

  // CSV 파일 파싱
  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];
    
    // 헤더 제거 (첫 번째 줄)
    const dataLines = lines.slice(1);
    
    return dataLines.map((line, index) => {
      const columns = line.split(',').map(col => col.trim().replace(/"/g, ''));
      
      if (columns.length < 3) {
        throw new Error(`${index + 2}번째 줄: 필수 컬럼이 부족합니다. (Seq, 매장명, 전화번호 필수)`);
      }

      // Seq 검증
      if (!columns[0]) {
        throw new Error(`${index + 2}번째 줄: Seq(매장 고유번호)는 필수입니다.`);
      }

      // 매장명 검증
      if (!columns[1]) {
        throw new Error(`${index + 2}번째 줄: 매장명은 필수입니다.`);
      }

      // 전화번호 검증
      if (!columns[2]) {
        throw new Error(`${index + 2}번째 줄: 전화번호는 필수입니다.`);
      }
      
      return {
        seq: columns[0],        // 매장 고유번호 (필수)
        name: columns[1],       // 매장명 (필수)
        phone: columns[2],      // 전화번호 (필수)
        managerId: columns[3] || '' // 담당자 이메일 (선택)
      };
    });
  };

  // 개별 매장 생성
  const createSingleStore = async (storeData) => {
    try {
      // createStoreFromHook 함수 사용
      const result = await createStoreFromHook(storeData);
      
      if (result) {
        return { success: true, store: result };
      } else {
        return { success: false, store: storeData, error: '매장 생성 실패 - 결과 없음' };
      }
    } catch (error) {
      console.error('매장 생성 실패:', error.message, storeData);
      return { success: false, store: storeData, error: error.message };
    }
  };

  // CSV 일괄 업로드 처리
  const handleCSVUpload = async () => {
    if (!selectedFile) {
      alert('파일을 선택해주세요.');
      return;
    }

    setUploadStatus('uploading');
    setUploadResults({ total: 0, success: 0, failed: 0, errors: [] });

    try {
      const text = await selectedFile.text();
      const stores = parseCSV(text);
      
      
      if (stores.length === 0) {
        throw new Error('업로드할 매장 데이터가 없습니다.');
      }

      // 전체 매장 수 설정
      setUploadResults(prev => ({ ...prev, total: stores.length }));

      const results = [];
      const errors = [];

      // 순차적으로 매장 생성
      for (let i = 0; i < stores.length; i++) {
        const result = await createSingleStore(stores[i]);
        results.push(result);
        
        if (result.success) {
          setUploadResults(prev => ({ ...prev, success: prev.success + 1 }));
        } else {
          setUploadResults(prev => ({ ...prev, failed: prev.failed + 1 }));
          errors.push(`${i + 1}번째 매장 [${stores[i].seq}] ${stores[i].name}: ${result.error}`);
        }

        // 진행률 표시를 위한 잠시 대기
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // 최종 결과 업데이트
      setUploadResults(prev => ({ ...prev, errors }));
      
      if (errors.length === 0) {
        setUploadStatus('success');
      } else {
        setUploadStatus('error');
      }

      // 매장 목록 새로고침
      await fetchStores();

    } catch (error) {
      console.error('CSV 업로드 실패:', error);
      setUploadStatus('error');
      setUploadResults(prev => ({ 
        ...prev, 
        errors: [error.message] 
      }));
    }
  };

  // 업로드 모달 리셋
  const resetUploadModal = () => {
    setShowExcelUploadModal(false);
    setUploadStatus('idle');
    setUploadResults({ total: 0, success: 0, failed: 0, errors: [] });
    setSelectedFile(null);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafafa' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '32px', 
            height: '32px', 
            border: '2px solid #f97316', 
            borderTop: '2px solid transparent', 
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
          <p style={{ marginTop: '16px', fontSize: '14px', color: '#6b7280' }}>데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafafa' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 8px 0' }}>오류가 발생했습니다</h3>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>{error}</p>
          <button
            onClick={handleRefresh}
            style={{
              padding: '12px 24px',
              backgroundColor: '#f97316',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <MainLayout>

      <div>

        {/* 필터 패널 */}
        <StoreFilterPanel
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          dateType={dateType}
          setDateType={setDateType}
          viewMode={viewMode}
          setViewMode={setViewMode}
          ownerFilter={ownerFilter}
          setOwnerFilter={setOwnerFilter}
          managers={managers}
          isAdmin={userIsAdmin}
          onAddStore={() => {
            setShowAddStoreModal(true);
            fetchManagers(); // 모달 열 때 담당자 목록 새로고침
          }}
          onBulkUpload={() => setShowExcelUploadModal(true)}
          onExport={() => {/* Export functionality to be implemented */}}
        />

        {/* 매장 목록 */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid #e5e7eb'
        }}
        className="md:p-6 p-4"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              color: '#111827',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            className="text-base md:text-lg"
            >
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
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <span className="hidden md:inline">매장 목록 ({filteredStores.length}개)</span>
              <span className="md:hidden">목록 ({filteredStores.length})</span>
            </h3>
            
            {/* ADMIN 버튼들 */}
            {userIsAdmin && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleExport}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'white';
                  }}
                >
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                  </svg>
                  내보내기
                </button>
                
                <button
                  onClick={() => setShowExcelUploadModal(true)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'white';
                  }}
                >
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                  </svg>
                  일괄 업로드
                </button>
                
                <button
                  onClick={() => {
                    setShowAddStoreModal(true);
                    fetchManagers();
                  }}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#FF3D00',
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
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#e53e00';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#FF3D00';
                  }}
                >
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                  </svg>
                  매장 추가
                </button>
              </div>
            )}
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden">
            {paginatedStores.map((store, index) => {
              const manager = managers.find(m => m.email === store.owner_id);
              const managerName = manager?.name || store.owner_id || '미배정';
              
              const statusConfig = {
                'PRE_INTRODUCTION': { label: '방문대기', color: '#6b7280' },
                'VISIT_COMPLETED': { label: '방문완료', color: '#2563eb' },
                'REVISIT_SCHEDULED': { label: '재방문예정', color: '#eab308' },
                'INFO_REQUEST': { label: '추가정보요청', color: '#9333ea' },
                'REMOTE_INSTALL_SCHEDULED': { label: '에이전트설치예정', color: '#16a34a' },
                'ADMIN_SETTING': { label: '어드민셋팅', color: '#10b981' },
                'QR_LINKING': { label: 'POS연동예정', color: '#16a34a' },
                'QR_MENU_ONLY': { label: 'QR메뉴만 사용', color: '#06b6d4' },
                'DEFECT_REPAIR': { label: '하자보수중', color: '#6366f1' },
                'QR_MENU_INSTALL': { label: '최종설치완료', color: '#14b8a6' },
                'SERVICE_TERMINATED': { label: '서비스해지', color: '#dc2626' },
                'UNUSED_TERMINATED': { label: '미이용해지', color: '#dc2626' },
                'PENDING': { label: '보류', color: '#f97316' }
              };
              
              const status = statusConfig[store.status] || { label: getStatusLabel(store.status), color: '#6b7280' };
              
              return (
                <div
                  key={store.store_id || index}
                  onClick={() => navigate(`/stores/${store.store_id}`)}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '12px',
                    border: '1px solid #e5e7eb',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  className="shadow-sm hover:shadow-md"
                >
                  {/* Card Header */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '12px'
                  }}>
                    <div style={{ flex: 1 }}>
                      <span style={{
                        fontWeight: '600',
                        fontSize: '16px',
                        color: '#111827',
                        display: 'block',
                        marginBottom: '4px'
                      }}>
                        {store.store_name}
                      </span>
                      <span style={{
                        fontSize: '12px',
                        color: '#6b7280',
                        fontFamily: 'monospace'
                      }}>
                        {store.seq || store.store_id}
                      </span>
                    </div>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      fontSize: '11px',
                      fontWeight: '600',
                      color: 'white',
                      backgroundColor: status.color,
                      whiteSpace: 'nowrap'
                    }}>
                      {status.label}
                    </span>
                  </div>
                  
                  {/* Card Body */}
                  <div style={{
                    fontSize: '13px',
                    color: '#374151',
                    lineHeight: '1.6'
                  }}>
                    {store.store_address && (
                      <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                        <span style={{ fontSize: '14px' }}>📍</span>
                        <span style={{ flex: 1, color: '#6b7280' }}>{store.store_address}</span>
                      </div>
                    )}
                    <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '14px' }}>📞</span>
                      <span>{store.store_phone || '연락처 없음'}</span>
                    </div>
                    <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '14px' }}>👤</span>
                      <span>{managerName}</span>
                    </div>
                    {store.pos_system && (
                      <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '14px' }}>💳</span>
                        <span>{POS_LABELS[store.pos_system] || store.pos_system}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '14px' }}>📅</span>
                      <span style={{ color: '#6b7280', fontSize: '12px' }}>
                        {store.created_at ? new Date(store.created_at).toLocaleDateString('ko-KR') : '날짜 없음'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Card Footer - View Detail Button */}
                  <div style={{
                    marginTop: '12px',
                    paddingTop: '12px',
                    borderTop: '1px solid #f3f4f6'
                  }}>
                    <button
                      style={{
                        width: '100%',
                        padding: '8px',
                        backgroundColor: '#f9fafb',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: '500',
                        color: '#374151',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                    >
                      상세 보기 →
                    </button>
                  </div>
                </div>
              );
            })}
            
            {/* Mobile Pagination */}
            {totalPages > 1 && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
                marginTop: '20px',
                paddingBottom: '20px'
              }}>
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: currentPage === 1 ? '#e5e7eb' : 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: currentPage === 1 ? '#9ca3af' : '#374151',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  이전
                </button>
                <span style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: currentPage === totalPages ? '#e5e7eb' : 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: currentPage === totalPages ? '#9ca3af' : '#374151',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                  }}
                >
                  다음
                </button>
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block">
            <StoreTable
              stores={paginatedStores}
              loading={loading}
              pagination={{
                current: currentPage,
                total: totalPages,
                pageSize: itemsPerPage,
                totalItems: filteredStores.length,
                onPageChange: setCurrentPage
              }}
              isAdmin={userIsAdmin}
              managers={managers}
            />
          </div>
          
          {paginatedStores.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ 
                width: '48px', 
                height: '48px', 
                backgroundColor: '#f3f4f6', 
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <svg width="24" height="24" fill="#9ca3af" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <h3 style={{ 
                fontSize: '16px', 
                fontWeight: '500', 
                color: '#111827',
                margin: '0 0 8px 0'
              }}>
                {searchTerm || statusFilter !== 'all' 
                  ? '검색 결과가 없습니다' 
                  : '등록된 매장이 없습니다'
                }
              </h3>
              <p style={{ 
                fontSize: '14px', 
                color: '#6b7280',
                marginBottom: '16px'
              }}>
                {searchTerm || statusFilter !== 'all' 
                  ? '다른 검색어를 시도해보세요'
                  : '새로운 매장을 추가해보세요'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 매장 추가 모달 - 토스 스타일 */}
      {showAddStoreModal && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: '20px',
            backdropFilter: 'blur(4px)'
          }}
          onClick={() => setShowAddStoreModal(false)}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '20px',
              padding: '32px',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 닫기 버튼 */}
            <button
              onClick={() => setShowAddStoreModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: '#f3f4f6',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#e5e7eb'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#f3f4f6'}
            >
              <svg width="16" height="16" fill="#6b7280" viewBox="0 0 24 24">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>

            {/* 헤더 */}
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                backgroundColor: '#f97316',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                boxShadow: '0 4px 6px -1px rgba(249, 115, 22, 0.3)'
              }}>
                <svg width="32" height="32" fill="white" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <h3 style={{
                fontSize: '22px',
                fontWeight: '700',
                color: '#111827',
                margin: '0 0 8px 0'
              }}>
                새로운 매장 등록
              </h3>
              <p style={{
                fontSize: '15px',
                color: '#6b7280',
                margin: 0,
                lineHeight: '1.4'
              }}>
                매장 정보를 입력하여 새로운 매장을 등록하세요
              </p>
            </div>
            
            <form onSubmit={handleAddStore}>
              {/* Seq 입력 */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '15px', 
                  fontWeight: '600', 
                  color: '#1e293b', 
                  marginBottom: '8px' 
                }}>
                  매장 고유번호 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={newStore.seq}
                  onChange={(e) => setNewStore({ ...newStore, seq: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    fontSize: '15px',
                    outline: 'none',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    backgroundColor: '#fafbfc'
                  }}
                  placeholder="예: STORE001"
                  required
                  onFocus={(e) => {
                    e.target.style.borderColor = '#f97316';
                    e.target.style.boxShadow = '0 0 0 3px rgba(249, 115, 22, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
              
              {/* 매장명 입력 */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '15px', 
                  fontWeight: '600', 
                  color: '#1e293b', 
                  marginBottom: '8px' 
                }}>
                  매장명 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={newStore.name}
                  onChange={(e) => setNewStore({ ...newStore, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    fontSize: '15px',
                    outline: 'none',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    backgroundColor: '#fafbfc'
                  }}
                  placeholder="예: 홍길동 치킨집"
                  required
                  onFocus={(e) => {
                    e.target.style.borderColor = '#f97316';
                    e.target.style.boxShadow = '0 0 0 3px rgba(249, 115, 22, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
              
              {/* 전화번호 입력 */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '15px', 
                  fontWeight: '600', 
                  color: '#1e293b', 
                  marginBottom: '8px' 
                }}>
                  전화번호 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="tel"
                  value={newStore.phone}
                  onChange={(e) => {
                    const formattedValue = formatPhoneInput(e.target.value, newStore.phone);
                    setNewStore({ ...newStore, phone: formattedValue });
                  }}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    fontSize: '15px',
                    outline: 'none',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    backgroundColor: '#fafbfc'
                  }}
                  placeholder="010-0000-0000"
                  maxLength={13}
                  required
                  onFocus={(e) => {
                    e.target.style.borderColor = '#f97316';
                    e.target.style.boxShadow = '0 0 0 3px rgba(249, 115, 22, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
              
              {/* 담당자 선택 */}
              <div style={{ marginBottom: '32px' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '15px', 
                  fontWeight: '600', 
                  color: '#1e293b', 
                  marginBottom: '8px' 
                }}>
                  담당자
                </label>
                <select
                  value={newStore.managerId}
                  onChange={(e) => {
                    setNewStore({ ...newStore, managerId: e.target.value });
                  }}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    fontSize: '15px',
                    outline: 'none',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    backgroundColor: '#fafbfc',
                    cursor: 'pointer'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#f97316';
                    e.target.style.boxShadow = '0 0 0 3px rgba(249, 115, 22, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  <option value="">담당자를 선택하세요</option>
                  {managers.map((manager, index) => (
                    <option key={manager.id || manager.email || index} value={manager.email}>
                      {manager.name} ({manager.email})
                    </option>
                  ))}
                </select>
                <div style={{
                  fontSize: '13px',
                  color: '#64748b',
                  marginTop: '6px'
                }}>
                  {managers.length === 0 ? (
                    <p style={{ fontStyle: 'italic', margin: 0 }}>
                      등록된 담당자가 없습니다.
                    </p>
                  ) : (
                    <p style={{ margin: 0 }}>
                      {managers.length}명의 담당자가 있습니다.
                    </p>
                  )}
                </div>
              </div>

              {/* 액션 버튼 */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddStoreModal(false)}
                  style={{
                    flex: 1,
                    padding: '14px 20px',
                    backgroundColor: '#f8fafc',
                    color: '#475569',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#f1f5f9'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#f8fafc'}
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    flex: 1,
                    padding: '14px 20px',
                    backgroundColor: isSubmitting ? '#fed7aa' : '#f97316',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    transition: 'background-color 0.2s',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  onMouseOver={(e) => {
                    if (!isSubmitting) e.target.style.backgroundColor = '#ea580c';
                  }}
                  onMouseOut={(e) => {
                    if (!isSubmitting) e.target.style.backgroundColor = '#f97316';
                  }}
                >
                  {isSubmitting && (
                    <div style={{ 
                      width: '16px', 
                      height: '16px', 
                      border: '2px solid #ffffff', 
                      borderTop: '2px solid transparent', 
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                  )}
                  {isSubmitting ? '매장 등록 중...' : '매장 등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 일괄 업로드 모달 - 토스 스타일 */}
      {showExcelUploadModal && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: '20px',
            backdropFilter: 'blur(4px)'
          }}
          onClick={() => setShowExcelUploadModal(false)}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '20px',
              padding: '32px',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 닫기 버튼 */}
            <button
              onClick={resetUploadModal}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: '#f3f4f6',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#e5e7eb'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#f3f4f6'}
            >
              <svg width="16" height="16" fill="#6b7280" viewBox="0 0 24 24">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>

            {/* 헤더 */}
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                backgroundColor: '#f97316',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                boxShadow: '0 4px 6px -1px rgba(249, 115, 22, 0.3)'
              }}>
                <svg width="32" height="32" fill="white" viewBox="0 0 24 24">
                  <path d="M3 16h2v2H3v-2zm4-8h2v8H7V8zm4-5h2v13h-2V3zm4 8h2v5h-2v-5zm4-3h2v8h-2V8zM3 12h2v2H3v-2z"/>
                </svg>
              </div>
              <h3 style={{
                fontSize: '22px',
                fontWeight: '700',
                color: '#111827',
                margin: '0 0 8px 0'
              }}>
                매장 데이터 CSV 일괄 업로드
              </h3>
              <p style={{
                fontSize: '15px',
                color: '#6b7280',
                margin: 0,
                lineHeight: '1.4'
              }}>
                CSV 파일로 여러 매장을 한번에 등록하세요
              </p>
            </div>

            {/* 파일 업로드 영역 */}
            {uploadStatus === 'idle' && (
              <div style={{
                border: '2px dashed #d1d5db',
                borderRadius: '16px',
                padding: '32px 24px',
                textAlign: 'center',
                marginBottom: '24px',
                transition: 'border-color 0.2s, background-color 0.2s'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  backgroundColor: '#fff7ed',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px'
                }}>
                  <svg width="24" height="24" fill="#f97316" viewBox="0 0 24 24">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
                    <polyline points="14,2 14,8 20,8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10,9 9,9 8,9"/>
                  </svg>
                </div>
                <h4 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#111827',
                  margin: '0 0 8px 0'
                }}>
                  CSV 파일을 선택하세요
                </h4>
                <p style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  margin: '0 0 16px 0'
                }}>
                  .csv 파일만 지원 (최대 10MB)
                </p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '12px',
                    fontSize: '14px',
                    backgroundColor: '#f9fafb'
                  }}
                />
                {selectedFile && (
                  <p style={{
                    fontSize: '13px',
                    color: '#f97316',
                    marginTop: '8px',
                    fontWeight: '500'
                  }}>
                    선택된 파일: {selectedFile.name}
                  </p>
                )}
              </div>
            )}

            {/* 업로드 진행 상태 */}
            {uploadStatus === 'uploading' && (
              <div style={{
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '24px',
                textAlign: 'center',
                marginBottom: '24px',
                backgroundColor: '#fff7ed'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  backgroundColor: '#f97316',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  animation: 'pulse 2s infinite'
                }}>
                  <svg width="24" height="24" fill="white" viewBox="0 0 24 24">
                    <path d="M7 14l5-5 5 5z"/>
                  </svg>
                </div>
                <h4 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#111827',
                  margin: '0 0 8px 0'
                }}>
                  매장 데이터 업로드 중...
                </h4>
                <div style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  margin: '16px 0'
                }}>
                  <p style={{ margin: '4px 0' }}>전체: {uploadResults.total}개</p>
                  <p style={{ margin: '4px 0', color: '#10b981' }}>성공: {uploadResults.success}개</p>
                  <p style={{ margin: '4px 0', color: '#ef4444' }}>실패: {uploadResults.failed}개</p>
                </div>
                
                {/* 진행률 바 */}
                <div style={{
                  width: '100%',
                  height: '8px',
                  backgroundColor: '#e5e7eb',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  marginTop: '16px'
                }}>
                  <div style={{
                    width: `${uploadResults.total > 0 ? ((uploadResults.success + uploadResults.failed) / uploadResults.total) * 100 : 0}%`,
                    height: '100%',
                    backgroundColor: '#f97316',
                    transition: 'width 0.3s ease'
                  }}></div>
                </div>
              </div>
            )}

            {/* 업로드 완료 상태 */}
            {(uploadStatus === 'success' || uploadStatus === 'error') && (
              <div style={{
                border: `1px solid ${uploadStatus === 'success' ? '#10b981' : '#ef4444'}`,
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '24px',
                backgroundColor: uploadStatus === 'success' ? '#f0fdf4' : '#fef2f2'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  backgroundColor: uploadStatus === 'success' ? '#10b981' : '#ef4444',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px'
                }}>
                  <svg width="24" height="24" fill="white" viewBox="0 0 24 24">
                    {uploadStatus === 'success' ? (
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    ) : (
                      <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                    )}
                  </svg>
                </div>
                
                <h4 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: uploadStatus === 'success' ? '#10b981' : '#ef4444',
                  margin: '0 0 16px 0',
                  textAlign: 'center'
                }}>
                  {uploadStatus === 'success' ? '업로드 완료!' : '업로드 중 오류 발생'}
                </h4>
                
                <div style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  textAlign: 'center',
                  marginBottom: '16px'
                }}>
                  <p style={{ margin: '4px 0' }}>전체: {uploadResults.total}개</p>
                  <p style={{ margin: '4px 0', color: '#10b981' }}>성공: {uploadResults.success}개</p>
                  {uploadResults.failed > 0 && (
                    <p style={{ margin: '4px 0', color: '#ef4444' }}>실패: {uploadResults.failed}개</p>
                  )}
                </div>

                {/* 오류 목록 */}
                {uploadResults.errors.length > 0 && (
                  <div style={{
                    maxHeight: '150px',
                    overflow: 'auto',
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'left'
                  }}>
                    <h5 style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#ef4444',
                      margin: '0 0 8px 0'
                    }}>
                      오류 상세:
                    </h5>
                    {uploadResults.errors.map((error, index) => (
                      <p key={index} style={{
                        fontSize: '12px',
                        color: '#6b7280',
                        margin: '4px 0',
                        lineHeight: '1.4'
                      }}>
                        • {error}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 안내사항 */}
            {uploadStatus === 'idle' && (
              <div style={{
                backgroundColor: '#f8fafc',
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '32px',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    backgroundColor: '#f97316',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px'
                  }}>
                    <svg width="12" height="12" fill="white" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                  </div>
                  <div>
                    <h5 style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#1e293b',
                      margin: '0 0 8px 0'
                    }}>
                      CSV 파일 형식 가이드
                    </h5>
                    <ul style={{
                      fontSize: '13px',
                      color: '#64748b',
                      margin: 0,
                      paddingLeft: '16px',
                      lineHeight: '1.5'
                    }}>
                      <li>첫 번째 행: Seq, 매장명, 전화번호, 담당자이메일</li>
                      <li>두 번째 행부터: 실제 매장 데이터 입력</li>
                      <li>필수 항목: Seq(매장 고유번호), 매장명, 전화번호</li>
                      <li>담당자이메일은 선택사항입니다</li>
                      <li>예시: "STORE001, 홍길동치킨, 010-1234-5678, manager@email.com"</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* 액션 버튼 */}
            <div style={{ display: 'flex', gap: '12px' }}>
              {/* 취소/닫기 버튼 */}
              <button
                type="button"
                onClick={resetUploadModal}
                style={{
                  flex: 1,
                  padding: '14px 20px',
                  backgroundColor: '#f8fafc',
                  color: '#475569',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#f1f5f9'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#f8fafc'}
              >
                {uploadStatus === 'success' || uploadStatus === 'error' ? '닫기' : '취소'}
              </button>
              
              {/* 업로드/다시시도 버튼 */}
              {uploadStatus === 'idle' && (
                <button
                  type="button"
                  onClick={handleCSVUpload}
                  disabled={!selectedFile}
                  style={{
                    flex: 1,
                    padding: '14px 20px',
                    backgroundColor: !selectedFile ? '#d1d5db' : '#f97316',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: !selectedFile ? 'not-allowed' : 'pointer',
                    transition: 'background-color 0.2s',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                  }}
                  onMouseOver={(e) => {
                    if (selectedFile) e.target.style.backgroundColor = '#ea580c';
                  }}
                  onMouseOut={(e) => {
                    if (selectedFile) e.target.style.backgroundColor = '#f97316';
                  }}
                >
                  CSV 업로드 시작
                </button>
              )}
              
              {(uploadStatus === 'success' || uploadStatus === 'error') && (
                <button
                  type="button"
                  onClick={() => {
                    setUploadStatus('idle');
                    setUploadResults({ total: 0, success: 0, failed: 0, errors: [] });
                    setSelectedFile(null);
                  }}
                  style={{
                    flex: 1,
                    padding: '14px 20px',
                    backgroundColor: '#f97316',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#ea580c'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#f97316'}
                >
                  다시 업로드
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: .5;
          }
        }
      `}</style>
    </MainLayout>
  );
};

export default StoreListPage;