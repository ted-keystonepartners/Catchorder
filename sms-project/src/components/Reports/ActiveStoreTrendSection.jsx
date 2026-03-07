import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { apiClient } from '../../api/client.js';
import { useReportContent } from '../../hooks/useReportContent.js';

const ACCENT = '#FF3D00';

const ActiveStoreTrendSection = ({ dateRange }) => {
  const [data, setData] = useState([]);
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
  } = useReportContent('active_store_trend');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 2025-12-09부터 시작
        const startDate = '2025-12-09';
        const response = await apiClient.get(
          `/api/stats/daily-usage?start_date=${startDate}&end_date=${dateRange.end}`
        );

        if (response.success && response.data?.daily_usage) {
          setData(response.data.daily_usage);
        }
      } catch (err) {
        console.error('이용매장 추이 데이터 조회 실패:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateRange]);

  // Y축 도메인 계산
  const getYDomain = () => {
    if (data.length === 0) return [0, 100];
    const activeValues = data.map(d => d.active || 0);
    const min = Math.min(...activeValues);
    const max = Math.max(...activeValues);
    const padding = Math.ceil((max - min) * 0.1) || 5;
    return [Math.max(0, min - padding), max + padding];
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
            이용매장 추이
          </h2>
          <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0 }}>
            일별 서비스 이용 매장 수 변화
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

      {loading ? (
        <div style={{
          height: '280px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            width: '100%',
            height: '200px',
            backgroundColor: '#f3f4f6',
            borderRadius: '8px',
            animation: 'pulse 1.5s infinite'
          }} />
        </div>
      ) : data.length > 0 ? (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data}>
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
              dot={{ r: 3, fill: '#3B82F6' }}
              activeDot={{ r: 5, fill: '#3B82F6' }}
              name="이용매장"
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div style={{
          height: '280px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6b7280',
          fontSize: '14px'
        }}>
          데이터가 없습니다
        </div>
      )}

      {/* 보고내용 */}
      {showReport && (
        <div style={{
          backgroundColor: '#fafafa',
          border: '1px solid #f3f4f6',
          borderLeft: `3px solid ${ACCENT}`,
          borderRadius: '8px',
          padding: '16px',
          marginTop: '20px'
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

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default ActiveStoreTrendSection;
