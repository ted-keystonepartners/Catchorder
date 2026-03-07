import React from 'react';
import MainLayout from '../components/Layout/MainLayout.jsx';
import KPISummarySection from '../components/Reports/KPISummarySection.jsx';
import ActiveStoreTrendSection from '../components/Reports/ActiveStoreTrendSection.jsx';
import FunnelSection from '../components/Reports/FunnelSection.jsx';
import CohortForecastSection from '../components/Reports/CohortForecastSection.jsx';
import KeyTaskSection from '../components/Reports/KeyTaskSection.jsx';
import TimelineSection from '../components/Reports/TimelineSection.jsx';

const getDateStr = (offsetDays) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

const ReportsPage = () => {
  // 누적 기간으로 고정
  const reportData = {
    start: '2024-01-01',
    end: getDateStr(0)
  };

  return (
    <MainLayout>
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        {/* Page Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#111827', margin: '0 0 6px 0', letterSpacing: '-0.5px' }}>
            리포트
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
            누적 성과 분석 및 전략 현황
          </p>
        </div>

        {/* Report Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <KPISummarySection dateRange={reportData} />
          <ActiveStoreTrendSection dateRange={reportData} />
          <CohortForecastSection dateRange={reportData} />
          <FunnelSection dateRange={reportData} />
          <KeyTaskSection dateRange={reportData} />
          <TimelineSection dateRange={reportData} />
        </div>
      </div>
    </MainLayout>
  );
};

export default ReportsPage;
