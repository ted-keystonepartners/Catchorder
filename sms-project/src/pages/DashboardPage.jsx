import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { apiClient } from '../api/client.js';
import MainLayout from '../components/Layout/MainLayout.jsx';
import { LineChart, Line, BarChart, Bar, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList, Sankey, Layer, Rectangle } from 'recharts';
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

// 담당자별 색상 (주황색 계열)
const MANAGER_COLORS = ["#FF6B00", "#FF8C42", "#FFA668", "#FFC093", "#FFDCC1"];

// 관리자 이메일 (필터링용)
const ADMIN_EMAIL = 'admin@catchtable.co.kr';

const DashboardPage = () => {
  const navigate = useNavigate();
  const { logout, user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statsData, setStatsData] = useState(null);
  const [overallStats, setOverallStats] = useState(null);
  const [ownerStats, setOwnerStats] = useState([]);
  const [periodData, setPeriodData] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [managersMap, setManagersMap] = useState({});
  const [selectedInstallCategory, setSelectedInstallCategory] = useState(null);
  const [visibleCount, setVisibleCount] = useState(10);
  const [salesLogs, setSalesLogs] = useState({});
  const [dailyUsageData, setDailyUsageData] = useState([]);
  const [activityDate, setActivityDate] = useState(new Date().toISOString().split('T')[0]);
  const [activityReports, setActivityReports] = useState([]);
  const [activitySummary, setActivitySummary] = useState(null);
  const [usageDateRange, setUsageDateRange] = useState({
    start: (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0]; })(),
    end: new Date().toISOString().split('T')[0]
  });
  // 매장 이용현황 날짜 범위 (별도) - 기본 최근 1주일
  const [storeUsageDateRange, setStoreUsageDateRange] = useState({
    start: (() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0]; })(),
    end: new Date().toISOString().split('T')[0]
  });
  
  // 일별 설치 데이터
  const [dailyInstalls, setDailyInstalls] = useState([]);
  const [installManagers, setInstallManagers] = useState([]);

  // 히트맵 데이터
  const [heatmapData, setHeatmapData] = useState(null);
  const [heatmapLoading, setHeatmapLoading] = useState(false);
  const [heatmapDateRange, setHeatmapDateRange] = useState({
    start: (() => { const d = new Date(); d.setDate(d.getDate() - 14); return d.toISOString().split('T')[0]; })(),
    end: new Date().toISOString().split('T')[0]
  });
  const [heatmapOwnerFilter, setHeatmapOwnerFilter] = useState('all');

  // 월별 코호트 데이터
  const [cohortData, setCohortData] = useState(null);
  const [cohortLoading, setCohortLoading] = useState(false);
  const [cohortBaseDate, setCohortBaseDate] = useState(new Date().toISOString().split('T')[0]);

  // Chat states
  const [chatOpen, setChatOpen] = useState(false);
  
  // Mobile detection
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
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
  }, [chatOpen, chatMessages.length, isTyping]);

  // 실시간 현황 통계 가져오기
  const fetchTodayStats = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/dashboard');

      if (response.success && response.data) {
        // overall stats 설정
        setOverallStats(response.data.overall);

        // owner stats 설정 (이미 owner_name 포함됨)
        setOwnerStats(response.data.owners || []);
      }
    } catch (err) {
      console.error('대시보드 데이터 조회 실패:', err);
      setError('대시보드 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  // 매장 이용현황 (날짜 필터) 가져오기
  const fetchStoreUsageByDate = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/api/dashboard?start_date=${storeUsageDateRange.start}&end_date=${storeUsageDateRange.end}`);

      if (response.success && response.data) {
        setOverallStats(response.data.overall);
        setOwnerStats(response.data.owners || []);
      }
    } catch (err) {
      console.error('매장 이용현황 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  }, [storeUsageDateRange.start, storeUsageDateRange.end]);

  // 담당자 목록 가져오기
  const fetchManagers = useCallback(async () => {
    try {
      const response = await apiClient.get('/api/managers');

      if (response.success) {
        const map = {};
        let managersData = [];

        if (response.data?.managers) {
          managersData = response.data.managers;
        } else if (Array.isArray(response.data)) {
          managersData = response.data;
        }

        managersData.forEach(manager => {
          const key = manager.userId || manager.email;
          if (key && manager.name) {
            map[key] = manager.name;
          }
        });

        setManagersMap(map);
      }
    } catch (err) {
      console.error('담당자 목록 조회 실패:', err);
      // 담당자 목록은 필수가 아니므로 에러 표시 생략
    }
  }, []);

  // 영업로그 가져오기 (청크 단위 병렬 처리)
  const fetchSalesLogsForStores = useCallback(async (stores) => {
    const CHUNK_SIZE = 5;
    const logs = {};

    // stores를 CHUNK_SIZE 크기의 청크로 나누기
    for (let i = 0; i < stores.length; i += CHUNK_SIZE) {
      const chunk = stores.slice(i, i + CHUNK_SIZE);

      // 청크 내 모든 store의 로그를 병렬로 가져오기
      const chunkPromises = chunk.map(async (store) => {
        try {
          const response = await apiClient.get(`/api/stores/${store.store_id}/sales-logs`);
          if (response.success && response.data && response.data.logs && response.data.logs.length > 0) {
            // 가장 최신 로그만 저장
            const latestLog = response.data.logs[0];
            logs[store.store_id] = {
              content: latestLog.content,
              created_at: latestLog.created_at
            };
          }
        } catch (err) {
          // 개별 매장 로그 조회 실패는 무시 (다른 매장은 계속 처리)
        }
      });

      await Promise.all(chunkPromises);
    }

    setSalesLogs(logs);
  }, []);

  // 일별 이용 현황 데이터 가져오기
  const fetchDailyUsage = useCallback(async () => {
    try {
      const response = await apiClient.get(`/api/stats/daily-usage?start_date=${usageDateRange.start}&end_date=${usageDateRange.end}`);

      if (response.success && response.data?.daily_usage) {
        // 모든 날짜 데이터 표시 (0이어도 표기)
        const processedData = response.data.daily_usage.map(item => ({
          ...item,
          // 순수 유지 = 누적설치 - 누적해지
          net_installed: Math.max((item.cumulative_installed || 0) - (item.cumulative_churned || 0), 0)
        }));
        setDailyUsageData(processedData);
      }
    } catch (err) {
      console.error('일별 이용 현황 조회 실패:', err);
    }
  }, [usageDateRange.start, usageDateRange.end]);

  // 일별 설치 현황 가져오기
  const fetchDailyInstalls = useCallback(async () => {
    try {
      const response = await apiClient.get('/api/stats/daily-installs?days=14');

      if (response.success && response.data && Array.isArray(response.data)) {
        // 12월 7일(대량등록일) 제외
        const filteredData = response.data.filter(item => item.date !== '12-07');

        setDailyInstalls(filteredData);

        // managers 추출 (date 제외, admin 제외)
        if (filteredData.length > 0) {
          const managers = Object.keys(filteredData[0])
            .filter(key => key !== 'date')
            .filter(key => key !== ADMIN_EMAIL);

          setInstallManagers(managers);
        }
      }
    } catch (err) {
      console.error('일별 설치 현황 로드 실패:', err);
    }
  }, []);

  // 기간별 데이터 가져오기
  const fetchPeriodStats = useCallback(async () => {
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
    } catch (err) {
      console.error('기간별 통계 조회 실패:', err);
      setPeriodData([]);
    }
  }, [selectedPeriod]);

  // 히트맵 데이터 가져오기
  const fetchHeatmap = useCallback(async () => {
    try {
      setHeatmapLoading(true);
      const response = await apiClient.get(
        `/api/dashboard?view=heatmap&start_date=${heatmapDateRange.start}&end_date=${heatmapDateRange.end}`
      );

      if (response.success && response.data) {
        setHeatmapData(response.data);
      }
    } catch (err) {
      console.error('히트맵 데이터 조회 실패:', err);
    } finally {
      setHeatmapLoading(false);
    }
  }, [heatmapDateRange.start, heatmapDateRange.end]);

  // 월별 코호트 데이터 가져오기
  const fetchCohortData = useCallback(async () => {
    try {
      setCohortLoading(true);
      // Lambda Function URL 직접 호출
      const res = await fetch(`https://xq66243lt7bnfwpn5loy5wtf7m0exkez.lambda-url.ap-northeast-2.on.aws/?base_date=${cohortBaseDate}`);
      const response = await res.json();

      if (response.success && response.data) {
        setCohortData(response.data);
      }
    } catch (err) {
      console.error('월별 코호트 데이터 조회 실패:', err);
    } finally {
      setCohortLoading(false);
    }
  }, [cohortBaseDate]);

  // AI 채팅 전송
  const sendChatMessage = useCallback(async (message) => {
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
    } catch (err) {
      console.error('AI 채팅 오류:', err);
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: '오류가 발생했습니다. 다시 시도해주세요.'
      }]);
    } finally {
      setChatLoading(false);
    }
  }, []);

  // 초기 데이터 로드 - 담당자 목록 먼저 가져온 후 나머지 병렬 로드
  useEffect(() => {
    const loadData = async () => {
      // 담당자 목록 먼저 로드 (이름 매핑에 필요)
      await fetchManagers();

      // 나머지 API 호출은 병렬로 실행
      // fetchStoreUsageByDate는 별도 useEffect에서 호출됨
      await Promise.all([
        fetchDailyUsage(),
        fetchDailyInstalls()
      ]);
    };
    loadData();
  }, [fetchManagers, fetchDailyUsage, fetchDailyInstalls]);

  // 기간별 데이터 로드
  useEffect(() => {
    if (overallStats) {
      fetchPeriodStats();
    }
  }, [selectedPeriod, overallStats, fetchPeriodStats]);

  // 날짜 범위 변경 시 일별 이용 현황 재로드
  useEffect(() => {
    fetchDailyUsage();
  }, [fetchDailyUsage]);

  // 매장 이용현황 날짜 변경 시 재로드
  useEffect(() => {
    fetchStoreUsageByDate();
  }, [fetchStoreUsageByDate]);

  // 히트맵 데이터 로드
  useEffect(() => {
    fetchHeatmap();
  }, [fetchHeatmap]);

  // 월별 코호트 데이터 로드
  useEffect(() => {
    fetchCohortData();
  }, [fetchCohortData]);

  // 히트맵 필터링된 매장 목록
  const filteredHeatmapStores = useMemo(() => {
    if (!heatmapData?.stores) return [];
    if (heatmapOwnerFilter === 'all') return heatmapData.stores;
    return heatmapData.stores.filter(store => store.owner_id === heatmapOwnerFilter);
  }, [heatmapData?.stores, heatmapOwnerFilter]);

  // 날짜 변경 시 활동 보고서 재로드
  useEffect(() => {
    const fetchActivityReport = async () => {
      try {
        const response = await apiClient.get(`/api/reports/daily-activity?date=${activityDate}`);
        if (response.success) {
          setActivityReports(response.data.reports || []);
          setActivitySummary(response.data.summary || null);
        }
      } catch (err) {
        console.error('업무 현황 조회 실패:', err);
        setActivityReports([]);
        setActivitySummary(null);
      }
    };
    fetchActivityReport();
  }, [activityDate]);

  // 상태별 차트 데이터 준비
  const statusChartData = useMemo(() => {
    if (!overallStats?.stats) return [];
    
    // 설치진행 관련 상태만 표시 (이 순서대로)
    const statusOrder = [
      'PRE_INTRODUCTION',      // 방문대기
      'VISIT_COMPLETED',       // 방문완료
      'REVISIT_SCHEDULED',     // 재방문예정
      'INFO_REQUEST',          // 추가정보요청
      'REMOTE_INSTALL_SCHEDULED', // 에이전트설치예정
      'ADMIN_SETTING',         // 어드민셋팅
      'QR_LINKING'             // POS연동예정
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

  // 설치진행 현황 담당자별 데이터
  const progressDataByManager = useMemo(() => {
    if (!ownerStats || ownerStats.length === 0) return [];
    
    const statusOrder = [
      'PRE_INTRODUCTION',
      'VISIT_COMPLETED',
      'REVISIT_SCHEDULED',
      'INFO_REQUEST',
      'REMOTE_INSTALL_SCHEDULED',
      'ADMIN_SETTING',
      'QR_LINKING'
    ];
    
    // admin 제외한 담당자들
    const filteredOwners = ownerStats.filter(o => o.owner_id !== ADMIN_EMAIL);
    
    // 각 상태별로 담당자별 데이터 구성
    const data = statusOrder.map(status => {
      const row = { 
        status, 
        label: STATUS_LABELS[status]
      };
      
      filteredOwners.forEach(owner => {
        row[owner.owner_id] = owner.stats?.[status] || 0;
      });
      
      return row;
    });
    
    return data;
  }, [ownerStats]);
  
  // 설치진행 담당자 목록
  const progressManagers = useMemo(() => {
    if (!ownerStats || ownerStats.length === 0) return [];
    
    return ownerStats
      .filter(o => o.owner_id !== ADMIN_EMAIL)
      .map(o => o.owner_id);
  }, [ownerStats]);

  // 퍼널 차트 데이터
  const funnelData = useMemo(() => {
    if (!overallStats?.funnel) return [];
    
    return [
      { name: '가입', value: overallStats.funnel.registered || 0, fill: '#FF3D00' },
      { name: '설치', value: overallStats.funnel.install_completed || 0, fill: '#FF6B00' },
      { name: '이용', value: overallStats.funnel.active || 0, fill: '#FFA500' }
    ];
  }, [overallStats]);

  // 매장 이용 현황 - 정렬된 매장 리스트 (중복 계산 방지)
  const sortedStoreList = useMemo(() => {
    if (!overallStats?.install_detail || !selectedInstallCategory) return [];

    let storeList = [];
    if (selectedInstallCategory === 'active') {
      const completed = (overallStats.install_detail.active || []).map(s => ({...s, installType: '설치완료'}));
      const notCompleted = (overallStats.install_detail.active_not_completed || []).map(s => ({...s, installType: '설치중'}));
      storeList = [...completed, ...notCompleted];
    } else {
      storeList = overallStats.install_detail[selectedInstallCategory] || [];
    }

    // 설치일 기준 최신순 정렬
    return [...storeList].sort((a, b) => new Date(b.first_install_completed_at || 0) - new Date(a.first_install_completed_at || 0));
  }, [overallStats, selectedInstallCategory]);

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
        {/* 에러 메시지 표시 */}
        {error && (
          <div style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ color: '#DC2626', fontSize: '14px' }}>{error}</span>
            <button
              onClick={() => setError(null)}
              style={{
                background: 'none',
                border: 'none',
                color: '#DC2626',
                cursor: 'pointer',
                fontSize: '18px',
                padding: '0 4px'
              }}
            >
              ×
            </button>
          </div>
        )}

        {/* 메인 대시보드 영역 - 전체 너비 사용 */}
        <div>
          {/* KPI 카드 */}
          <div 
            className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-4"
            style={{
              marginBottom: '16px'
            }}>
            {/* 전체 매장 */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '12px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
            }}
            className="md:rounded-xl md:p-6"
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: '11px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}
                    className="md:text-sm md:mb-2"
                  >
                    전체 매장
                  </p>
                  <p style={{ fontSize: '24px', fontWeight: '700', color: '#111827', margin: 0 }}
                    className="md:text-3xl"
                  >
                    {overallStats?.funnel?.registered || 0}
                  </p>
                </div>
              </div>
            </div>

            {/* 설치 완료 */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '12px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
            }}
            className="md:rounded-xl md:p-6"
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: '11px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}
                    className="md:text-sm md:mb-2"
                  >
                    설치 완료
                  </p>
                  <p style={{ fontSize: '24px', fontWeight: '700', color: '#111827', margin: 0 }}
                    className="md:text-3xl"
                  >
                    {overallStats?.funnel?.install_completed || 0}
                  </p>
                </div>
              </div>
            </div>

            {/* 이용 매장 */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '12px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
            }}
            className="md:rounded-xl md:p-6"
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: '11px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}
                    className="md:text-sm md:mb-2"
                  >
                    이용 매장
                  </p>
                  <p style={{ fontSize: '24px', fontWeight: '700', color: '#111827', margin: 0 }}
                    className="md:text-3xl"
                  >
                    {overallStats?.funnel?.active || 0}
                  </p>
                  <p style={{ fontSize: '10px', color: '#FF6B00', marginTop: '2px' }}
                    className="md:text-xs md:mt-1"
                  >
                    이용률 {overallStats?.conversion?.active_rate || 0}%
                  </p>
                </div>
              </div>
            </div>

            {/* 해지/보류 */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '12px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
            }}
            className="md:rounded-xl md:p-6"
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: '11px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}
                    className="md:text-sm md:mb-2"
                  >
                    해지/보류
                  </p>
                  <p style={{ fontSize: '24px', fontWeight: '700', color: '#111827', margin: 0 }}
                    className="md:text-3xl"
                  >
                    {overallStats?.funnel?.churned || 0}
                  </p>
                  <p style={{ fontSize: '10px', color: '#EF4444', marginTop: '2px' }}
                    className="md:text-xs md:mt-1"
                  >
                    해지율 {overallStats?.conversion?.churn_rate || 0}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 차트 그리드 - 모바일에서 숨김, 데스크탑: 2열 */}
          {!isMobile && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ marginBottom: '24px' }}>
            {/* 일별 신규 설치 차트 */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: isMobile ? '12px' : '24px',
              border: '1px solid #e5e7eb',
              minHeight: '300px'
            }}
            className="md:min-h-[400px]"
            >
              <div style={{ marginBottom: '12px' }}>
                <h3 style={{ fontSize: isMobile ? '14px' : '16px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
                  일별 신규 설치
                </h3>
                {/* 담당자 범례 - 모바일에서는 아래로, flex-wrap */}
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: '8px'
                }}>
                  {installManagers.map((manager, index) => {
                    
                    return (
                      <span 
                        key={manager}
                        style={{
                          padding: '2px 8px',
                          fontSize: '11px',
                          borderRadius: '12px',
                          color: 'white',
                          fontWeight: '500',
                          backgroundColor: MANAGER_COLORS[index % MANAGER_COLORS.length]
                        }}
                      >
                        {managersMap[manager] || manager.split('@')[0]}
                      </span>
                    );
                  })}
                </div>
              </div>
              {dailyInstalls.length > 0 ? (
                <ResponsiveContainer width="100%" height={isMobile ? 250 : 332}>
                  <BarChart data={dailyInstalls} margin={{ top: 10, right: isMobile ? 20 : 40, left: isMobile ? 20 : 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis 
                      tick={{ fontSize: isMobile ? 10 : 12 }}
                      allowDecimals={false}
                      domain={[0, 'dataMax + 2']}
                    />
                    <Tooltip 
                      formatter={(value, name) => [
                        `${value}건`, 
                        managersMap[name] || name.split('@')[0]
                      ]}
                      labelFormatter={(label) => `날짜: ${label}`}
                    />
                    {/* Legend 제거 - 위에서 직접 표시 */}
                    {/* 담당자별 막대 생성 - 주황색 계열로 통일 */}
                    {installManagers.map((manager, index) => {
                      
                      
                      return (
                        <Bar 
                          key={manager}
                          dataKey={manager}
                          stackId="install"
                          fill={MANAGER_COLORS[index % MANAGER_COLORS.length]}
                          name={manager}
                          label={index === installManagers.length - 1 ? { position: 'top', fill: '#111827', fontSize: 11, fontWeight: 600 } : null}
                        />
                      );
                    })}
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ 
                  height: isMobile ? '280px' : '332px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: '#6b7280',
                  fontSize: '14px'
                }}>
                  데이터를 불러오는 중...
                </div>
              )}
            </div>

            {/* 설치진행 현황 */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              border: '1px solid #e5e7eb',
              minHeight: '400px'
            }}>
              <div style={{ marginBottom: '12px' }}>
                <h3 style={{ fontSize: isMobile ? '14px' : '16px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
                  설치진행 현황
                </h3>
                {/* 담당자 배지들 - 모바일에서는 아래로, flex-wrap */}
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: '8px'
                }}>
                {progressManagers.map((manager, idx) => {
                  
                  return (
                    <span key={manager} style={{
                      backgroundColor: MANAGER_COLORS[idx % MANAGER_COLORS.length],
                      color: idx < 3 ? 'white' : '#111827',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '500'
                    }}>
                      {managersMap[manager] || manager.split('@')[0]}
                    </span>
                  );
                })}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={progressDataByManager} layout="vertical" margin={{ left: isMobile ? 20 : 10, right: isMobile ? 20 : 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={true} vertical={false} />
                  <XAxis type="number" tick={{ fontSize: isMobile ? 10 : 11 }} />
                  <YAxis dataKey="label" type="category" width={isMobile ? 0 : 100} tick={isMobile ? false : { fontSize: 10 }} />
                  <Tooltip />
                  {progressManagers.map((manager, idx) => {
                    
                    const isLastManager = idx === progressManagers.length - 1;
                    return (
                      <Bar 
                        key={manager}
                        dataKey={manager}
                        stackId="progress"
                        fill={MANAGER_COLORS[idx % MANAGER_COLORS.length]}
                        name={managersMap[manager] || manager.split('@')[0]}
                      >
                        {isLastManager && (
                          <LabelList 
                            dataKey={(data) => {
                              // 각 행의 전체 합계 계산
                              let sum = 0;
                              progressManagers.forEach(m => {
                                sum += data[m] || 0;
                              });
                              return sum > 0 ? sum : '';
                            }}
                            position="right"
                            style={{ fontSize: 12, fontWeight: 600, fill: '#111827' }}
                          />
                        )}
                      </Bar>
                    );
                  })}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          )}

          {/* 월별 설치 코호트 분석 - 모바일에서 숨김 */}
          {!isMobile && (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              border: '1px solid #e5e7eb',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: 0 }}>
                  월별 설치 코호트 분석
                </h3>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>기준일:</span>
                  <input
                    type="date"
                    value={cohortBaseDate}
                    onChange={(e) => setCohortBaseDate(e.target.value)}
                    style={{
                      padding: '6px 8px',
                      borderRadius: '6px',
                      border: '1px solid #e5e7eb',
                      fontSize: '12px'
                    }}
                  />
                </div>
              </div>

              {cohortLoading ? (
                <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#6b7280' }}>로딩 중...</span>
                </div>
              ) : cohortData?.sankey?.nodes?.length > 0 ? (
                <div>
                  {/* 요약 카드 */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
                    <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', textAlign: 'center' }}>
                      <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 4px 0' }}>총 설치</p>
                      <p style={{ fontSize: '20px', fontWeight: '600', color: '#111827', margin: 0 }}>{cohortData.summary?.total_installed || 0}</p>
                    </div>
                    <div style={{ padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '8px', textAlign: 'center' }}>
                      <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 4px 0' }}>이용중</p>
                      <p style={{ fontSize: '20px', fontWeight: '600', color: '#22c55e', margin: 0 }}>{cohortData.summary?.total_active || 0}</p>
                    </div>
                    <div style={{ padding: '12px', backgroundColor: '#fefce8', borderRadius: '8px', textAlign: 'center' }}>
                      <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 4px 0' }}>미이용</p>
                      <p style={{ fontSize: '20px', fontWeight: '600', color: '#eab308', margin: 0 }}>{cohortData.summary?.total_inactive || 0}</p>
                    </div>
                    <div style={{ padding: '12px', backgroundColor: '#fef2f2', borderRadius: '8px', textAlign: 'center' }}>
                      <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 4px 0' }}>해지</p>
                      <p style={{ fontSize: '20px', fontWeight: '600', color: '#ef4444', margin: 0 }}>{cohortData.summary?.total_churned || 0}</p>
                    </div>
                  </div>

                  {/* Sankey 차트 */}
                  <ResponsiveContainer width="100%" height={350}>
                    <Sankey
                      data={cohortData.sankey}
                      node={({ x, y, width, height, index, payload }) => {
                        const colors = ['#6366f1', '#8b5cf6', '#a855f7', '#c084fc', '#d8b4fe', '#e9d5ff', '#22c55e', '#eab308', '#ef4444'];
                        return (
                          <Layer key={`node-${index}`}>
                            <Rectangle
                              x={x}
                              y={y}
                              width={width}
                              height={height}
                              fill={colors[index % colors.length]}
                              fillOpacity={0.9}
                            />
                            <text
                              x={x < 200 ? x + width + 6 : x - 6}
                              y={y + height / 2}
                              textAnchor={x < 200 ? 'start' : 'end'}
                              dominantBaseline="middle"
                              style={{ fontSize: 12, fill: '#374151' }}
                            >
                              {payload.name}
                            </text>
                          </Layer>
                        );
                      }}
                      link={{ stroke: '#d1d5db', strokeOpacity: 0.5 }}
                      nodePadding={30}
                      nodeWidth={10}
                      margin={{ top: 20, right: 150, bottom: 20, left: 20 }}
                    >
                      <Tooltip />
                    </Sankey>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', fontSize: '14px' }}>
                  데이터가 없습니다
                </div>
              )}
            </div>
          )}

          {/* 매장 이용 현황 - 모바일에서 숨김 */}
          {!isMobile && overallStats?.install_detail?.summary && (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              border: '1px solid #e5e7eb',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: 0 }}>
                매장 이용 현황
              </h3>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="date"
                  value={storeUsageDateRange.start}
                  onChange={(e) => setStoreUsageDateRange(prev => ({ ...prev, start: e.target.value }))}
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
                  value={storeUsageDateRange.end}
                  onChange={(e) => setStoreUsageDateRange(prev => ({ ...prev, end: e.target.value }))}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: '1px solid #e5e7eb',
                    fontSize: '12px'
                  }}
                />
              </div>
            </div>
              
              {/* 카테고리 카드들 */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '12px',
                marginBottom: '20px'
              }}>
                {/* 이용 카드 */}
                <div
                  onClick={() => {
                    setSelectedInstallCategory(selectedInstallCategory === 'active' ? null : 'active');
                    setVisibleCount(10);
                  }}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: selectedInstallCategory === 'active' ? '2px solid #FF3D00' : '1px solid #e5e7eb',
                    backgroundColor: selectedInstallCategory === 'active' ? '#fff5f3' : 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px 0' }}>이용</p>
                  <p style={{ fontSize: '24px', fontWeight: '600', color: '#3B82F6', margin: 0 }}>
                    {(overallStats.install_detail.summary.active || 0) + (overallStats.install_detail.summary.active_not_completed || 0)}
                  </p>
                </div>

                {/* 미이용 카드 */}
                <div
                  onClick={async () => {
                    const newCategory = selectedInstallCategory === 'inactive' ? null : 'inactive';
                    setSelectedInstallCategory(newCategory);
                    setVisibleCount(10);
                    
                    // 미이용 탭 선택 시 영업로그 가져오기
                    if (newCategory === 'inactive' && overallStats?.install_detail?.inactive) {
                      fetchSalesLogsForStores(overallStats.install_detail.inactive);
                    }
                  }}
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
                  <p style={{ fontSize: '24px', fontWeight: '600', color: '#6B7280', margin: 0 }}>
                    {overallStats.install_detail.summary.inactive || 0}
                  </p>
                </div>

                {/* 하자보수 카드 */}
                <div
                  onClick={async () => {
                    const newCategory = selectedInstallCategory === 'repair' ? null : 'repair';
                    setSelectedInstallCategory(newCategory);
                    setVisibleCount(10);
                    
                    // 하자보수 탭 선택 시 영업로그 가져오기
                    if (newCategory === 'repair' && overallStats?.install_detail?.repair) {
                      fetchSalesLogsForStores(overallStats.install_detail.repair);
                    }
                  }}
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
                  <p style={{ fontSize: '24px', fontWeight: '600', color: '#EF4444', margin: 0 }}>
                    {overallStats.install_detail.summary.repair || 0}
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
                          <th style={{ width: '50px', padding: '8px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>번호</th>
                          <th style={{ width: '25%', padding: '8px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>매장명</th>
                          <th style={{ width: '80px', padding: '8px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>담당자</th>
                          <th style={{ width: '100px', padding: '8px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>설치일</th>
                          {selectedInstallCategory === 'active' ? (
                            <>
                              <th style={{ width: '80px', padding: '8px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>주문수</th>
                              <th style={{ width: '100px', padding: '8px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>주문고객수</th>
                              <th style={{ width: '80px', padding: '8px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>구분</th>
                            </>
                          ) : (
                            <>
                              <th style={{ width: '200px', padding: '8px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>최근 영업로그</th>
                              <th style={{ width: '80px', padding: '8px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>주문</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {sortedStoreList.slice(0, visibleCount).map((store, index) => (
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
                                {store.first_install_completed_at ? new Date(store.first_install_completed_at).toLocaleDateString('ko-KR') : '-'}
                              </td>
                              {selectedInstallCategory === 'active' ? (
                                <>
                                  <td style={{ padding: '12px 8px', fontSize: '13px', color: '#374151', textAlign: 'center' }}>
                                    {store.order_count ? store.order_count.toLocaleString() : '0'}
                                  </td>
                                  <td style={{ padding: '12px 8px', fontSize: '13px', color: '#374151', textAlign: 'center' }}>
                                    {store.customer_count ? store.customer_count.toLocaleString() : '0'}
                                  </td>
                                  <td style={{ padding: '12px 8px', fontSize: '13px' }}>
                                    <span style={{
                                      padding: '2px 8px',
                                      borderRadius: '4px',
                                      fontSize: '11px',
                                      fontWeight: '500',
                                      backgroundColor: store.installType === '설치중' ? '#fef3c7' : '#d1fae5',
                                      color: store.installType === '설치중' ? '#d97706' : '#059669'
                                    }}>
                                      {store.installType}
                                    </span>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td style={{ padding: '12px 8px', fontSize: '13px', color: '#374151' }}>
                                    {(() => {
                                      const log = salesLogs[store.store_id];
                                      if (!log) return '-';
                                      
                                      const content = log.content.length > 20 ? 
                                        log.content.substring(0, 20) + '...' : log.content;
                                      
                                      const date = new Date(log.created_at);
                                      const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
                                      
                                      return `${content} (${dateStr})`;
                                    })()}
                                  </td>
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
                                </>
                              )}
                            </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {visibleCount < sortedStoreList.length && (
                    <button
                      onClick={() => setVisibleCount(prev => prev + 10)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        marginTop: '16px',
                        backgroundColor: '#F3F4F6',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#6B7280',
                        fontSize: '14px',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#E5E7EB'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
                    >
                      더보기 ({sortedStoreList.length - visibleCount}개 더)
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 일별 이용 현황 차트 - 모바일에서 숨김 */}
          {!isMobile && (
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
              <div>
                {/* 이용매장 Line 차트 */}
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={dailyUsageData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return `${date.getMonth() + 1}/${date.getDate()}`;
                      }}
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 10 }}
                    />
                    <Tooltip
                      labelFormatter={(value) => {
                        const date = new Date(value);
                        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                      }}
                      formatter={(value) => [`${value}개`, '이용매장']}
                    />
                    <Legend
                      wrapperStyle={{ paddingTop: '8px' }}
                      formatter={() => '이용매장'}
                    />
                    <Line type="monotone" dataKey="active" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3, fill: '#3B82F6' }} name="active" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
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
          )}

          {/* 담당자별 성과 테이블 - 모바일에서 숨김 */}
          {!isMobile && (
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
          )}

          {/* 담당자별 업무 현황 */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: isMobile ? '16px' : '24px',
            border: '1px solid #e5e7eb'
          }}>
            {/* 헤더 섹션 */}
            <div style={{ marginBottom: '16px' }}>
              {/* 제목 - 무조건 한 줄 */}
              <h3 style={{ 
                fontSize: isMobile ? '15px' : '16px', 
                fontWeight: '600', 
                color: '#111827', 
                margin: '0 0 8px 0',
                whiteSpace: isMobile ? 'nowrap' : 'normal'
              }}>
                담당자별 업무 현황
              </h3>
              
              {/* 요약 + 날짜 - 모바일: 세로, 데스크탑: 가로 */}
              <div style={{ 
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: isMobile ? 'flex-start' : 'space-between',
                alignItems: isMobile ? 'stretch' : 'center',
                gap: isMobile ? '8px' : '16px',
                width: '100%',
                boxSizing: 'border-box'
              }}>
                {/* 요약 텍스트 */}
                {activitySummary && (
                  <span style={{ fontSize: isMobile ? '13px' : '14px', color: '#6B7280' }}>
                    상태변경 {activitySummary.total_status_changes || 0}건 · 영업로그 {activitySummary.total_sales_logs || 0}건
                  </span>
                )}
                
                {/* 날짜 선택기 */}
                <div style={{ 
                  width: isMobile ? '100%' : 'auto',
                  boxSizing: 'border-box'
                }}>
                  <input 
                    type="date" 
                    value={activityDate}
                    onChange={(e) => setActivityDate(e.target.value)}
                    style={{ 
                      padding: '8px 12px', 
                      borderRadius: '8px', 
                      border: '1px solid #e5e7eb',
                      fontSize: '14px',
                      width: isMobile ? '100%' : '150px',
                      boxSizing: 'border-box',
                      flexShrink: isMobile ? 0 : 1
                    }}
                  />
                </div>
              </div>
            </div>
            
            {(() => {
              const filteredReports = activityReports.filter(report => report.manager_id !== ADMIN_EMAIL);
              
              return filteredReports.length > 0 ? (
              <div>
                {filteredReports.map(report => (
                  <div key={report.manager_id} style={{ 
                    backgroundColor: '#F9FAFB', 
                    borderRadius: isMobile ? '8px' : '12px', 
                    padding: isMobile ? '12px' : '20px', 
                    marginBottom: isMobile ? '12px' : '16px' 
                  }}>
                    {/* 담당자명 */}
                    <div style={{ 
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: isMobile ? '12px' : '16px'
                    }}>
                      <span style={{ 
                        fontWeight: '600', 
                        fontSize: isMobile ? '14px' : '16px', 
                        color: '#111827' 
                      }}>
                        {managersMap[report.manager_id] || report.manager_id.split('@')[0]}
                      </span>
                      <span style={{ 
                        fontSize: isMobile ? '13px' : '14px', 
                        color: '#6B7280', 
                        fontWeight: '400' 
                      }}>
                        ({report.total_activities}건)
                      </span>
                    </div>
                    
                    {/* 상태 변경 */}
                    {report.status_changes && report.status_changes.length > 0 && (
                      <div style={{ marginBottom: isMobile ? '10px' : '12px' }}>
                        <div style={{ 
                          fontSize: isMobile ? '12px' : '13px', 
                          fontWeight: '500', 
                          color: '#3B82F6', 
                          marginBottom: isMobile ? '6px' : '8px' 
                        }}>
                          {isMobile ? '▸ 상태 변경' : '📋 상태 변경'} ({report.status_changes.length}건)
                        </div>
                        {report.status_changes.map((change, idx) => (
                          <div key={idx} style={{ 
                            fontSize: isMobile ? '12px' : '14px', 
                            color: '#374151', 
                            marginLeft: isMobile ? '16px' : '20px', 
                            marginBottom: '4px',
                            wordBreak: 'break-word'
                          }}>
                            • {change.store_name}: {change.old_status} → {change.new_status}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* 영업 로그 */}
                    {report.sales_logs && report.sales_logs.length > 0 && (
                      <div>
                        <div style={{ 
                          fontSize: isMobile ? '12px' : '13px', 
                          fontWeight: '500', 
                          color: '#10B981', 
                          marginBottom: isMobile ? '6px' : '8px' 
                        }}>
                          {isMobile ? '▸ 영업 로그' : '📝 영업 로그'} ({report.sales_logs.length}건)
                        </div>
                        {report.sales_logs.map((log, idx) => {
                          const storeName = log.store_name || '';
                          const content = log.content || '';
                          const displayText = storeName ? `[${storeName}] - ${content}` : content;
                          const truncateLength = isMobile ? 40 : 50;
                          return (
                            <div key={idx} style={{ 
                              fontSize: isMobile ? '12px' : '14px', 
                              color: '#374151', 
                              marginLeft: isMobile ? '16px' : '20px', 
                              marginBottom: '4px',
                              wordBreak: 'break-word'
                            }}>
                              • {displayText.length > truncateLength ? displayText.slice(0, truncateLength) + '...' : displayText}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    {/* 활동 없음 */}
                    {report.total_activities === 0 && (
                      <div style={{ fontSize: '14px', color: '#9CA3AF' }}>활동 내역 없음</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
                해당 날짜에 활동 내역이 없습니다
              </div>
            );
            })()}
          </div>

          {/* 매장별 일별 주문 히트맵 - 모바일에서 숨김 */}
          {!isMobile && (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              border: '1px solid #e5e7eb',
              marginTop: '24px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: 0 }}>
                  매장별 일별 주문 현황
                </h3>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <select
                    value={heatmapOwnerFilter}
                    onChange={(e) => setHeatmapOwnerFilter(e.target.value)}
                    style={{
                      padding: '6px 8px',
                      borderRadius: '6px',
                      border: '1px solid #e5e7eb',
                      fontSize: '12px',
                      backgroundColor: 'white'
                    }}
                  >
                    <option value="all">전체 담당자</option>
                    {heatmapData?.owners?.map(owner => (
                      <option key={owner.id} value={owner.id}>
                        {owner.id === 'unassigned' ? '미지정' : owner.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={heatmapDateRange.start}
                    onChange={(e) => setHeatmapDateRange(prev => ({ ...prev, start: e.target.value }))}
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
                    value={heatmapDateRange.end}
                    onChange={(e) => setHeatmapDateRange(prev => ({ ...prev, end: e.target.value }))}
                    style={{
                      padding: '6px 8px',
                      borderRadius: '6px',
                      border: '1px solid #e5e7eb',
                      fontSize: '12px'
                    }}
                  />
                </div>
              </div>

              {heatmapLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  로딩 중...
                </div>
              ) : !heatmapData ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
                  데이터를 불러오는 중...
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr>
                        <th style={{
                          padding: '8px',
                          textAlign: 'center',
                          fontWeight: '600',
                          color: '#374151',
                          position: 'sticky',
                          left: 0,
                          backgroundColor: 'white',
                          minWidth: '36px',
                          borderBottom: '1px solid #e5e7eb'
                        }}>
                          #
                        </th>
                        <th style={{
                          padding: '8px',
                          textAlign: 'left',
                          fontWeight: '600',
                          color: '#374151',
                          position: 'sticky',
                          left: '36px',
                          backgroundColor: 'white',
                          minWidth: '150px',
                          borderBottom: '1px solid #e5e7eb'
                        }}>
                          매장명
                        </th>
                        {heatmapData?.dates?.map(date => (
                          <th key={date} style={{
                            padding: '4px 6px',
                            textAlign: 'center',
                            fontWeight: '500',
                            color: '#6b7280',
                            borderBottom: 'none',
                            minWidth: '36px'
                          }}>
                            {new Date(date).getDate()}
                          </th>
                        ))}
                        <th style={{
                          padding: '8px',
                          textAlign: 'center',
                          fontWeight: '600',
                          color: '#374151',
                          borderBottom: '1px solid #e5e7eb'
                        }}>
                          합계
                        </th>
                      </tr>
                      {/* 일별 이용매장 수 */}
                      <tr style={{ backgroundColor: '#f9fafb' }}>
                        <th style={{
                          padding: '4px 8px',
                          textAlign: 'center',
                          fontSize: '11px',
                          fontWeight: '500',
                          color: '#6b7280',
                          position: 'sticky',
                          left: 0,
                          backgroundColor: '#f9fafb',
                          borderBottom: '1px solid #e5e7eb'
                        }}>
                        </th>
                        <th style={{
                          padding: '4px 8px',
                          textAlign: 'left',
                          fontSize: '11px',
                          fontWeight: '500',
                          color: '#6b7280',
                          position: 'sticky',
                          left: '36px',
                          backgroundColor: '#f9fafb',
                          borderBottom: '1px solid #e5e7eb'
                        }}>
                          이용매장
                        </th>
                        {heatmapData?.dates?.map(date => {
                          const activeCount = filteredHeatmapStores?.filter(s => (s.orders?.[date] || 0) > 0).length || 0;
                          return (
                            <th key={`count-${date}`} style={{
                              padding: '4px 6px',
                              textAlign: 'center',
                              fontSize: '11px',
                              fontWeight: '600',
                              color: '#3B82F6',
                              borderBottom: '1px solid #e5e7eb'
                            }}>
                              {activeCount}
                            </th>
                          );
                        })}
                        <th style={{
                          padding: '4px 8px',
                          textAlign: 'center',
                          fontSize: '11px',
                          fontWeight: '600',
                          color: '#3B82F6',
                          borderBottom: '1px solid #e5e7eb'
                        }}>
                          {filteredHeatmapStores?.length || 0}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHeatmapStores?.map((store, idx) => {
                        const maxOrder = Math.max(...Object.values(store.orders || {}), 1);
                        return (
                          <tr key={store.seq} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{
                              padding: '6px 8px',
                              textAlign: 'center',
                              fontSize: '11px',
                              color: '#6b7280',
                              position: 'sticky',
                              left: 0,
                              backgroundColor: 'white'
                            }}>
                              {idx + 1}
                            </td>
                            <td style={{
                              padding: '6px 8px',
                              fontWeight: '500',
                              color: '#111827',
                              position: 'sticky',
                              left: '36px',
                              backgroundColor: 'white',
                              maxWidth: '150px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {store.store_name || store.seq}
                            </td>
                            {heatmapData?.dates?.map(date => {
                              const count = store.orders?.[date] || 0;
                              const intensity = count > 0 ? Math.min(count / maxOrder, 1) : 0;
                              const bgColor = count === 0
                                ? '#ffffff'
                                : `rgba(34, 197, 94, ${0.2 + intensity * 0.8})`;
                              return (
                                <td key={date} style={{
                                  padding: '4px',
                                  textAlign: 'center',
                                  backgroundColor: bgColor,
                                  color: count > 0 ? (intensity > 0.5 ? 'white' : '#166534') : '#d1d5db',
                                  fontWeight: count > 0 ? '600' : '400'
                                }}>
                                  {count || '-'}
                                </td>
                              );
                            })}
                            <td style={{
                              padding: '6px 8px',
                              textAlign: 'center',
                              fontWeight: '600',
                              color: '#111827',
                              backgroundColor: '#f9fafb'
                            }}>
                              {store.total || 0}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {filteredHeatmapStores?.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
                  해당 기간에 주문 데이터가 없습니다
                </div>
              )}
            </div>
          )}
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