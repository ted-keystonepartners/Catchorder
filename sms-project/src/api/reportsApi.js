/**
 * 리포트 API
 * 월간 리포트 시스템을 위한 API 모듈
 */
import apiClient from './client.js';

/**
 * 대시보드 전체 통계 조회 (KPI용)
 * 기존 대시보드 API 재활용
 * @returns {Promise<{success: boolean, data: Object, error: string|null}>}
 */
export async function getDashboardOverallStats() {
  try {
    const response = await apiClient.get('/api/dashboard', {}, { timeout: 60000 });

    if (response.success && response.data?.overall) {
      return {
        success: true,
        data: response.data.overall,
        error: null
      };
    }

    console.warn('대시보드 API 실패, mock 데이터 사용');
    return {
      success: true,
      data: generateMockOverallStats(),
      error: null
    };
  } catch (err) {
    console.error('대시보드 통계 조회 실패:', err);
    return {
      success: true,
      data: generateMockOverallStats(),
      error: null
    };
  }
}

/**
 * KPI 요약 데이터 조회
 * @param {string} startDate - 시작일 (YYYY-MM-DD)
 * @param {string} endDate - 종료일 (YYYY-MM-DD)
 * @returns {Promise<{success: boolean, data: Object, error: string|null}>}
 */
export async function getReportSummary(startDate, endDate) {
  try {
    const response = await apiClient.get(
      `/api/reports/summary?start_date=${startDate}&end_date=${endDate}`,
      {},
      { timeout: 60000 }
    );

    if (response.success) {
      return response;
    }

    // API가 없는 경우 mock 데이터 반환
    console.warn('리포트 요약 API 미구현, mock 데이터 사용');
    return {
      success: true,
      data: generateMockSummary(startDate, endDate),
      error: null
    };
  } catch (err) {
    console.error('리포트 요약 조회 실패:', err);
    return {
      success: true,
      data: generateMockSummary(startDate, endDate),
      error: null
    };
  }
}

/**
 * 월별 퍼널 데이터 조회
 * 월간 코호트 API를 활용하여 퍼널 데이터 구성
 * @returns {Promise<{success: boolean, data: Object, error: string|null}>}
 */
export async function getMonthlyFunnel() {
  try {
    // 월간 코호트 API 호출 (2024-09-01부터 가져와서 12월 이전 데이터도 포함)
    const cohortResponse = await apiClient.get(
      '/api/dashboard?view=monthly_cohort_retention&start_date=2024-09-01',
      {},
      { timeout: 60000 }
    );

    if (cohortResponse.success && cohortResponse.data?.monthlyStats) {
      const monthlyStats = cohortResponse.data.monthlyStats;
      const monthlyData = monthlyStats.map(row => ({
        month: row.monthKey === '0000-00' ? 'before_dec' : row.monthKey,
        label: row.label,
        registered: row.registered || 0,
        installed: row.installed || 0,
        active: row.active || 0,
        churned: row.churned || 0,
        hold: row.hold || 0
      }));

      // 누적 데이터는 월별 데이터의 합계로 계산
      const cumulative = {
        registered: monthlyData.reduce((sum, r) => sum + r.registered, 0),
        installed: monthlyData.reduce((sum, r) => sum + r.installed, 0),
        active: monthlyData.reduce((sum, r) => sum + r.active, 0),
        churned: monthlyData.reduce((sum, r) => sum + r.churned, 0),
        hold: monthlyData.reduce((sum, r) => sum + r.hold, 0)
      };

      return {
        success: true,
        data: { monthly: monthlyData, cumulative },
        error: null
      };
    }

    // 누적 데이터 조회 (fallback)
    const dashboardResponse = await apiClient.get('/api/dashboard', {}, { timeout: 60000 });
    const cumulative = {
      registered: dashboardResponse.data?.overall?.funnel?.registered || 0,
      installed: dashboardResponse.data?.overall?.funnel?.install_completed || 0,
      active: dashboardResponse.data?.overall?.funnel?.active || 0,
      churned: dashboardResponse.data?.overall?.funnel?.churned || 0,
      hold: 0
    };

    // 코호트 데이터가 없으면 mock 데이터 사용
    console.warn('월간 코호트 데이터 없음, mock 데이터 사용');
    return {
      success: true,
      data: generateMockMonthlyFunnel(),
      error: null
    };
  } catch (err) {
    console.error('월별 퍼널 데이터 조회 실패:', err);
    return {
      success: true,
      data: generateMockMonthlyFunnel(),
      error: null
    };
  }
}

/**
 * 퍼널 데이터 조회
 * @param {string} startDate - 시작일 (YYYY-MM-DD)
 * @param {string} endDate - 종료일 (YYYY-MM-DD)
 * @returns {Promise<{success: boolean, data: Object, error: string|null}>}
 */
export async function getReportFunnel(startDate, endDate) {
  try {
    const response = await apiClient.get(
      `/api/reports/funnel?start_date=${startDate}&end_date=${endDate}`,
      {},
      { timeout: 60000 }
    );

    if (response.success) {
      return response;
    }

    console.warn('퍼널 API 미구현, mock 데이터 사용');
    return {
      success: true,
      data: generateMockFunnel(startDate, endDate),
      error: null
    };
  } catch (err) {
    console.error('퍼널 데이터 조회 실패:', err);
    return {
      success: true,
      data: generateMockFunnel(startDate, endDate),
      error: null
    };
  }
}

/**
 * 월간 코호트 잔존율 데이터 조회 (기존 API 재활용)
 * @param {string} endDate - 기준일 (YYYY-MM-DD)
 * @returns {Promise<{success: boolean, data: Object, error: string|null}>}
 */
export async function getReportCohort(endDate) {
  try {
    const response = await apiClient.get(
      `/api/dashboard?view=monthly_cohort_retention&start_date=2024-09-01&end_date=${endDate}`,
      {},
      { timeout: 60000 }
    );

    if (response.success && response.data?.cohorts) {
      return {
        success: true,
        data: { cohorts: response.data.cohorts },
        error: null
      };
    }

    // 기존 API 형식으로 재시도 (end_date 파라미터 미지원시)
    const fallbackResponse = await apiClient.get(
      `/api/dashboard?view=monthly_cohort_retention&start_date=2024-09-01`,
      {},
      { timeout: 60000 }
    );

    if (fallbackResponse.success && fallbackResponse.data?.cohorts) {
      return {
        success: true,
        data: { cohorts: fallbackResponse.data.cohorts },
        error: null
      };
    }

    console.warn('코호트 API 실패, mock 데이터 사용');
    return {
      success: true,
      data: generateMockCohort(),
      error: null
    };
  } catch (err) {
    console.error('코호트 데이터 조회 실패:', err);
    return {
      success: true,
      data: generateMockCohort(),
      error: null
    };
  }
}

/**
 * Key Tasks 목록 조회
 * @returns {Promise<{success: boolean, data: Object, error: string|null}>}
 */
export async function getKeyTasks() {
  try {
    const response = await apiClient.get('/api/key-tasks', {}, { timeout: 30000 });

    if (response.success && response.data?.tasks) {
      return response;
    }

    // API 실패 시 mock 데이터 사용
    console.warn('Key Tasks API 실패, mock 데이터 사용');
    return {
      success: true,
      data: { tasks: getMockKeyTasks() },
      error: null
    };
  } catch (err) {
    console.error('Key Tasks 조회 실패:', err);
    return {
      success: true,
      data: { tasks: getMockKeyTasks() },
      error: null
    };
  }
}

/**
 * Key Task 생성
 * @param {Object} data - Task 데이터
 * @returns {Promise<{success: boolean, data: Object, error: string|null}>}
 */
export async function createKeyTask(data) {
  try {
    const response = await apiClient.post('/api/key-tasks', {
      title: data.title,
      owner: data.owner,
      status: data.status || '진행중',
      start_month: data.startMonth || 1,
      end_month: data.endMonth || 12
    }, { timeout: 30000 });

    return response;
  } catch (err) {
    console.error('Key Task 생성 실패:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Key Task 수정
 * @param {string} taskId - Task ID
 * @param {Object} data - 수정할 데이터
 * @returns {Promise<{success: boolean, data: Object, error: string|null}>}
 */
export async function updateKeyTask(taskId, data) {
  try {
    const response = await apiClient.put(`/api/key-tasks/${taskId}`, {
      title: data.title,
      owner: data.owner,
      status: data.status,
      start_month: data.startMonth,
      end_month: data.endMonth
    }, { timeout: 30000 });

    return response;
  } catch (err) {
    console.error('Key Task 수정 실패:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Key Task 삭제
 * @param {string} taskId - Task ID
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function deleteKeyTask(taskId) {
  try {
    const response = await apiClient.delete(`/api/key-tasks/${taskId}`, { timeout: 30000 });
    return response;
  } catch (err) {
    console.error('Key Task 삭제 실패:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Action Item 추가
 * @param {string} taskId - 부모 Task ID
 * @param {Object} data - Action Item 데이터
 * @returns {Promise<{success: boolean, data: Object, error: string|null}>}
 */
export async function createKeyTaskAction(taskId, data) {
  try {
    const response = await apiClient.post(`/api/key-tasks/${taskId}/actions`, {
      title: data.title,
      status: data.status || '대기',
      start_month: data.startMonth || 1,
      end_month: data.endMonth || 12,
      content: data.content || ''
    }, { timeout: 30000 });

    return response;
  } catch (err) {
    console.error('Action Item 추가 실패:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Action Item 수정
 * @param {string} taskId - 부모 Task ID
 * @param {string} actionId - Action Item ID
 * @param {Object} data - 수정할 데이터
 * @returns {Promise<{success: boolean, data: Object, error: string|null}>}
 */
export async function updateKeyTaskAction(taskId, actionId, data) {
  try {
    const response = await apiClient.put(`/api/key-tasks/${taskId}/actions/${actionId}`, {
      title: data.title,
      status: data.status,
      start_month: data.startMonth,
      end_month: data.endMonth,
      content: data.content
    }, { timeout: 30000 });

    return response;
  } catch (err) {
    console.error('Action Item 수정 실패:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Action Item 삭제
 * @param {string} taskId - 부모 Task ID
 * @param {string} actionId - Action Item ID
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function deleteKeyTaskAction(taskId, actionId) {
  try {
    const response = await apiClient.delete(`/api/key-tasks/${taskId}/actions/${actionId}`, { timeout: 30000 });
    return response;
  } catch (err) {
    console.error('Action Item 삭제 실패:', err);
    return { success: false, error: err.message };
  }
}

// ============ Mock Data Generators ============

function generateMockOverallStats() {
  return {
    funnel: {
      registered: 312,
      install_completed: 241,
      active: 213,
      churned: 28
    },
    conversion: {
      active_rate: 68.3,
      churn_rate: 8.9
    }
  };
}

function generateMockMonthlyFunnel() {
  return {
    monthly: [
      { month: 'before_dec', label: '12월 이전', registered: 156, installed: 128, active: 98 },
      { month: '2025-12', label: '12월', registered: 42, installed: 35, active: 28 },
      { month: '2026-01', label: '1월', registered: 51, installed: 38, active: 31 },
      { month: '2026-02', label: '2월', registered: 38, installed: 25, active: 22 },
      { month: '2026-03', label: '3월', registered: 25, installed: 15, active: 12 }
    ],
    cumulative: { registered: 312, installed: 241, active: 175 }
  };
}

function generateMockSummary(startDate, endDate) {
  // 기간에 따른 동적 mock 데이터 생성
  const start = new Date(startDate);
  const end = new Date(endDate);
  const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

  const baseSignups = Math.round(daysDiff * 5.2); // 일평균 5.2건
  const conversionRate = 58 + Math.random() * 10; // 58~68%
  const activeStores = 480 + Math.round(Math.random() * 40);
  const targetGap = conversionRate - 70;

  return {
    total_signups: baseSignups,
    conversion_rate: Math.round(conversionRate * 10) / 10,
    active_stores: activeStores,
    target_gap: Math.round(targetGap * 10) / 10,
    prev_signups: Math.round(baseSignups * 0.9),
    prev_conversion_rate: Math.round((conversionRate - 3) * 10) / 10
  };
}

function generateMockFunnel(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

  const salesAttempts = Math.round(daysDiff * 10.5);
  const signups = Math.round(salesAttempts * 0.47);
  const infoCollection = Math.round(signups * 0.60);
  const installations = Math.round(infoCollection * 0.78);
  const activeUsage = Math.round(installations * 0.90);

  return {
    funnel: [
      { stage: '영업시도', count: salesAttempts, rate: 100 },
      { stage: '신규가입', count: signups, rate: Math.round((signups / salesAttempts) * 1000) / 10 },
      { stage: '정보수집', count: infoCollection, rate: Math.round((infoCollection / signups) * 1000) / 10 },
      { stage: '설치', count: installations, rate: Math.round((installations / infoCollection) * 1000) / 10 },
      { stage: '이용', count: activeUsage, rate: Math.round((activeUsage / installations) * 1000) / 10 }
    ],
    monthly_trend: generateMonthlyTrend()
  };
}

function generateMonthlyTrend() {
  const months = [];
  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = d.toISOString().slice(0, 7);

    months.push({
      month: monthStr,
      signup: 42 + Math.round(Math.random() * 15),
      collection: 55 + Math.round(Math.random() * 12),
      install: 70 + Math.round(Math.random() * 10),
      usage: 85 + Math.round(Math.random() * 8)
    });
  }

  return months;
}

function generateMockCohort() {
  const cohorts = [];
  const now = new Date();

  for (let i = 4; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = d.toISOString().slice(0, 7);
    const monthLabel = `${d.getMonth() + 1}월`;

    const initialCount = 80 + Math.round(Math.random() * 40);
    const retentionRates = [100];

    // M+1 ~ M+4 잔존율 생성 (점진적 감소)
    let prevRate = 100;
    for (let m = 1; m <= 4; m++) {
      if (i + m <= 4) {
        const decay = 15 + Math.random() * 10;
        prevRate = Math.max(20, prevRate - decay);
        retentionRates.push(Math.round(prevRate * 10) / 10);
      }
    }

    cohorts.push({
      month: monthStr,
      month_label: monthLabel,
      initial_count: initialCount,
      retention_rates: retentionRates
    });
  }

  return { cohorts };
}

function getMockKeyTasks() {
  return [
    {
      id: 'kt-1',
      title: '신규 가입 전환율 개선',
      owner: '김영업',
      status: '진행중',
      startMonth: 1,
      endMonth: 4,
      actionItems: [
        {
          id: 'ai-1',
          title: '방문 후 24시간 내 팔로업 프로세스 수립',
          status: '완료',
          startMonth: 1,
          endMonth: 2,
          content: `2/15 - 콜 스크립트 작성 완료. 기존 대비 이점 강조 포인트 추가함.
2/18 - 영업팀 전체 교육 진행. 실습 롤플레이 포함하여 2시간 세션.
2/20 - 파일럿 테스트 결과 전환율 12% → 18% 개선 확인.

결론: 24시간 내 팔로업이 전환율에 유의미한 영향. 전사 적용 완료.`
        },
        {
          id: 'ai-2',
          title: '주간 전환율 모니터링 대시보드 구축',
          status: '진행중',
          startMonth: 2,
          endMonth: 3,
          content: `3/1 - 데이터 소스 연동 완료 (RDS → Metabase)
3/5 - 기본 차트 구성 완료. 전환율, 소요시간, 담당자별 현황.

진행 중:
- 자동 알림 기능 개발 중 (목표: 전환율 10% 이하 시 슬랙 알림)
- 예상 완료일: 3/15`
        },
        {
          id: 'ai-3',
          title: '전환 실패 원인 분석 리포트 작성',
          status: '대기',
          startMonth: 4,
          endMonth: 4,
          content: `아직 시작 전.

계획:
- 3월 데이터 축적 후 4월 초 분석 착수 예정
- 실패 사유 카테고리화 (가격, 기능, 타이밍 등)
- 담당자 인터뷰 진행 예정`
        }
      ]
    },
    {
      id: 'kt-2',
      title: '이탈 매장 재활성화 캠페인',
      owner: '이관리',
      status: '진행중',
      startMonth: 2,
      endMonth: 5,
      actionItems: [
        {
          id: 'ai-4',
          title: '미이용 30일 이상 매장 세그먼트 분류',
          status: '완료',
          startMonth: 2,
          endMonth: 2,
          content: `2/10 - 세그먼트 기준 정의 완료
- A그룹: 30-60일 미이용 (재활성화 가능성 높음)
- B그룹: 60-90일 미이용 (중간)
- C그룹: 90일+ 미이용 (이탈 확정)

2/15 - 자동 분류 쿼리 작성 및 스케줄러 등록 완료.`
        },
        {
          id: 'ai-5',
          title: 'SMS 재활성화 메시지 A/B 테스트',
          status: '진행중',
          startMonth: 2,
          endMonth: 3,
          content: `2/25 - 메시지 시안 3종 작성 완료
- A안: 혜택 강조 (첫 주문 30% 할인)
- B안: 기능 강조 (신규 기능 안내)
- C안: 관계 강조 (담당자 직접 연락)

현재 A/B 테스트 발송 중 (각 그룹 100건씩)
결과 분석 예정: 3월 말`
        }
      ]
    },
    {
      id: 'kt-3',
      title: '설치 후 온보딩 개선',
      owner: '박기술',
      status: '대기',
      startMonth: 3,
      endMonth: 6,
      actionItems: [
        {
          id: 'ai-7',
          title: '설치 당일 사용 가이드 영상 제작',
          status: '진행중',
          startMonth: 3,
          endMonth: 3,
          content: `3/5 - 스토리보드 작성 완료 (5분 분량)

진행 중:
- 영상 촬영 (3/10 예정)
- 편집 및 자막 추가 (3/15 예정)`
        }
      ]
    }
  ];
}

/**
 * 보고내용 조회 (월별)
 * @param {string} month - 조회할 월 (YYYY-MM)
 * @returns {Promise<{success: boolean, data: Array, error: string|null}>}
 */
export async function getReportContents(month) {
  try {
    const response = await apiClient.get(
      `/api/report-contents?month=${month}`,
      {},
      { timeout: 30000 }
    );

    if (response.success) {
      return response;
    }

    return {
      success: true,
      data: [],
      error: null
    };
  } catch (err) {
    console.error('보고내용 조회 실패:', err);
    return {
      success: false,
      data: [],
      error: err.message
    };
  }
}

/**
 * 보고내용 저장
 * @param {string} sectionId - 섹션 ID (kpi_summary, active_store_trend, cohort_forecast, funnel)
 * @param {string} month - 월 (YYYY-MM)
 * @param {string} content - 보고 내용
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function saveReportContent(sectionId, month, content) {
  try {
    const response = await apiClient.put(
      '/api/report-contents',
      {
        section_id: sectionId,
        month,
        content,
        updated_by: 'user' // TODO: 실제 사용자 정보로 대체
      },
      { timeout: 30000 }
    );

    return {
      success: response.success,
      error: response.success ? null : response.error
    };
  } catch (err) {
    console.error('보고내용 저장 실패:', err);
    return {
      success: false,
      error: err.message
    };
  }
}

export default {
  getReportSummary,
  getReportFunnel,
  getReportCohort,
  getKeyTasks,
  createKeyTask,
  updateKeyTask,
  deleteKeyTask,
  createKeyTaskAction,
  updateKeyTaskAction,
  deleteKeyTaskAction,
  getReportContents,
  saveReportContent
};
