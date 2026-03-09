import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getSharedReport } from '../api/reportsApi.js';

const ACCENT = '#FF3D00';

// 잔존율 색상 함수 (원본 CohortForecastSection과 동일)
const getRetentionColor = (value) => {
  if (value === null || value === undefined) return { bg: '#f9fafb', text: '#d1d5db' };
  if (value >= 85) return { bg: '#dcfce7', text: '#15803d' };
  if (value >= 75) return { bg: '#d1fae5', text: '#065f46' };
  if (value >= 65) return { bg: '#fef9c3', text: '#854d0e' };
  if (value >= 55) return { bg: '#ffedd5', text: '#9a3412' };
  return { bg: '#fee2e2', text: '#991b1b' };
};

// 코호트 데이터 변환 함수 (이전설치 오프셋 로직 포함)
const transformCohortData = (cohorts) => {
  return (cohorts || []).map(row => {
    // M+0 ~ M+4 초기화
    let retention = [null, null, null, null, null];

    if (row.months) {
      for (const m of row.months) {
        const offset = m.monthOffset;
        const cellData = { rate: m.rate, count: m.count };
        // 이전설치(0000-00)는 M+0 비우고 M+1부터 표시
        if (row.monthKey === '0000-00') {
          if (offset >= 0 && offset + 1 <= 4) {
            retention[offset + 1] = cellData;
          }
        } else {
          if (offset >= 0 && offset <= 4) {
            retention[offset] = cellData;
          }
        }
      }
    }

    return {
      month: row.label || row.month || row.month_label,
      monthKey: row.monthKey,
      installs: row.installed || row.initial_count || row.installs || 0,
      retention
    };
  });
};

// KPI 카드 컴포넌트 (읽기 전용)
const KPICard = ({ title, value, unit, color, description }) => (
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
    {description && (
      <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '6px' }}>{description}</div>
    )}
  </div>
);

// 상태 스타일
const getStatusStyle = (status) => {
  if (status === '완료') return { color: '#16a34a', backgroundColor: '#f0fdf4' };
  if (status === '진행중') return { color: '#ea580c', backgroundColor: '#fff7ed' };
  return { color: '#6b7280', backgroundColor: '#f3f4f6' };
};

const SharedReportPage = () => {
  const { shareToken } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedTasks, setExpandedTasks] = useState({});
  const [expandedActions, setExpandedActions] = useState({});

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      try {
        const response = await getSharedReport(shareToken);
        if (response.success) {
          setReport(response.data);
          // 모든 태스크/액션 펼치기
          const snapshot = response.data.snapshot || {};
          const tasks = snapshot.key_tasks || [];
          const allTasksExpanded = {};
          const allActionsExpanded = {};
          tasks.forEach(task => {
            allTasksExpanded[task.id] = true;
            task.actionItems?.forEach(action => {
              allActionsExpanded[action.id] = true;
            });
          });
          setExpandedTasks(allTasksExpanded);
          setExpandedActions(allActionsExpanded);
        } else {
          setError(response.error || '리포트를 불러올 수 없습니다.');
        }
      } catch (err) {
        setError('리포트를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    if (shareToken) {
      fetchReport();
    }
  }, [shareToken]);

  const toggleTask = (taskId) => {
    setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const toggleAction = (actionId) => {
    setExpandedActions(prev => ({ ...prev, [actionId]: !prev[actionId] }));
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#fafafa',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #f3f4f6',
            borderTop: '3px solid #FF3D00',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ color: '#6b7280' }}>리포트 로딩 중...</p>
          <style>{`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#fafafa',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>404</div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
            리포트를 찾을 수 없습니다
          </h2>
          <p style={{ color: '#6b7280' }}>{error}</p>
        </div>
      </div>
    );
  }

  const snapshot = report?.snapshot || {};
  const kpi = snapshot.kpi || {};
  const kpiTrend = snapshot.kpi_trend || [];
  const funnel = snapshot.funnel || {};
  const cohort = snapshot.cohort || {};
  const keyTasks = snapshot.key_tasks || [];
  const reportContents = snapshot.report_contents || {};

  // Y축 도메인 계산 (KPI 트렌드 차트용)
  const getYDomain = () => {
    if (kpiTrend.length === 0) return [0, 100];
    const activeValues = kpiTrend.map(d => d.active || 0);
    const min = Math.min(...activeValues);
    const max = Math.max(...activeValues);
    const padding = Math.ceil((max - min) * 0.1) || 5;
    return [Math.max(0, min - padding), max + padding];
  };

  // 퍼널 차트 데이터 계산
  const funnelChartData = (funnel.monthly || []).map(item => ({
    label: item.label,
    installRate: item.registered > 0 ? ((item.installed / item.registered) * 100).toFixed(1) : 0,
    activeRate: item.installed > 0 ? ((item.active / item.installed) * 100).toFixed(1) : 0
  }));

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fafafa' }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '16px 24px'
      }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            <span style={{
              padding: '4px 8px',
              backgroundColor: '#f0fdf4',
              color: '#16a34a',
              fontSize: '11px',
              fontWeight: '600',
              borderRadius: '4px'
            }}>
              발행됨
            </span>
            <span style={{ fontSize: '12px', color: '#9ca3af' }}>
              {formatDate(report.published_at)}
            </span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#111827', margin: 0 }}>
            {report.title}
          </h1>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* KPI 요약 섹션 */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: '0 0 4px 0' }}>
                KPI 요약
              </h2>
              <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0 }}>
                핵심 성과 지표 현황
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
              <KPICard title="전체매장" value={kpi.registered?.toLocaleString() || '-'} unit="개" color="#111827" />
              <KPICard title="설치매장" value={kpi.installed?.toLocaleString() || '-'} unit="개" color="#FF6B00" />
              <KPICard title="이용매장" value={kpi.active?.toLocaleString() || '-'} unit="개" color="#3B82F6" />
              <KPICard title="해지" value={kpi.churned?.toLocaleString() || '-'} unit="개" color="#EF4444" />
            </div>

            {/* 이용매장 추이 차트 */}
            {kpiTrend.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={kpiTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return `${date.getMonth() + 1}/${date.getDate()}`;
                      }}
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                      axisLine={{ stroke: '#e5e7eb' }}
                      tickLine={{ stroke: '#e5e7eb' }}
                    />
                    <YAxis
                      domain={getYDomain()}
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                      axisLine={{ stroke: '#e5e7eb' }}
                      tickLine={{ stroke: '#e5e7eb' }}
                      width={40}
                    />
                    <Tooltip
                      labelFormatter={(value) => {
                        const date = new Date(value);
                        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                      }}
                      formatter={(value) => [`${value}개`, '이용매장']}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="active"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      dot={{ r: 2, fill: '#3B82F6' }}
                      activeDot={{ r: 4, fill: '#3B82F6' }}
                      name="이용매장"
                    />
                  </LineChart>
                </ResponsiveContainer>
                {/* 범례 */}
                <div style={{
                  marginTop: '12px',
                  padding: '10px 16px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#6b7280',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{
                    display: 'inline-block',
                    width: '12px',
                    height: '3px',
                    backgroundColor: '#3B82F6',
                    borderRadius: '2px'
                  }} />
                  <span>일별 이용매장 수 (최근 30일 내 주문 발생 매장)</span>
                </div>
              </div>
            )}

            {reportContents.kpi_summary && (
              <div style={{
                backgroundColor: '#fafafa',
                border: '1px solid #f3f4f6',
                borderLeft: `3px solid ${ACCENT}`,
                borderRadius: '8px',
                padding: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px' }}>📝</span>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: ACCENT }}>보고내용</span>
                </div>
                <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.7', margin: 0, whiteSpace: 'pre-wrap' }}>
                  {reportContents.kpi_summary}
                </p>
              </div>
            )}
          </div>

          {/* 코호트 예측 섹션 */}
          {cohort.cohorts && cohort.cohorts.length > 0 && (() => {
            const cohortData = transformCohortData(cohort.cohorts);
            return (
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <div style={{ marginBottom: '20px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: '0 0 4px 0' }}>
                    코호트 잔존율
                  </h2>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                    월별 설치 코호트의 이용 잔존율 (설치월 기준)
                  </p>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f9fafb' }}>
                        <th style={{
                          width: '15%',
                          padding: '12px 16px',
                          textAlign: 'left',
                          fontWeight: '600',
                          color: '#374151',
                          borderBottom: '2px solid #e5e7eb',
                          whiteSpace: 'nowrap'
                        }}>
                          설치월
                        </th>
                        <th style={{
                          width: '12%',
                          padding: '12px 16px',
                          textAlign: 'center',
                          fontWeight: '600',
                          color: '#111827',
                          backgroundColor: '#fff5f3',
                          borderBottom: '2px solid #e5e7eb',
                          whiteSpace: 'nowrap'
                        }}>
                          설치수
                        </th>
                        {[0, 1, 2, 3, 4].map(m => (
                          <th key={m} style={{
                            width: '14.6%',
                            padding: '12px 16px',
                            textAlign: 'center',
                            fontWeight: '600',
                            color: '#374151',
                            borderBottom: '2px solid #e5e7eb',
                            whiteSpace: 'nowrap'
                          }}>
                            M+{m}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {cohortData.map((row) => (
                        <tr key={row.month}>
                          <td style={{
                            padding: '14px 16px',
                            fontWeight: '600',
                            color: '#111827',
                            borderBottom: '1px solid #f3f4f6',
                            backgroundColor: '#fafafa',
                            whiteSpace: 'nowrap'
                          }}>
                            {row.month}
                          </td>
                          <td style={{
                            padding: '14px 16px',
                            textAlign: 'center',
                            color: '#111827',
                            backgroundColor: '#fff5f3',
                            borderBottom: '1px solid #f3f4f6'
                          }}>
                            {row.installs.toLocaleString()}
                          </td>
                          {[0, 1, 2, 3, 4].map((ci) => {
                            const cellData = row.retention[ci];
                            const rate = cellData?.rate;
                            const { bg, text } = getRetentionColor(rate);
                            return (
                              <td key={ci} style={{
                                padding: '14px 16px',
                                textAlign: 'center',
                                borderBottom: '1px solid #f3f4f6'
                              }}>
                                {cellData !== null && rate !== null && rate !== undefined ? (
                                  <span style={{
                                    display: 'inline-block',
                                    backgroundColor: bg,
                                    color: text,
                                    fontWeight: '600',
                                    fontSize: '13px',
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    minWidth: '48px'
                                  }}>
                                    {typeof rate === 'number' ? rate.toFixed(0) : rate}%
                                  </span>
                                ) : (
                                  <span style={{ color: '#d1d5db' }}>-</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* 범례 */}
                  <div style={{
                    marginTop: '16px',
                    padding: '12px 16px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#6b7280',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px',
                    flexWrap: 'wrap'
                  }}>
                    <strong style={{ color: '#374151' }}>잔존율:</strong>
                    {[
                      { label: '85%+', bg: '#dcfce7', text: '#15803d' },
                      { label: '75-85%', bg: '#d1fae5', text: '#065f46' },
                      { label: '65-75%', bg: '#fef9c3', text: '#854d0e' },
                      { label: '55-65%', bg: '#ffedd5', text: '#9a3412' },
                      { label: '55% 미만', bg: '#fee2e2', text: '#991b1b' },
                    ].map(({ label, bg, text }) => (
                      <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          display: 'inline-block',
                          width: '14px',
                          height: '14px',
                          borderRadius: '4px',
                          backgroundColor: bg,
                          border: `1px solid ${text}33`
                        }} />
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
                {reportContents.cohort_forecast && (
                  <div style={{
                    backgroundColor: '#fafafa',
                    border: '1px solid #f3f4f6',
                    borderLeft: `3px solid ${ACCENT}`,
                    borderRadius: '8px',
                    padding: '16px',
                    marginTop: '20px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '14px' }}>📝</span>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: ACCENT }}>보고내용</span>
                    </div>
                    <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.7', margin: 0, whiteSpace: 'pre-wrap' }}>
                      {reportContents.cohort_forecast}
                    </p>
                  </div>
                )}
              </div>
            );
          })()}

          {/* 퍼널 분석 섹션 */}
          {funnel.monthly && funnel.monthly.length > 0 && (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: '0 0 4px 0' }}>
                  퍼널 분석
                </h2>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                  해당 월에 가입한 매장의 <strong>전체 기간 이용 이력</strong> 기준 분류
                </p>
              </div>
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                {/* 왼쪽: 테이블 */}
                <div style={{ flex: '1 1 50%', minWidth: '320px', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f9fafb' }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb', whiteSpace: 'nowrap' }}>구분</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600', color: '#111827', backgroundColor: '#fff5f3', borderBottom: '2px solid #e5e7eb', whiteSpace: 'nowrap' }}>누적</th>
                        {funnel.monthly.map(item => (
                          <th key={item.month} style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb', whiteSpace: 'nowrap' }}>
                            {item.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {['신규가입', '설치완료', '이용', '해지', '보류'].map((rowName, rowIdx) => {
                        const keys = ['registered', 'installed', 'active', 'churned', 'hold'];
                        const key = keys[rowIdx];
                        return (
                          <tr key={rowName}>
                            <td style={{ padding: '14px 16px', fontWeight: '600', color: '#111827', backgroundColor: '#fafafa', borderBottom: '1px solid #f3f4f6' }}>{rowName}</td>
                            <td style={{ padding: '14px 16px', textAlign: 'center', color: '#111827', backgroundColor: '#fff5f3', borderBottom: '1px solid #f3f4f6' }}>
                              {(funnel.cumulative?.[key] || 0).toLocaleString()}
                            </td>
                            {funnel.monthly.map(item => (
                              <td key={`${rowName}-${item.month}`} style={{ padding: '14px 16px', textAlign: 'center', color: '#374151', borderBottom: '1px solid #f3f4f6' }}>
                                {(item[key] || 0).toLocaleString()}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* 오른쪽: 월별 추이 막대 그래프 */}
                <div style={{
                  flex: '1 1 320px',
                  minWidth: '320px',
                  padding: '20px 24px',
                  backgroundColor: '#fafafa',
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  {/* 범례 */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '16px',
                    marginBottom: '16px',
                    fontSize: '12px'
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#374151' }}>
                      <span style={{
                        width: '12px',
                        height: '12px',
                        backgroundColor: '#FF6B00',
                        borderRadius: '3px'
                      }} />
                      설치율
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#374151' }}>
                      <span style={{
                        width: '12px',
                        height: '12px',
                        backgroundColor: '#3B82F6',
                        borderRadius: '3px'
                      }} />
                      이용률
                    </span>
                  </div>

                  {/* 차트 영역 */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {/* 막대 그래프 */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-end',
                      height: '220px',
                      borderBottom: '1px solid #e5e7eb',
                      paddingBottom: '8px'
                    }}>
                      {funnelChartData.map((item, idx) => (
                        <div key={idx} style={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          height: '100%',
                          justifyContent: 'flex-end'
                        }}>
                          {/* 막대 그룹 */}
                          <div style={{
                            display: 'flex',
                            gap: '6px',
                            alignItems: 'flex-end'
                          }}>
                            {/* 설치율 막대 */}
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center'
                            }}>
                              <span style={{
                                fontSize: '12px',
                                fontWeight: '600',
                                color: '#FF6B00',
                                marginBottom: '6px'
                              }}>
                                {Math.round(item.installRate)}%
                              </span>
                              <div style={{
                                width: '28px',
                                height: `${Math.max(item.installRate * 1.8, 6)}px`,
                                backgroundColor: '#FF6B00',
                                borderRadius: '4px 4px 0 0',
                                transition: 'height 0.3s ease'
                              }} />
                            </div>
                            {/* 이용률 막대 */}
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center'
                            }}>
                              <span style={{
                                fontSize: '12px',
                                fontWeight: '600',
                                color: '#3B82F6',
                                marginBottom: '6px'
                              }}>
                                {Math.round(item.activeRate)}%
                              </span>
                              <div style={{
                                width: '28px',
                                height: `${Math.max(item.activeRate * 1.8, 6)}px`,
                                backgroundColor: '#3B82F6',
                                borderRadius: '4px 4px 0 0',
                                transition: 'height 0.3s ease'
                              }} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* X축 라벨 */}
                    <div style={{
                      display: 'flex',
                      marginTop: '10px'
                    }}>
                      {funnelChartData.map((item, idx) => (
                        <div key={idx} style={{
                          flex: 1,
                          textAlign: 'center',
                          fontSize: '13px',
                          fontWeight: '500',
                          color: '#374151'
                        }}>
                          {item.label.replace('이전 설치', '이전').replace(' 설치', '')}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              {reportContents.funnel && (
                <div style={{
                  backgroundColor: '#fafafa',
                  border: '1px solid #f3f4f6',
                  borderLeft: `3px solid ${ACCENT}`,
                  borderRadius: '8px',
                  padding: '16px',
                  marginTop: '20px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '14px' }}>📝</span>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: ACCENT }}>보고내용</span>
                  </div>
                  <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.7', margin: 0, whiteSpace: 'pre-wrap' }}>
                    {reportContents.funnel}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Key Task 현황 섹션 */}
          {keyTasks.length > 0 && (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: '0 0 20px 0' }}>
                Key Task 현황
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {keyTasks.map(task => (
                  <div key={task.id} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                    {/* Task Header */}
                    <div
                      onClick={() => toggleTask(task.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 16px',
                        backgroundColor: expandedTasks[task.id] ? '#fafafa' : 'white',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                        <span style={{
                          fontSize: '12px',
                          color: '#9ca3af',
                          transform: expandedTasks[task.id] ? 'rotate(90deg)' : 'rotate(0deg)',
                          transition: 'transform 0.15s'
                        }}>▶</span>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>{task.title}</span>
                        <span style={{ fontSize: '12px', color: '#9ca3af' }}>· {task.owner}</span>
                      </div>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500',
                        ...getStatusStyle(task.status)
                      }}>{task.status}</span>
                    </div>

                    {/* Action Items */}
                    {expandedTasks[task.id] && task.actionItems?.length > 0 && (
                      <div style={{ borderTop: '1px solid #e5e7eb' }}>
                        {task.actionItems.map((action, idx) => (
                          <div key={action.id} style={{ borderTop: idx > 0 ? '1px solid #f3f4f6' : 'none' }}>
                            <div
                              onClick={() => toggleAction(action.id)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '12px 16px 12px 40px',
                                backgroundColor: expandedActions[action.id] ? '#f9fafb' : '#fafafa',
                                cursor: 'pointer'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                <span style={{
                                  fontSize: '10px',
                                  color: '#9ca3af',
                                  transform: expandedActions[action.id] ? 'rotate(90deg)' : 'rotate(0deg)',
                                  transition: 'transform 0.15s'
                                }}>▶</span>
                                <span style={{ fontSize: '13px', color: '#374151' }}>{action.title}</span>
                              </div>
                              <span style={{
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '500',
                                ...getStatusStyle(action.status)
                              }}>{action.status}</span>
                            </div>
                            {expandedActions[action.id] && action.content && (
                              <div style={{ padding: '12px 16px 16px 56px', backgroundColor: '#f9fafb' }}>
                                <div style={{
                                  padding: '12px',
                                  backgroundColor: 'white',
                                  border: '1px solid #e5e7eb',
                                  borderRadius: '6px',
                                  fontSize: '13px',
                                  lineHeight: '1.7',
                                  color: '#374151',
                                  whiteSpace: 'pre-wrap'
                                }}>
                                  {action.content}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{
          marginTop: '40px',
          padding: '20px',
          textAlign: 'center',
          color: '#9ca3af',
          fontSize: '12px'
        }}>
          캐치오더 관리시스템 · 발행된 리포트
        </div>
      </div>
    </div>
  );
};

export default SharedReportPage;
