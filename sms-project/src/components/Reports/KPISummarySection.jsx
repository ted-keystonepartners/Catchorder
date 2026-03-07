import React, { useState, useEffect } from 'react';
import { getDashboardOverallStats } from '../../api/reportsApi.js';
import { useReportContent } from '../../hooks/useReportContent.js';

const ACCENT = '#FF3D00';

const KPICard = ({ title, value, unit, color, description, loading }) => {
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      flex: 1,
      minWidth: '140px'
    }}>
      <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500', marginBottom: '8px' }}>
        {title}
      </div>
      {loading ? (
        <div style={{ height: '40px', display: 'flex', alignItems: 'center' }}>
          <div style={{
            width: '80px',
            height: '28px',
            backgroundColor: '#f3f4f6',
            borderRadius: '4px',
            animation: 'pulse 1.5s infinite'
          }} />
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <span style={{
            fontSize: '32px',
            fontWeight: '700',
            color: color || '#111827',
            letterSpacing: '-0.5px'
          }}>
            {value}
          </span>
          {unit && (
            <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>{unit}</span>
          )}
        </div>
      )}
      {description && (
        <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '6px' }}>{description}</div>
      )}
    </div>
  );
};

const KPISummarySection = ({ dateRange }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  // useReportContent 훅 사용
  const {
    showReport,
    setShowReport,
    content: reportContent,
    setContent: setReportContent,
    isEditing,
    setIsEditing,
    save: saveReportContent,
    loading: reportLoading
  } = useReportContent('kpi_summary');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await getDashboardOverallStats();
        if (response.success) {
          setData(response.data);
        }
      } catch (err) {
        console.error('KPI 데이터 조회 실패:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateRange]);

  const funnel = data?.funnel || {};
  const installDetail = data?.install_detail?.summary || {};
  const conversion = data?.conversion || {};

  // 이용매장: 최근 30일 내 주문 발생 (install_detail.summary.active + active_not_completed)
  const activeStores = (installDetail.active || 0) + (installDetail.active_not_completed || 0);
  // 미이용매장: 설치했지만 최근 주문 없음
  const inactiveStores = installDetail.inactive || 0;

  const kpis = [
    {
      title: '전체매장',
      value: funnel.registered?.toLocaleString() || '-',
      unit: '개',
      color: '#111827',
      description: '총 가입 매장 수'
    },
    {
      title: '설치매장',
      value: funnel.install_completed?.toLocaleString() || '-',
      unit: '개',
      color: '#FF6B00',
      description: '설치 완료 매장'
    },
    {
      title: '이용매장',
      value: activeStores > 0 ? activeStores.toLocaleString() : (funnel.active?.toLocaleString() || '-'),
      unit: '개',
      color: '#3B82F6',
      description: '최근 30일 내 주문 발생'
    },
    {
      title: '해지/보류',
      value: funnel.churned?.toLocaleString() || '-',
      unit: '개',
      color: '#EF4444',
      description: `해지율 ${conversion.churn_rate || 0}%`
    }
  ];

  const generateAISummary = () => {
    if (!data) return '데이터를 불러오는 중입니다...';

    const registered = funnel.registered || 0;
    const installed = funnel.install_completed || 0;
    const active = activeStores > 0 ? activeStores : (funnel.active || 0);
    const churned = funnel.churned || 0;

    const installRate = registered > 0 ? ((installed / registered) * 100).toFixed(1) : 0;
    const usageRate = installed > 0 ? ((active / installed) * 100).toFixed(1) : 0;

    let summaryParts = [];
    summaryParts.push(`전체 ${registered}개 매장 중 ${installed}개가 설치를 완료하여 설치율 ${installRate}%를 기록하고 있습니다.`);
    summaryParts.push(`최근 30일 기준 ${active}개 매장이 실제 서비스를 이용 중이며 이용전환율은 ${usageRate}%입니다.`);

    if (inactiveStores > 0) {
      summaryParts.push(`설치 후 미이용 매장 ${inactiveStores}개에 대한 활성화 전략이 필요합니다.`);
    }

    if (churned > 0) {
      summaryParts.push(`해지/보류 매장 ${churned}개에 대한 원인 분석 및 재활성화 방안 검토가 필요합니다.`);
    }

    return summaryParts.join(' ');
  };

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: '0 0 4px 0' }}>
            KPI 요약
          </h2>
          <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0 }}>
            핵심 성과 지표 현황
          </p>
        </div>
        <button
          onClick={() => { setShowReport(!showReport); if (!showReport) setIsEditing(true); }}
          style={{
            padding: '8px 14px',
            backgroundColor: ACCENT,
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          + 작성
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
        marginBottom: '20px'
      }}>
        {kpis.map((kpi) => (
          <KPICard key={kpi.title} {...kpi} loading={loading} />
        ))}
      </div>

      {/* 보고내용 */}
      {showReport && (
        <div style={{
          backgroundColor: '#fafafa',
          border: '1px solid #f3f4f6',
          borderLeft: `3px solid ${ACCENT}`,
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '20px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '8px'
          }}>
            <span style={{ fontSize: '14px' }}>📝</span>
            <span style={{ fontSize: '13px', fontWeight: '600', color: ACCENT }}>보고내용</span>
          </div>
          {isEditing ? (
            <div>
              <textarea
                value={reportContent}
                onChange={(e) => setReportContent(e.target.value)}
                placeholder="보고 내용을 입력해주세요..."
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '12px',
                  fontSize: '14px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  lineHeight: '1.6'
                }}
              />
              <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                <button
                  onClick={async () => {
                    const success = await saveReportContent();
                    if (!success) {
                      // 저장 실패 시 편집 모드 유지
                    }
                  }}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: ACCENT,
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  저장
                </button>
                <button
                  onClick={() => { setShowReport(false); setIsEditing(false); }}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#e5e7eb',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p style={{
                fontSize: '14px',
                color: '#374151',
                lineHeight: '1.7',
                margin: 0,
                whiteSpace: 'pre-wrap'
              }}>
                {reportContent || '내용을 입력해주세요.'}
              </p>
              <button
                onClick={() => setIsEditing(true)}
                style={{
                  marginTop: '8px',
                  padding: '5px 10px',
                  backgroundColor: 'transparent',
                  color: ACCENT,
                  border: `1px solid ${ACCENT}`,
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                수정
              </button>
            </div>
          )}
        </div>
      )}

      {/* AI Summary */}
      <div style={{
        backgroundColor: '#fafafa',
        border: '1px solid #f3f4f6',
        borderLeft: `3px solid ${ACCENT}`,
        borderRadius: '8px',
        padding: '16px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginBottom: '8px'
        }}>
          <span style={{ fontSize: '14px' }}>✨</span>
          <span style={{ fontSize: '13px', fontWeight: '600', color: ACCENT }}>AI 요약</span>
        </div>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ width: '100%', height: '16px', backgroundColor: '#f3f4f6', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
            <div style={{ width: '80%', height: '16px', backgroundColor: '#f3f4f6', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
          </div>
        ) : (
          <p style={{
            fontSize: '14px',
            color: '#374151',
            lineHeight: '1.7',
            margin: 0
          }}>
            {generateAISummary()}
          </p>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default KPISummarySection;
