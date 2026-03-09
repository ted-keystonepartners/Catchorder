import React, { useState, useEffect } from 'react';
import { getMonthlyFunnel } from '../../api/reportsApi.js';
import { useReportContent } from '../../hooks/useReportContent.js';

const ACCENT = '#FF3D00';

const FunnelSection = ({ dateRange }) => {
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
  } = useReportContent('funnel');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await getMonthlyFunnel();
        if (response.success) {
          setData(response.data);
        }
      } catch (err) {
        console.error('퍼널 데이터 조회 실패:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateRange]);

  // 현재 월 제외 (데이터가 불완전하므로)
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const monthlyData = (data?.monthly || []).filter(item => {
    // month가 현재 월이면 제외
    if (item.month === currentMonth) return false;
    // 2026-03 형식 외에 label이 "3월"이고 올해인 경우도 제외
    const currentMonthNum = new Date().getMonth() + 1;
    if (item.label === `${currentMonthNum}월` && item.month?.startsWith(String(new Date().getFullYear()))) return false;
    return true;
  });
  const cumulative = data?.cumulative || { registered: 0, installed: 0, active: 0, churned: 0, hold: 0 };

  const LoadingSkeleton = () => (
    <div style={{
      width: '100%',
      height: '200px',
      backgroundColor: '#f3f4f6',
      borderRadius: '8px',
      animation: 'pulse 1.5s infinite'
    }} />
  );

  // 월별 전환율 계산
  const chartData = monthlyData.map(item => ({
    label: item.label,
    installRate: item.registered > 0 ? ((item.installed / item.registered) * 100).toFixed(1) : 0,
    activeRate: item.installed > 0 ? ((item.active / item.installed) * 100).toFixed(1) : 0
  }));

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: '0 0 4px 0' }}>
          월별 퍼널 분석
        </h2>
        <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
          해당 월에 가입한 매장의 <strong>전체 기간 이용 이력</strong> 기준 분류
        </p>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : monthlyData.length > 0 ? (
        <>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          {/* 왼쪽: 테이블 */}
          <div style={{ flex: '1 1 50%', minWidth: '320px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  <th style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#374151',
                    borderBottom: '2px solid #e5e7eb',
                    whiteSpace: 'nowrap'
                  }}>
                    구분
                  </th>
                  <th style={{
                    padding: '12px 16px',
                    textAlign: 'center',
                    fontWeight: '600',
                    color: '#111827',
                    backgroundColor: '#fff5f3',
                    borderBottom: '2px solid #e5e7eb',
                    whiteSpace: 'nowrap'
                  }}>
                    누적
                  </th>
                  {monthlyData.map(item => (
                    <th key={item.month} style={{
                      padding: '12px 16px',
                      textAlign: 'center',
                      fontWeight: '600',
                      color: '#374151',
                      borderBottom: '2px solid #e5e7eb',
                      whiteSpace: 'nowrap'
                    }}>
                      {item.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* 신규가입 */}
                <tr>
                  <td style={{
                    padding: '14px 16px',
                    fontWeight: '600',
                    color: '#111827',
                    borderBottom: '1px solid #f3f4f6',
                    backgroundColor: '#fafafa'
                  }}>
                    신규가입
                  </td>
                  <td style={{
                    padding: '14px 16px',
                    textAlign: 'center',
                    color: '#111827',
                    backgroundColor: '#fff5f3',
                    borderBottom: '1px solid #f3f4f6'
                  }}>
                    {cumulative.registered.toLocaleString()}
                  </td>
                  {monthlyData.map(item => (
                    <td key={`reg-${item.month}`} style={{
                      padding: '14px 16px',
                      textAlign: 'center',
                      color: '#374151',
                      borderBottom: '1px solid #f3f4f6'
                    }}>
                      {item.registered.toLocaleString()}
                    </td>
                  ))}
                </tr>

                {/* 설치완료 */}
                <tr>
                  <td style={{
                    padding: '14px 16px',
                    fontWeight: '600',
                    color: '#111827',
                    borderBottom: '1px solid #f3f4f6',
                    backgroundColor: '#fafafa'
                  }}>
                    설치완료
                  </td>
                  <td style={{
                    padding: '14px 16px',
                    textAlign: 'center',
                    color: '#111827',
                    backgroundColor: '#fff5f3',
                    borderBottom: '1px solid #f3f4f6'
                  }}>
                    {cumulative.installed.toLocaleString()}
                  </td>
                  {monthlyData.map(item => (
                    <td key={`inst-${item.month}`} style={{
                      padding: '14px 16px',
                      textAlign: 'center',
                      color: '#374151',
                      borderBottom: '1px solid #f3f4f6'
                    }}>
                      {item.installed.toLocaleString()}
                    </td>
                  ))}
                </tr>

                {/* 이용 */}
                <tr>
                  <td style={{
                    padding: '14px 16px',
                    fontWeight: '600',
                    color: '#111827',
                    borderBottom: '1px solid #f3f4f6',
                    backgroundColor: '#fafafa'
                  }}>
                    이용
                  </td>
                  <td style={{
                    padding: '14px 16px',
                    textAlign: 'center',
                    color: '#111827',
                    backgroundColor: '#fff5f3',
                    borderBottom: '1px solid #f3f4f6'
                  }}>
                    {cumulative.active.toLocaleString()}
                  </td>
                  {monthlyData.map(item => (
                    <td key={`active-${item.month}`} style={{
                      padding: '14px 16px',
                      textAlign: 'center',
                      color: '#374151',
                      borderBottom: '1px solid #f3f4f6'
                    }}>
                      {(item.active || 0).toLocaleString()}
                    </td>
                  ))}
                </tr>

                {/* 해지 */}
                <tr>
                  <td style={{
                    padding: '14px 16px',
                    fontWeight: '600',
                    color: '#111827',
                    borderBottom: '1px solid #f3f4f6',
                    backgroundColor: '#fafafa'
                  }}>
                    해지
                  </td>
                  <td style={{
                    padding: '14px 16px',
                    textAlign: 'center',
                    color: '#111827',
                    backgroundColor: '#fff5f3',
                    borderBottom: '1px solid #f3f4f6'
                  }}>
                    {(cumulative.churned || 0).toLocaleString()}
                  </td>
                  {monthlyData.map(item => (
                    <td key={`churn-${item.month}`} style={{
                      padding: '14px 16px',
                      textAlign: 'center',
                      color: '#374151',
                      borderBottom: '1px solid #f3f4f6'
                    }}>
                      {(item.churned || 0).toLocaleString()}
                    </td>
                  ))}
                </tr>

                {/* 보류 */}
                <tr>
                  <td style={{
                    padding: '14px 16px',
                    fontWeight: '600',
                    color: '#111827',
                    backgroundColor: '#fafafa'
                  }}>
                    보류
                  </td>
                  <td style={{
                    padding: '14px 16px',
                    textAlign: 'center',
                    color: '#111827',
                    backgroundColor: '#fff5f3'
                  }}>
                    {(cumulative.hold || 0).toLocaleString()}
                  </td>
                  {monthlyData.map(item => (
                    <td key={`hold-${item.month}`} style={{
                      padding: '14px 16px',
                      textAlign: 'center',
                      color: '#374151'
                    }}>
                      {(item.hold || 0).toLocaleString()}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* 오른쪽: 월별 추이 막대 그래프 */}
          <div style={{
            flex: '1 1 320px',
            minWidth: '320px',
            padding: '16px 24px',
            backgroundColor: '#fafafa',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column'
          }}>
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
                {chartData.map((item, idx) => (
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

              {/* X축 라벨 - 막대 그래프와 동일한 flex 구조 */}
              <div style={{
                display: 'flex',
                marginTop: '10px'
              }}>
                {chartData.map((item, idx) => (
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
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              display: 'inline-block',
              width: '14px',
              height: '14px',
              borderRadius: '4px',
              backgroundColor: '#FF6B00'
            }} />
            설치율 (가입 대비 설치)
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              display: 'inline-block',
              width: '14px',
              height: '14px',
              borderRadius: '4px',
              backgroundColor: '#3B82F6'
            }} />
            이용률 (설치 대비 이용)
          </span>
        </div>
      </>
      ) : (
        <div style={{
          padding: '60px',
          textAlign: 'center',
          color: '#9ca3af'
        }}>
          퍼널 데이터가 없습니다
        </div>
      )}

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

export default FunnelSection;
