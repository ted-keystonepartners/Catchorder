import React, { useState, useCallback, useEffect, Fragment } from 'react';
import { apiClient } from '../../api/client.js';

const getRetentionColor = (rate) => {
  if (rate >= 90) return '#dcfce7';
  if (rate >= 70) return '#fef9c3';
  if (rate >= 50) return '#fed7aa';
  if (rate >= 30) return '#fecaca';
  return '#fee2e2';
};

const WeeklyCohortSection = () => {
  const [cohortRetentionData, setCohortRetentionData] = useState([]);
  const [cohortRetentionLoading, setCohortRetentionLoading] = useState(false);
  const [expandedCohortWeek, setExpandedCohortWeek] = useState(null);
  const [cohortDetailData, setCohortDetailData] = useState(null);
  const [cohortDetailLoading, setCohortDetailLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // 주간 코호트 잔존율 데이터 로드
  const fetchWeeklyCohort = useCallback(async () => {
    if (loaded) return;
    setCohortRetentionLoading(true);
    try {
      const response = await apiClient.get('/api/dashboard?view=weekly_cohort&start_date=2024-12-15', {}, { timeout: 60000 });
      if (response.success && response.data?.cohorts) {
        setCohortRetentionData(response.data.cohorts);
      }
    } catch (err) {
      console.error('주간 코호트 데이터 조회 실패:', err);
    } finally {
      setCohortRetentionLoading(false);
      setLoaded(true);
    }
  }, [loaded]);

  // 마운트 시 데이터 로드
  useEffect(() => {
    fetchWeeklyCohort();
  }, [fetchWeeklyCohort]);

  // 주간 코호트 상세 데이터 fetch
  const fetchCohortDetail = async (weekKey) => {
    if (expandedCohortWeek === weekKey) {
      setExpandedCohortWeek(null);
      setCohortDetailData(null);
      return;
    }

    setExpandedCohortWeek(weekKey);
    setCohortDetailLoading(true);
    setCohortDetailData(null);

    try {
      const response = await apiClient.get(`/api/dashboard?view=weekly_cohort_detail&week_key=${weekKey}`, {}, { timeout: 60000 });
      if (response.success) {
        setCohortDetailData(response.data);
      }
    } catch (err) {
      console.error('주간 코호트 상세 조회 실패:', err);
    } finally {
      setCohortDetailLoading(false);
    }
  };

  if (cohortRetentionLoading) {
    return (
      <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#6b7280' }}>주간 코호트 데이터 로딩 중...</span>
      </div>
    );
  }

  if (cohortRetentionData.length === 0) {
    return (
      <div style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#6b7280' }}>데이터가 없습니다</span>
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ marginBottom: '8px', fontSize: '12px', color: '#6b7280', textAlign: 'right' }}>
        * 해당 주차에 주문 1건 이상 발생한 매장
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr>
            <th style={{
              padding: '10px 12px',
              textAlign: 'left',
              fontWeight: '600',
              color: '#374151',
              backgroundColor: '#f9fafb',
              borderBottom: '2px solid #e5e7eb',
              position: 'sticky',
              left: 0,
              minWidth: '100px'
            }}>
              설치 주차
            </th>
            <th style={{
              padding: '10px 12px',
              textAlign: 'center',
              fontWeight: '600',
              color: '#374151',
              backgroundColor: '#fff5f3',
              borderBottom: '2px solid #e5e7eb',
              minWidth: '80px'
            }}>
              설치매장
            </th>
            {cohortRetentionData[0]?.weeks?.map((_, idx) => (
              <th key={`week-header-${idx}`} style={{
                padding: '10px 12px',
                textAlign: 'center',
                fontWeight: '600',
                color: '#374151',
                backgroundColor: '#f9fafb',
                borderBottom: '2px solid #e5e7eb',
                minWidth: '90px'
              }}>
                Week {idx}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cohortRetentionData.map((row) => (
            <Fragment key={row.weekKey}>
              <tr
                onClick={() => fetchCohortDetail(row.weekKey)}
                style={{ cursor: 'pointer' }}
              >
                <td style={{
                  padding: '10px 12px',
                  fontWeight: '500',
                  color: '#111827',
                  backgroundColor: expandedCohortWeek === row.weekKey ? '#eff6ff' : 'white',
                  borderBottom: '1px solid #e5e7eb',
                  position: 'sticky',
                  left: 0
                }}>
                  {expandedCohortWeek === row.weekKey ? '▼ ' : '▶ '}{row.label}
                </td>
                <td style={{
                  padding: '10px 12px',
                  textAlign: 'center',
                  backgroundColor: '#fff5f3',
                  borderBottom: '1px solid #e5e7eb',
                  fontWeight: '600',
                  color: '#9a3412'
                }}>
                  {row.installed}
                </td>
                {row.weeks.map((week, weekIdx) => (
                  <td key={`${row.weekKey}-w${weekIdx}`} style={{
                    padding: '10px 12px',
                    textAlign: 'center',
                    backgroundColor: getRetentionColor(week.rate),
                    borderBottom: '1px solid #e5e7eb',
                    fontWeight: week.rate >= 70 ? '600' : '400',
                    color: week.rate >= 50 ? '#166534' : '#991b1b'
                  }}>
                    {week.count} ({week.rate}%)
                  </td>
                ))}
                {/* 미래 주차는 빈 셀 */}
                {Array.from({ length: Math.max(0, (cohortRetentionData[0]?.weeks?.length || 0) - row.weeks.length) }).map((_, emptyIdx) => (
                  <td key={`${row.weekKey}-empty-${emptyIdx}`} style={{
                    padding: '10px 12px',
                    textAlign: 'center',
                    backgroundColor: '#f9fafb',
                    borderBottom: '1px solid #e5e7eb',
                    color: '#d1d5db'
                  }}>
                    -
                  </td>
                ))}
              </tr>
              {/* 상세 행 */}
              {expandedCohortWeek === row.weekKey && cohortDetailLoading && (
                <tr>
                  <td colSpan={2 + (cohortRetentionData[0]?.weeks?.length || 0)} style={{ padding: '12px', textAlign: 'center', backgroundColor: '#f8fafc', color: '#6b7280' }}>
                    상세 데이터 로딩 중...
                  </td>
                </tr>
              )}
              {expandedCohortWeek === row.weekKey && !cohortDetailLoading && cohortDetailData?.stores?.map((store) => {
                const maxWeeksCount = cohortRetentionData[0]?.weeks?.length || 0;
                return (
                  <tr key={`detail-${store.store_id}`} style={{ backgroundColor: '#f8fafc' }}>
                    <td style={{
                      padding: '8px 12px',
                      paddingLeft: '24px',
                      fontWeight: '400',
                      color: '#374151',
                      backgroundColor: '#f8fafc',
                      borderBottom: '1px solid #e5e7eb',
                      position: 'sticky',
                      left: 0,
                      fontSize: '13px'
                    }}>
                      {store.store_name}
                    </td>
                    <td style={{
                      padding: '8px 12px',
                      textAlign: 'center',
                      backgroundColor: '#fef5f3',
                      borderBottom: '1px solid #e5e7eb',
                      fontSize: '12px',
                      color: '#9a3412'
                    }}>
                      {store.install_date ? store.install_date.slice(5).replace('-', '/') : ''}
                    </td>
                    {Array.from({ length: maxWeeksCount }).map((_, weekIdx) => {
                      const weekData = store.weeks?.[weekIdx];
                      const value = weekData?.value || '-';
                      const isHold = value === '보류';
                      const isChurn = value === '해지';
                      const isDash = value === '-';
                      const isZero = value === '0건';
                      return (
                        <td key={`${store.store_id}-w${weekIdx}`} style={{
                          padding: '8px 12px',
                          textAlign: 'center',
                          backgroundColor: isHold ? '#fef3c7' : isChurn ? '#fee2e2' : isDash ? '#f8fafc' : isZero ? '#fef2f2' : '#ecfdf5',
                          borderBottom: '1px solid #e5e7eb',
                          color: isHold ? '#92400e' : isChurn ? '#991b1b' : isDash ? '#d1d5db' : isZero ? '#ef4444' : '#166534',
                          fontWeight: isHold || isChurn ? '600' : '400',
                          fontSize: '13px'
                        }}>
                          {value}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default WeeklyCohortSection;
