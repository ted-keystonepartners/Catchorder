import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { apiClient } from '../api/client.js';
import MainLayout from '../components/Layout/MainLayout.jsx';
import { AreaChart, Area, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import ReactMarkdown from 'react-markdown';

// 상태 라벨 매핑
const STATUS_LABELS = {
  PRE_INTRODUCTION: "방문대기",
  VISIT_COMPLETED: "방문완료",
  REVISIT_SCHEDULED: "재방문예정",
  INFO_REQUEST: "추가정보요청",
  REMOTE_INSTALL_SCHEDULED: "에이전트설치예정",
  ADMIN_SETTING: "어드민셋팅",
  QR_LINKING: "POS연동예정",
  QR_MENU_ONLY: "QR메뉴만 사용",
  DEFECT_REPAIR: "하자보수중",
  QR_MENU_INSTALL: "최종설치완료",
  SERVICE_TERMINATED: "서비스해지",
  UNUSED_TERMINATED: "미이용해지",
  PENDING: "보류",
  ADOPTION_CONFIRMED: "에이전트설치예정" // 레거시 상태값
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const { logout, user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState(null);
  const [overallStats, setOverallStats] = useState(null);
  const [ownerStats, setOwnerStats] = useState([]);
  const [periodData, setPeriodData] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [managersMap, setManagersMap] = useState({});
  const [selectedInstallCategory, setSelectedInstallCategory] = useState(null);
  const [dailyUsageData, setDailyUsageData] = useState([]);
  const [usageDateRange, setUsageDateRange] = useState({
    start: '2025-12-01',
    end: new Date().toISOString().split('T')[0]
  });
  
  // Chat states
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [typingText, setTypingText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // 타이핑 애니메이션
  useEffect(() => {
    if (chatOpen && chatMessages.length === 0 && !isTyping) {
      setIsTyping(true);
      const text = '무엇을 도와드릴까요?';
      let currentIndex = 0;
      
      const typingInterval = setInterval(() => {
        if (currentIndex <= text.length) {
          setTypingText(text.slice(0, currentIndex));
          currentIndex++;
        } else {
          clearInterval(typingInterval);
          setIsTyping(false);
        }
      }, 50);
      
      return () => clearInterval(typingInterval);
    }
  }, [chatOpen, chatMessages.length]);

  // 실시간 현황 통계 가져오기
  const fetchTodayStats = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/dashboard');
      
      if (response.success && response.data) {
        // overall stats 설정
        setOverallStats(response.data.overall);
        
        // owner stats 설정 (이미 owner_name 포함됨)
        setOwnerStats(response.data.owners || []);
      }
    } catch (error) {
      console.error('대시보드 데이터 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 담당자 목록 가져오기
  const fetchManagers = async () => {
    try {
      console.log('fetchManagers 시작');
      const response = await apiClient.get('/api/managers');
      console.log('managers API 응답:', response);
      
      if (response.success) {
        const map = {};
        let managersData = [];
        
        if (response.data?.managers) {
          managersData = response.data.managers;
        } else if (Array.isArray(response.data)) {
          managersData = response.data;
        }
        
        console.log('managersData:', managersData);
        
        managersData.forEach(manager => {
          const key = manager.userId || manager.email;
          if (key && manager.name) {
            map[key] = manager.name;
          }
        });
        
        console.log('최종 managersMap:', map);
        setManagersMap(map);
      }
    } catch (error) {
      console.error('fetchManagers 에러:', error);
    }
  };

  // 일별 이용 현황 데이터 가져오기
  const fetchDailyUsage = async () => {
    try {
      const response = await apiClient.get(`/api/stats/daily-usage?start_date=${usageDateRange.start}&end_date=${usageDateRange.end}`);
      
      if (response.success && response.data?.daily_usage) {
        // 데이터가 있는 날짜만 필터링
        const filteredData = response.data.daily_usage.filter(
          item => (item.active || 0) + (item.churned || 0) + (item.never_used || 0) > 0
        );
        setDailyUsageData(filteredData);
      }
    } catch (error) {
      console.error('일별 이용 현황 가져오기 실패:', error);
    }
  };

  // 기간별 데이터 가져오기
  const fetchPeriodStats = async () => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      if (selectedPeriod === '7d') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (selectedPeriod === '30d') {
        startDate.setDate(startDate.getDate() - 30);
      } else if (selectedPeriod === '90d') {
        startDate.setDate(startDate.getDate() - 90);
      }
      
      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];
      
      const response = await apiClient.get(`/api/stats?start_date=${startStr}&end_date=${endStr}`);
      
      if (response.success && response.data) {
        // 날짜별로 그룹화
        const groupedData = response.data.reduce((acc, item) => {
          if (item.stats_type === 'overall') {
            const date = item.snapshot_date;
            if (!acc[date]) {
              acc[date] = {
                date: date,
                registered: 0,
                installed: 0,
                active: 0
              };
            }
            acc[date].registered = item.funnel?.registered || 0;
            acc[date].installed = item.funnel?.install_completed || 0;
            acc[date].active = item.funnel?.active || 0;
          }
          return acc;
        }, {});
        
        const chartData = Object.values(groupedData).sort((a, b) => 
          new Date(a.date) - new Date(b.date)
        );
        
        setPeriodData(chartData);
      }
    } catch (error) {
      console.error('기간별 통계 조회 실패:', error);
      setPeriodData([]);
    }
  };

  // AI 채팅 전송
  const sendChatMessage = async (message) => {
    if (!message.trim()) return;
    
    // 사용자 메시지 추가
    setChatMessages(prev => [...prev, { role: 'user', content: message }]);
    setChatInput('');
    setChatLoading(true);
    
    try {
      const response = await apiClient.post('/api/chat', { message });
      
      if (response.success && response.data) {
        setChatMessages(prev => [...prev, { 
          role: 'assistant', 
          content: response.data.answer || '죄송합니다. 응답을 생성할 수 없습니다.' 
        }]);
      }
    } catch (error) {
      console.error('AI 채팅 오류:', error);
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '오류가 발생했습니다. 다시 시도해주세요.' 
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  // 초기 데이터 로드 - 담당자 목록 먼저 가져온 후 통계 로드
  useEffect(() => {
    const loadData = async () => {
      await fetchManagers();  // 담당자 목록 먼저 로드
      await fetchTodayStats(); // 그 다음 통계 로드
      await fetchDailyUsage();  // 일별 이용 현황 로드
    };
    loadData();
  }, []);

  // 기간별 데이터 로드
  useEffect(() => {
    if (overallStats) {
      fetchPeriodStats();
    }
  }, [selectedPeriod, overallStats]);

  // 날짜 범위 변경 시 일별 이용 현황 재로드
  useEffect(() => {
    fetchDailyUsage();
  }, [usageDateRange]);

  // 상태별 차트 데이터 준비
  const statusChartData = useMemo(() => {
    if (!overallStats?.stats) return [];
    
    // 설치진행 관련 상태만 표시 (이 순서대로)
    const statusOrder = [
      'PRE_INTRODUCTION',      // 방문대기 (60개)
      'VISIT_COMPLETED',       // 방문완료
      'REVISIT_SCHEDULED',     // 재방문예정
      'INFO_REQUEST',          // 추가정보요청
      'REMOTE_INSTALL_SCHEDULED', // 에이전트설치예정
      'ADMIN_SETTING',         // 어드민셋팅
      'QR_LINKING',            // POS연동예정
      'QR_MENU_ONLY',          // QR메뉴만 사용
      'DEFECT_REPAIR'          // 하자보수중
    ];
    
    const result = [];
    
    // 설치진행 상태만 추가 (값이 0이어도 표시)
    statusOrder.forEach(key => {
      const value = overallStats.stats[key] || 0;
      result.push({
        name: STATUS_LABELS[key] || key,
        value: value,
        key: key
      });
    });
    
    return result;
  }, [overallStats]);
  
  // 차트 최대값 계산 (가장 큰 값 + 20)
  const chartMaxValue = useMemo(() => {
    if (!statusChartData || statusChartData.length === 0) return 100;
    const maxValue = Math.max(...statusChartData.map(item => item.value));
    return maxValue + 20;
  }, [statusChartData]);
  
  // 설치진행 현황 총합 계산
  const totalInProgress = useMemo(() => {
    if (!statusChartData || statusChartData.length === 0) return 0;
    return statusChartData.reduce((sum, item) => sum + item.value, 0);
  }, [statusChartData]);

  // 퍼널 차트 데이터
  const funnelData = useMemo(() => {
    if (!overallStats?.funnel) return [];
    
    return [
      { name: '가입', value: overallStats.funnel.registered || 0, fill: '#FF3D00' },
      { name: '설치', value: overallStats.funnel.install_completed || 0, fill: '#FF6B00' },
      { name: '이용', value: overallStats.funnel.active || 0, fill: '#FFA500' }
    ];
  }, [overallStats]);

  // 이탈 분석 데이터
  const churnData = useMemo(() => {
    if (!overallStats?.churn_analysis?.by_stage) return [];
    
    return Object.entries(overallStats.churn_analysis.by_stage)
      .map(([key, value]) => ({
        name: STATUS_LABELS[key] || key,
        value: value
      }))
      .filter(item => item.value > 0);
  }, [overallStats]);

  const COLORS = ['#FF3D00', '#FF6B00', '#FFA500', '#FFD700', '#32CD32', '#4169E1', '#9370DB', '#DC143C'];

  if (loading) {
    return (
      <MainLayout>
        <div style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              width: '32px', 
              height: '32px', 
              border: '2px solid #FF3D00', 
              borderTop: '2px solid transparent', 
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto'
            }}></div>
            <p style={{ marginTop: '16px', fontSize: '14px', color: '#6b7280' }}>
              데이터를 불러오는 중...
            </p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div style={{ position: 'relative' }}>
        {/* 메인 대시보드 영역 - 전체 너비 사용 */}
        <div>
          {/* KPI 카드 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}>
            {/* 전체 매장 */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280', margin: '0 0 8px 0' }}>
                    전체 매장
                  </p>
                  <p style={{ fontSize: '32px', fontWeight: '700', color: '#111827', margin: 0 }}>
                    {overallStats?.funnel?.registered || 0}
                  </p>
                </div>
                <div style={{
                  width: '48px',
                  height: '48px',
                  backgroundColor: '#fff5f3',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg width="24" height="24" fill="#FF3D00" viewBox="0 0 24 24">
                    <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* 설치 완료 */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280', margin: '0 0 8px 0' }}>
                    설치 완료
                  </p>
                  <p style={{ fontSize: '32px', fontWeight: '700', color: '#111827', margin: 0 }}>
                    {overallStats?.funnel?.install_completed || 0}
                  </p>
                  <p style={{ fontSize: '12px', color: '#10b981', margin: '4px 0 0 0' }}>
                    전환율 {overallStats?.conversion?.register_to_install || 0}%
                  </p>
                </div>
                <div style={{
                  width: '48px',
                  height: '48px',
                  backgroundColor: '#e0f2fe',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg width="24" height="24" fill="#0284c7" viewBox="0 0 24 24">
                    <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* 이용 매장 */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280', margin: '0 0 8px 0' }}>
                    이용 매장
                  </p>
                  <p style={{ fontSize: '32px', fontWeight: '700', color: '#111827', margin: 0 }}>
                    {overallStats?.funnel?.active || 0}
                  </p>
                  <p style={{ fontSize: '12px', color: '#10b981', margin: '4px 0 0 0' }}>
                    전환율 {overallStats?.conversion?.install_to_active || 0}%
                  </p>
                </div>
                <div style={{
                  width: '48px',
                  height: '48px',
                  backgroundColor: '#d1fae5',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg width="24" height="24" fill="#10b981" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* 주문고객수 */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280', margin: '0 0 8px 0' }}>
                    주문고객수
                  </p>
                  <p style={{ fontSize: '32px', fontWeight: '700', color: '#111827', margin: 0 }}>
                    {overallStats?.total_customer_count?.toLocaleString() || 0}
                  </p>
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>
                    총 주문 {overallStats?.total_order_count?.toLocaleString() || 0}건
                  </p>
                </div>
                <div style={{
                  width: '48px',
                  height: '48px',
                  backgroundColor: '#f3e8ff',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg width="24" height="24" fill="#7c3aed" viewBox="0 0 24 24">
                    <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* 차트 그리드 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
            {/* 퍼널 차트 */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              border: '1px solid #e5e7eb',
              height: '350px'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: '0 0 16px 0' }}>
                전환 퍼널
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={funnelData} layout="horizontal" margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, dataMax => Math.ceil(dataMax * 1.2)]} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#FF3D00" label={{ position: 'top', fill: '#374151', fontSize: 12, fontWeight: 600 }}>
                    {funnelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* 설치진행 현황 */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              border: '1px solid #e5e7eb',
              height: '350px'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                설치진행 현황
                <span style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280', backgroundColor: '#f3f4f6', padding: '2px 8px', borderRadius: '4px' }}>
                  총 {totalInProgress}개
                </span>
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={statusChartData} layout="vertical" margin={{ left: 10, right: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" domain={[0, chartMaxValue]} />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#FF6B00" label={{ position: 'right', fill: '#111827', fontSize: 12, fontWeight: 600 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 설치완료 매장 상세 */}
          {overallStats?.install_detail?.summary && (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              border: '1px solid #e5e7eb',
              marginBottom: '24px'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: '0 0 16px 0' }}>
                설치완료 매장 상세
              </h3>
              
              {/* 카테고리 카드들 */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '12px',
                marginBottom: '20px'
              }}>
                {/* 이용중 카드 */}
                <div
                  onClick={() => setSelectedInstallCategory(selectedInstallCategory === 'active' ? null : 'active')}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: selectedInstallCategory === 'active' ? '2px solid #FF3D00' : '1px solid #e5e7eb',
                    backgroundColor: selectedInstallCategory === 'active' ? '#fff5f3' : 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px 0' }}>이용중</p>
                  <p style={{ fontSize: '24px', fontWeight: '600', color: '#10b981', margin: 0 }}>
                    {(overallStats.install_detail.summary.active || 0) + (overallStats.install_detail.summary.active_not_completed || 0)}
                  </p>
                </div>

                {/* 미이용 카드 */}
                <div
                  onClick={() => setSelectedInstallCategory(selectedInstallCategory === 'inactive' ? null : 'inactive')}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: selectedInstallCategory === 'inactive' ? '2px solid #FF3D00' : '1px solid #e5e7eb',
                    backgroundColor: selectedInstallCategory === 'inactive' ? '#fff5f3' : 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px 0' }}>미이용</p>
                  <p style={{ fontSize: '24px', fontWeight: '600', color: '#f59e0b', margin: 0 }}>
                    {overallStats.install_detail.summary.inactive || 0}
                  </p>
                </div>

                {/* 해지 카드 */}
                <div
                  onClick={() => setSelectedInstallCategory(selectedInstallCategory === 'churned' ? null : 'churned')}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: selectedInstallCategory === 'churned' ? '2px solid #FF3D00' : '1px solid #e5e7eb',
                    backgroundColor: selectedInstallCategory === 'churned' ? '#fff5f3' : 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px 0' }}>해지</p>
                  <p style={{ fontSize: '24px', fontWeight: '600', color: '#ef4444', margin: 0 }}>
                    {(overallStats.install_detail.summary.churned_service || 0) + (overallStats.install_detail.summary.churned_unused || 0)}
                  </p>
                </div>

                {/* 하자보수 카드 */}
                <div
                  onClick={() => setSelectedInstallCategory(selectedInstallCategory === 'repair' ? null : 'repair')}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: selectedInstallCategory === 'repair' ? '2px solid #FF3D00' : '1px solid #e5e7eb',
                    backgroundColor: selectedInstallCategory === 'repair' ? '#fff5f3' : 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px 0' }}>하자보수</p>
                  <p style={{ fontSize: '24px', fontWeight: '600', color: '#6366f1', margin: 0 }}>
                    {overallStats.install_detail.summary.repair || 0}
                  </p>
                </div>

                {/* 보류 카드 */}
                <div
                  onClick={() => setSelectedInstallCategory(selectedInstallCategory === 'pending' ? null : 'pending')}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: selectedInstallCategory === 'pending' ? '2px solid #FF3D00' : '1px solid #e5e7eb',
                    backgroundColor: selectedInstallCategory === 'pending' ? '#fff5f3' : 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px 0' }}>보류</p>
                  <p style={{ fontSize: '24px', fontWeight: '600', color: '#64748b', margin: 0 }}>
                    {overallStats.install_detail.summary.pending || 0}
                  </p>
                </div>
              </div>

              {/* 선택된 카테고리의 매장 리스트 */}
              {selectedInstallCategory && (
                <div style={{
                  marginTop: '20px',
                  borderTop: '1px solid #e5e7eb',
                  paddingTop: '20px'
                }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <th style={{ padding: '8px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>번호</th>
                          <th style={{ padding: '8px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>매장명</th>
                          <th style={{ padding: '8px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>담당자</th>
                          <th style={{ padding: '8px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>등록일</th>
                          <th style={{ padding: '8px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>주문수</th>
                          <th style={{ padding: '8px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>주문고객수</th>
                          {(selectedInstallCategory === 'churned' || selectedInstallCategory === 'active') && (
                            <th style={{ padding: '8px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>구분</th>
                          )}
                          {(selectedInstallCategory === 'inactive' || selectedInstallCategory === 'churned' || selectedInstallCategory === 'repair' || selectedInstallCategory === 'pending') && (
                            <th style={{ padding: '8px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>주문</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          let storeList = [];
                          
                          if (selectedInstallCategory === 'churned') {
                            // 해지 카테고리: churned_service와 churned_unused 합치기
                            const serviceChurned = (overallStats.install_detail.churned_service || []).map(s => ({...s, churnType: '서비스해지'}));
                            const unusedChurned = (overallStats.install_detail.churned_unused || []).map(s => ({...s, churnType: '미이용해지'}));
                            storeList = [...serviceChurned, ...unusedChurned];
                          } else if (selectedInstallCategory === 'active') {
                            // 이용중 카테고리: active와 active_not_completed 합치기
                            const completed = (overallStats.install_detail.active || []).map(s => ({...s, installType: '설치완료'}));
                            const notCompleted = (overallStats.install_detail.active_not_completed || []).map(s => ({...s, installType: '설치중'}));
                            storeList = [...completed, ...notCompleted];
                          } else {
                            storeList = overallStats.install_detail[selectedInstallCategory] || [];
                          }
                          
                          return storeList.map((store, index) => (
                            <tr
                              key={store.store_id || index}
                              onClick={() => navigate(`/stores/${store.store_id}`)}
                              style={{
                                borderBottom: '1px solid #f3f4f6',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s'
                              }}
                              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <td style={{ padding: '12px 8px', fontSize: '13px', color: '#374151' }}>{index + 1}</td>
                              <td style={{ padding: '12px 8px', fontSize: '13px', color: '#111827', fontWeight: '500' }}>
                                {store.store_name || store.name || '-'}
                              </td>
                              <td style={{ padding: '12px 8px', fontSize: '13px', color: '#374151' }}>
                                {managersMap[store.owner_id] || store.owner_name || store.owner_id?.split('@')[0] || '-'}
                              </td>
                              <td style={{ padding: '12px 8px', fontSize: '13px', color: '#374151' }}>
                                {store.created_at ? new Date(store.created_at).toLocaleDateString('ko-KR') : '-'}
                              </td>
                              <td style={{ padding: '12px 8px', fontSize: '13px', color: '#374151', textAlign: 'center' }}>
                                {store.order_count ? store.order_count.toLocaleString() : '0'}
                              </td>
                              <td style={{ padding: '12px 8px', fontSize: '13px', color: '#374151', textAlign: 'center' }}>
                                {store.customer_count ? store.customer_count.toLocaleString() : '0'}
                              </td>
                              {(selectedInstallCategory === 'churned' || selectedInstallCategory === 'active') && (
                                <td style={{ padding: '12px 8px', fontSize: '13px' }}>
                                  <span style={{
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    fontWeight: '500',
                                    backgroundColor: store.churnType === '서비스해지' ? '#fef2f2' : store.churnType === '미이용해지' ? '#fefce8' : store.installType === '설치중' ? '#fef3c7' : '#d1fae5',
                                    color: store.churnType === '서비스해지' ? '#dc2626' : store.churnType === '미이용해지' ? '#ca8a04' : store.installType === '설치중' ? '#d97706' : '#059669'
                                  }}>
                                    {store.churnType || store.installType}
                                  </span>
                                </td>
                              )}
                              {(selectedInstallCategory === 'inactive' || selectedInstallCategory === 'churned' || selectedInstallCategory === 'repair' || selectedInstallCategory === 'pending') && (
                                <td style={{ padding: '12px 8px', fontSize: '13px' }}>
                                  {store.hasOrder && (
                                    <span style={{
                                      padding: '2px 8px',
                                      borderRadius: '4px',
                                      fontSize: '11px',
                                      fontWeight: '500',
                                      backgroundColor: '#dbeafe',
                                      color: '#1d4ed8'
                                    }}>
                                      주문있음
                                    </span>
                                  )}
                                </td>
                              )}
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 일별 이용 현황 차트 */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #e5e7eb',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: 0 }}>
                일별 이용 현황
              </h3>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="date"
                  value={usageDateRange.start}
                  onChange={(e) => setUsageDateRange(prev => ({ ...prev, start: e.target.value }))}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: '1px solid #e5e7eb',
                    fontSize: '12px'
                  }}
                />
                <span style={{ color: '#6b7280', fontSize: '12px' }}>~</span>
                <input
                  type="date"
                  value={usageDateRange.end}
                  onChange={(e) => setUsageDateRange(prev => ({ ...prev, end: e.target.value }))}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: '1px solid #e5e7eb',
                    fontSize: '12px'
                  }}
                />
              </div>
            </div>
            {dailyUsageData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={dailyUsageData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                  />
                  <YAxis 
                    domain={[0, (dataMax) => {
                      const maxValue = Math.max(...dailyUsageData.map(item => 
                        (item.active || 0) + (item.churned || 0) + (item.never_used || 0)
                      ));
                      return maxValue + 20;
                    }]}
                  />
                  <Tooltip 
                    labelFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                    }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="active" stackId="1" stroke="#10B981" fill="#10B981" name="이용매장">
                    <LabelList dataKey="active" position="center" style={{ fontSize: '11px', fill: 'white' }} />
                  </Area>
                  <Area type="monotone" dataKey="churned" stackId="1" stroke="#F59E0B" fill="#F59E0B" name="홀드매장">
                    <LabelList dataKey="churned" position="center" style={{ fontSize: '11px', fill: 'white' }} />
                  </Area>
                  <Area type="monotone" dataKey="never_used" stackId="1" stroke="#6B7280" fill="#6B7280" name="미이용매장">
                    <LabelList dataKey="never_used" position="center" style={{ fontSize: '11px', fill: 'white' }} />
                  </Area>
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ 
                height: '300px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: '#6b7280',
                fontSize: '14px'
              }}>
                아직 충분한 데이터가 없습니다
              </div>
            )}
          </div>

          {/* 담당자별 성과 테이블 */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #e5e7eb',
            marginBottom: '24px'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: '0 0 16px 0' }}>
              담당자별 성과
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
                      담당자
                    </th>
                    <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
                      등록
                    </th>
                    <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
                      설치완료
                    </th>
                    <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
                      이용매장
                    </th>
                    <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
                      등록→설치
                    </th>
                    <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
                      설치→이용
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ownerStats.map((owner, index) => {
                    // managersMap을 우선 체크, owner_name은 fallback으로만 사용
                    const ownerId = owner.owner_id || owner.stats_type?.replace('owner:', '');
                    const displayName = managersMap[ownerId] || owner.owner_name || ownerId?.split('@')[0] || '미지정';
                    return (
                      <tr key={index} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '12px', fontSize: '14px', color: '#111827' }}>
                          {displayName}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', fontSize: '14px', color: '#111827' }}>
                          {owner.funnel?.registered || 0}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', fontSize: '14px', color: '#111827' }}>
                          {owner.funnel?.install_completed || 0}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', fontSize: '14px', color: '#111827' }}>
                          {owner.funnel?.active || 0}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', fontSize: '14px' }}>
                          <span style={{ 
                            color: owner.conversion?.register_to_install > 10 ? '#10b981' : '#ef4444',
                            fontWeight: '600'
                          }}>
                            {owner.conversion?.register_to_install || 0}%
                          </span>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', fontSize: '14px' }}>
                          <span style={{ 
                            color: owner.conversion?.install_to_active > 50 ? '#10b981' : '#ef4444',
                            fontWeight: '600'
                          }}>
                            {owner.conversion?.install_to_active || 0}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 이탈 분석 */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #e5e7eb'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: '0 0 16px 0' }}>
              이탈 분석
            </h3>
            {overallStats?.churn_analysis?.total_churned > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 8px 0' }}>
                    총 이탈 매장
                  </p>
                  <p style={{ fontSize: '32px', fontWeight: '700', color: '#dc2626', margin: 0 }}>
                    {overallStats.churn_analysis.total_churned}
                  </p>
                </div>
                <div>
                  {churnData.length > 0 && (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={churnData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {churnData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px',
                color: '#6b7280',
                fontSize: '14px'
              }}>
                이탈 데이터 없음
              </div>
            )}
          </div>
        </div>

        {/* AI 채팅 모달 */}
        {chatOpen && (
          <>
            {/* 백드롭 */}
            <div
              onClick={() => setChatOpen(false)}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                zIndex: 998,
                animation: 'fadeIn 0.3s'
              }}
            />
            
            {/* 모달 */}
            <div style={{
              position: 'fixed',
              bottom: chatOpen ? '20px' : '-520px',
              right: '20px',
              width: '384px',
              height: '500px',
              background: 'white',
              borderRadius: '16px',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 999,
              animation: 'slideUp 0.3s',
              transition: 'bottom 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}>
              {/* 모달 헤더 */}
              <div style={{
                padding: '20px',
                background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                borderRadius: '16px 16px 0 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(10px)'
                  }}>
                    <svg width="20" height="20" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1v1a2 2 0 01-2 2H6a2 2 0 01-2-2v-1H3a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2z" />
                      <circle cx="9" cy="13" r="1" />
                      <circle cx="15" cy="13" r="1" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 17h8" />
                    </svg>
                  </div>
                  <div>
                    <h3 style={{ 
                      fontSize: '16px', 
                      fontWeight: '700', 
                      color: 'white',
                      margin: 0
                    }}>
                      운영 에이전트
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                      <div style={{
                        width: '6px',
                        height: '6px',
                        backgroundColor: '#4ade80',
                        borderRadius: '50%',
                        animation: 'pulse 2s infinite'
                      }}></div>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>Active</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setChatOpen(false)}
                  style={{
                    width: '32px',
                    height: '32px',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    backdropFilter: 'blur(10px)'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)' }}
                  onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)' }}
                >
                  <svg width="18" height="18" fill="white" viewBox="0 0 24 24">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </button>
              </div>

              {/* 채팅 메시지 영역 */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                {chatMessages.length === 0 ? (
                  <div style={{ 
                    display: 'flex',
                    justifyContent: 'flex-start',
                    marginTop: '8px'
                  }}>
                    <div style={{
                      padding: '10px 14px',
                      borderRadius: '12px 12px 12px 4px',
                      backgroundColor: '#f3f4f6',
                      color: '#111827',
                      fontSize: '13px',
                      display: 'inline-block'
                    }}>
                      {typingText}
                      {isTyping && (
                        <span style={{
                          display: 'inline-block',
                          width: '2px',
                          height: '14px',
                          backgroundColor: '#6b7280',
                          marginLeft: '2px',
                          animation: 'blink 1s infinite'
                        }}/>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    {chatMessages.map((message, index) => (
                      <div
                        key={index}
                        style={{
                          display: 'flex',
                          justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start'
                        }}
                      >
                        {message.role === 'assistant' && (
                          <div style={{
                            width: '28px',
                            height: '28px',
                            marginRight: '8px',
                            background: 'linear-gradient(135deg, #FF3D00 0%, #FF6B00 100%)',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <svg width="16" height="16" fill="white" viewBox="0 0 24 24">
                              <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a1.5 1.5 0 00-1.006-1.006L15.75 7.5l1.035-.259a1.5 1.5 0 001.006-1.006L18 5.25l.259 1.035a1.5 1.5 0 001.006 1.006L20.25 7.5l-1.035.259a1.5 1.5 0 00-1.006 1.006zM16.894 17.801L16.5 19.5l-.394-1.699a1.5 1.5 0 00-1.207-1.207L13.5 16.5l1.699-.394a1.5 1.5 0 001.207-1.207L16.5 13.5l.394 1.699a1.5 1.5 0 001.207 1.207L19.5 16.5l-1.699.394a1.5 1.5 0 00-1.207 1.207z"/>
                            </svg>
                          </div>
                        )}
                        <div style={{
                          maxWidth: '85%',
                          padding: message.role === 'user' ? '8px 12px' : '10px',
                          borderRadius: message.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                          backgroundColor: message.role === 'user' ? '#FF3D00' : '#f3f4f6',
                          color: message.role === 'user' ? 'white' : '#111827',
                          fontSize: '13px'
                        }}>
                          {message.role === 'assistant' ? (
                            <ReactMarkdown
                              components={{
                                p: ({ children }) => <p style={{ margin: '0 0 6px 0', fontSize: '13px', lineHeight: '1.5' }}>{children}</p>,
                                ul: ({ children }) => <ul style={{ margin: '0 0 6px 0', paddingLeft: '16px', fontSize: '13px' }}>{children}</ul>,
                                ol: ({ children }) => <ol style={{ margin: '0 0 6px 0', paddingLeft: '16px', fontSize: '13px' }}>{children}</ol>,
                                li: ({ children }) => <li style={{ margin: '2px 0' }}>{children}</li>,
                                strong: ({ children }) => <strong style={{ fontWeight: '600' }}>{children}</strong>,
                                code: ({ children }) => <code style={{ backgroundColor: '#e5e7eb', padding: '1px 3px', borderRadius: '3px', fontSize: '12px' }}>{children}</code>
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          ) : (
                            <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.5' }}>{message.content}</p>
                          )}
                        </div>
                      </div>
                    ))}
                    {chatLoading && (
                      <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
                        <div style={{
                          width: '28px',
                          height: '28px',
                          marginRight: '8px',
                          background: 'linear-gradient(135deg, #FF3D00 0%, #FF6B00 100%)',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <svg width="16" height="16" fill="white" viewBox="0 0 24 24">
                            <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a1.5 1.5 0 00-1.006-1.006L15.75 7.5l1.035-.259a1.5 1.5 0 001.006-1.006L18 5.25l.259 1.035a1.5 1.5 0 001.006 1.006L20.25 7.5l-1.035.259a1.5 1.5 0 00-1.006 1.006zM16.894 17.801L16.5 19.5l-.394-1.699a1.5 1.5 0 00-1.207-1.207L13.5 16.5l1.699-.394a1.5 1.5 0 001.207-1.207L16.5 13.5l.394 1.699a1.5 1.5 0 001.207 1.207L19.5 16.5l-1.699.394a1.5 1.5 0 00-1.207 1.207z"/>
                          </svg>
                        </div>
                        <div style={{
                          padding: '10px',
                          borderRadius: '12px 12px 12px 4px',
                          backgroundColor: '#f3f4f6',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <div style={{ display: 'flex', gap: '3px' }}>
                            <div style={{
                              width: '6px',
                              height: '6px',
                              backgroundColor: '#6b7280',
                              borderRadius: '50%',
                              animation: 'bounce 1.4s infinite ease-in-out both'
                            }}></div>
                            <div style={{
                              width: '6px',
                              height: '6px',
                              backgroundColor: '#6b7280',
                              borderRadius: '50%',
                              animation: 'bounce 1.4s infinite ease-in-out both',
                              animationDelay: '0.16s'
                            }}></div>
                            <div style={{
                              width: '6px',
                              height: '6px',
                              backgroundColor: '#6b7280',
                              borderRadius: '50%',
                              animation: 'bounce 1.4s infinite ease-in-out both',
                              animationDelay: '0.32s'
                            }}></div>
                          </div>
                          <span style={{ color: '#6b7280', fontSize: '13px' }}>분석 중</span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* 입력 영역 */}
              <div style={{
                padding: '12px',
                borderTop: '1px solid #e5e7eb',
                background: 'white',
                borderRadius: '0 0 16px 16px'
              }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendChatMessage(chatInput);
                      }
                    }}
                    placeholder="메시지를 입력하세요..."
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '13px',
                      outline: 'none',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#FF3D00';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                    }}
                  />
                  <button
                    onClick={() => sendChatMessage(chatInput)}
                    disabled={!chatInput.trim() || chatLoading}
                    style={{
                      width: '36px',
                      height: '36px',
                      backgroundColor: chatInput.trim() && !chatLoading ? '#FF3D00' : '#e5e7eb',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: chatInput.trim() && !chatLoading ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s',
                      flexShrink: 0
                    }}
                    onMouseOver={(e) => {
                      if (chatInput.trim() && !chatLoading) {
                        e.currentTarget.style.backgroundColor = '#dc2626';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (chatInput.trim() && !chatLoading) {
                        e.currentTarget.style.backgroundColor = '#FF3D00';
                      }
                    }}
                  >
                    <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* 플로팅 버튼 */}
        {!chatOpen && (
          <button
            onClick={() => setChatOpen(true)}
            style={{
              position: 'fixed',
              right: '24px',
              bottom: '24px',
              width: '56px',
              height: '56px',
              background: 'linear-gradient(135deg, #FF3D00 0%, #FF6B00 100%)',
              borderRadius: '28px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(255, 61, 0, 0.3)',
              zIndex: 997,
              transition: 'all 0.3s',
              animation: 'float 3s ease-in-out infinite'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 61, 0, 0.4)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(255, 61, 0, 0.3)';
            }}
          >
            <svg width="28" height="28" fill="white" viewBox="0 0 24 24">
              <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a1.5 1.5 0 00-1.006-1.006L15.75 7.5l1.035-.259a1.5 1.5 0 001.006-1.006L18 5.25l.259 1.035a1.5 1.5 0 001.006 1.006L20.25 7.5l-1.035.259a1.5 1.5 0 00-1.006 1.006zM16.894 17.801L16.5 19.5l-.394-1.699a1.5 1.5 0 00-1.207-1.207L13.5 16.5l1.699-.394a1.5 1.5 0 001.207-1.207L16.5 13.5l.394 1.699a1.5 1.5 0 001.207 1.207L19.5 16.5l-1.699.394a1.5 1.5 0 00-1.207 1.207z"/>
            </svg>
          </button>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes bounce {
          0%, 80%, 100% {
            transform: scale(0);
          }
          40% {
            transform: scale(1);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { 
            transform: translateY(20px);
            opacity: 0;
          }
          to { 
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
        @keyframes blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        
        /* 커스텀 스크롤바 */
        div::-webkit-scrollbar {
          width: 6px;
        }
        div::-webkit-scrollbar-track {
          background: transparent;
        }
        div::-webkit-scrollbar-thumb {
          background-color: rgba(0, 0, 0, 0.1);
          border-radius: 3px;
        }
        div::-webkit-scrollbar-thumb:hover {
          background-color: rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </MainLayout>
  );
};

export default DashboardPage;