import React, { useState, useEffect } from 'react';
import { getReportCohort } from '../../api/reportsApi.js';
import { useReportContent } from '../../hooks/useReportContent.js';
import WeeklyCohortSection from './WeeklyCohortSection.jsx';

const ACCENT = '#FF3D00';

const getRetentionColor = (value) => {
  if (value === null || value === undefined) return { bg: '#f9fafb', text: '#d1d5db' };
  if (value >= 85) return { bg: '#dcfce7', text: '#15803d' };
  if (value >= 75) return { bg: '#d1fae5', text: '#065f46' };
  if (value >= 65) return { bg: '#fef9c3', text: '#854d0e' };
  if (value >= 55) return { bg: '#ffedd5', text: '#9a3412' };
  return { bg: '#fee2e2', text: '#991b1b' };
};

const LoadingSkeleton = () => (
  <div style={{
    width: '100%',
    height: '200px',
    backgroundColor: '#f3f4f6',
    borderRadius: '8px',
    animation: 'pulse 1.5s infinite'
  }} />
);

const WeeklyCohortAccordion = () => {
  const [showWeekly, setShowWeekly] = useState(false);

  return (
    <div style={{
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      overflow: 'hidden',
      marginTop: '20px'
    }}>
      <div
        onClick={() => setShowWeekly(!showWeekly)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          backgroundColor: showWeekly ? '#fafafa' : 'white',
          cursor: 'pointer'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            fontSize: '12px',
            color: '#9ca3af',
            transform: showWeekly ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s'
          }}>
            ▶
          </span>
          <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>
            📊 주간 코호트 잔존율
          </span>
        </div>
        {!showWeekly && (
          <span style={{ fontSize: '12px', color: '#9ca3af' }}>클릭하여 펼치기</span>
        )}
      </div>
      {showWeekly && (
        <div style={{ borderTop: '1px solid #e5e7eb', padding: '16px', backgroundColor: '#fafafa' }}>
          <WeeklyCohortSection />
        </div>
      )}
    </div>
  );
};

const CohortForecastSection = ({ dateRange }) => {
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
  } = useReportContent('cohort_forecast');

  useEffect(() => {
    if (!dateRange?.end) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await getReportCohort(dateRange.end);
        if (response.success) {
          setData(response.data);
        }
      } catch (err) {
        console.error('코호트 데이터 조회 실패:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateRange]);

  // 코호트 데이터 변환 (API 필드명에 맞게)
  const cohortData = (data?.cohorts || []).map(row => {
    // monthOffset 정보를 활용해 정확한 열 위치에 배치
    // { rate, count } 객체로 저장
    let retention = [null, null, null, null, null]; // M+0 ~ M+4 초기화

    if (row.months) {
      for (const m of row.months) {
        const offset = m.monthOffset;
        const cellData = { rate: m.rate, count: m.count };
        // 이전설치(0000-00)는 11월 기준이므로 M+0(11월) 비우고 M+1(12월)부터 표시
        // offset+1 위치에 배치하여 한 칸씩 오른쪽으로 밀기
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
    } else {
      // fallback: 기존 방식
      const rates = row.retention_rates || row.retention || [];
      for (let i = 0; i < Math.min(rates.length, 5); i++) {
        retention[i] = { rate: rates[i], count: null };
      }
    }

    return {
      month: row.label || row.month || row.month_label,
      monthKey: row.monthKey,
      installs: row.installed || row.initial_count || row.installs || 0,
      retention
    };
  });

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: '0 0 4px 0' }}>
          월간 잔존율 코호트
        </h2>
        <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
          월별 설치 코호트의 이용 잔존율 (설치월 기준)
        </p>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : cohortData.length > 0 ? (
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
      ) : (
        <div style={{
          padding: '60px',
          textAlign: 'center',
          color: '#9ca3af'
        }}>
          코호트 데이터가 없습니다
        </div>
      )}

      {/* 주간 코호트 잔존율 아코디언 */}
      <WeeklyCohortAccordion />

      {/* 보고내용 아코디언 */}
      <div style={{
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        overflow: 'hidden',
        marginTop: '20px'
      }}>
        {/* 아코디언 헤더 */}
        <div
          onClick={() => setShowReport(!showReport)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            backgroundColor: showReport ? '#fafafa' : 'white',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              fontSize: '12px',
              color: '#9ca3af',
              transform: showReport ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.15s'
            }}>
              ▶
            </span>
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>
              📝 보고내용
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {showReport && !isEditing && (
              <button
                onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                style={{
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: '500',
                  color: '#6b7280',
                  backgroundColor: '#f3f4f6',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                수정
              </button>
            )}
            {!showReport && !reportContent && (
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>클릭하여 작성</span>
            )}
          </div>
        </div>

        {/* 아코디언 내용 */}
        {showReport && (
          <div style={{ borderTop: '1px solid #e5e7eb', padding: '16px', backgroundColor: '#fafafa' }}>
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
                    onClick={() => setIsEditing(false)}
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
              </div>
            )}
          </div>
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

export default CohortForecastSection;
