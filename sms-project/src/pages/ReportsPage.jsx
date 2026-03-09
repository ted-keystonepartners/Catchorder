import React, { useState, useRef, useCallback } from 'react';
import MainLayout from '../components/Layout/MainLayout.jsx';
import ExecutiveSummarySection from '../components/Reports/ExecutiveSummarySection.jsx';
import KPISummarySection from '../components/Reports/KPISummarySection.jsx';
import FunnelSection from '../components/Reports/FunnelSection.jsx';
import CohortForecastSection from '../components/Reports/CohortForecastSection.jsx';
import KeyTaskSection from '../components/Reports/KeyTaskSection.jsx';
import PublishReportModal from '../components/Reports/PublishReportModal.jsx';
import { getDashboardOverallStats, getMonthlyFunnel, getReportCohort, getKeyTasks, getReportContents } from '../api/reportsApi.js';
import { apiClient } from '../api/client.js';

const ACCENT = '#FF3D00';

const getDateStr = (offsetDays) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

const ReportsPage = () => {
  const [publishModalOpen, setPublishModalOpen] = useState(false);

  // 누적 기간으로 고정
  const reportData = {
    start: '2024-01-01',
    end: getDateStr(0)
  };

  // 현재 월 계산
  const getCurrentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  // 스냅샷 데이터 수집 함수
  const collectSnapshot = useCallback(async () => {
    try {
      // 트렌드 데이터용 시작일 (최근 90일)
      const trendStartDate = new Date();
      trendStartDate.setDate(trendStartDate.getDate() - 90);
      const trendStart = trendStartDate.toISOString().split('T')[0];

      // 모든 데이터를 병렬로 수집 (트렌드 데이터 포함)
      const [kpiResponse, funnelResponse, cohortResponse, tasksResponse, contentsResponse, trendResponse] = await Promise.all([
        getDashboardOverallStats(),
        getMonthlyFunnel(),
        getReportCohort(reportData.end),
        getKeyTasks(),
        getReportContents(getCurrentMonth()),
        apiClient.get(`/api/stats/daily-usage?start_date=${trendStart}&end_date=${reportData.end}`)
      ]);

      // KPI 데이터 정리
      const kpiData = kpiResponse.data || {};
      const funnel = kpiData.funnel || {};
      const installDetail = kpiData.install_detail?.summary || {};

      // 보고내용 정리
      const contents = contentsResponse.data || [];
      const reportContents = {};
      contents.forEach(item => {
        reportContents[item.section_id] = item.content;
      });

      const snapshot = {
        // KPI 요약
        kpi: {
          registered: funnel.registered || 0,
          installed: funnel.install_completed || 0,
          active: installDetail.active || funnel.active || 0,
          churned: funnel.churned || 0,
          conversion: kpiData.conversion || {}
        },
        // KPI 트렌드 데이터 (일별 이용매장 추이)
        kpi_trend: trendResponse.success ? (trendResponse.data?.daily_usage || []) : [],
        // 퍼널 분석 (현재 월 제외)
        funnel: (() => {
          const funnelData = funnelResponse.data || { monthly: [], cumulative: {} };
          const currentMonth = new Date().toISOString().slice(0, 7);
          const currentMonthNum = new Date().getMonth() + 1;
          const currentYear = new Date().getFullYear();
          const filteredMonthly = (funnelData.monthly || []).filter(item => {
            if (item.month === currentMonth) return false;
            if (item.label === `${currentMonthNum}월` && item.month?.startsWith(String(currentYear))) return false;
            return true;
          });
          return { ...funnelData, monthly: filteredMonthly };
        })(),
        // 코호트 잔존율
        cohort: cohortResponse.data || { cohorts: [] },
        // Key Tasks
        key_tasks: tasksResponse.data?.tasks || [],
        // 보고내용
        report_contents: reportContents,
        // 메타데이터
        snapshot_date: new Date().toISOString(),
        date_range: reportData
      };

      return snapshot;
    } catch (err) {
      console.error('스냅샷 수집 실패:', err);
      throw err;
    }
  }, [reportData]);

  return (
    <MainLayout>
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        {/* Page Header */}
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#111827', margin: '0 0 6px 0', letterSpacing: '-0.5px' }}>
              QR TF 프로젝트 리포트
            </h1>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
              누적 성과 분석 및 전략 현황
            </p>
          </div>
          <button
            onClick={() => setPublishModalOpen(true)}
            style={{
              padding: '10px 20px',
              backgroundColor: ACCENT,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span style={{ fontSize: '16px' }}>📤</span>
            발행하기
          </button>
        </div>

        {/* Report Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <ExecutiveSummarySection />
          <KPISummarySection dateRange={reportData} />
          <CohortForecastSection dateRange={reportData} />
          <FunnelSection dateRange={reportData} />
          <KeyTaskSection dateRange={reportData} />
        </div>
      </div>

      {/* 발행 모달 */}
      <PublishReportModal
        isOpen={publishModalOpen}
        onClose={() => setPublishModalOpen(false)}
        onCollectSnapshot={collectSnapshot}
      />
    </MainLayout>
  );
};

export default ReportsPage;
