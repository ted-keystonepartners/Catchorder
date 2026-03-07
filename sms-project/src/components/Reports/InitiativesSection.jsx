import React, { useState } from 'react';

const ACCENT = '#FF3D00';

const STATUS_CONFIG = {
  done: { label: '완료', icon: '✅', color: '#16a34a', bg: '#f0fdf4' },
  inprogress: { label: '진행중', icon: '🔄', color: '#2563eb', bg: '#eff6ff' },
  waiting: { label: '대기', icon: '⏳', color: '#d97706', bg: '#fffbeb' },
};

const initiatives = [
  {
    id: 1,
    title: '신규 가입 전환율 개선',
    owner: '김영업',
    status: 'inprogress',
    startDate: '2025-01',
    endDate: '2025-04',
    actions: [
      { id: 'a1', text: '방문 후 24시간 내 팔로업 프로세스 수립', status: 'done' },
      { id: 'a2', text: '영업 스크립트 업데이트 (설치 이점 강조)', status: 'done' },
      { id: 'a3', text: '주간 전환율 모니터링 대시보드 구축', status: 'inprogress' },
      { id: 'a4', text: '전환 실패 원인 분석 리포트 작성', status: 'waiting' },
    ]
  },
  {
    id: 2,
    title: '이탈 매장 재활성화 캠페인',
    owner: '이관리',
    status: 'inprogress',
    startDate: '2025-02',
    endDate: '2025-05',
    actions: [
      { id: 'b1', text: '미이용 30일 이상 매장 세그먼트 분류', status: 'done' },
      { id: 'b2', text: 'SMS 재활성화 메시지 A/B 테스트', status: 'inprogress' },
      { id: 'b3', text: '방문 재활성화 특별 인센티브 설계', status: 'inprogress' },
      { id: 'b4', text: '재활성화 성과 측정 및 ROI 분석', status: 'waiting' },
    ]
  },
  {
    id: 3,
    title: '설치 후 온보딩 개선',
    owner: '박기술',
    status: 'waiting',
    startDate: '2025-03',
    endDate: '2025-06',
    actions: [
      { id: 'c1', text: '설치 당일 사용 가이드 영상 제작', status: 'inprogress' },
      { id: 'c2', text: '첫 주문 성공 체크리스트 배포', status: 'waiting' },
      { id: 'c3', text: '설치 후 7일 이내 매니저 체크인 프로세스', status: 'waiting' },
    ]
  },
  {
    id: 4,
    title: '대리점 채널 확대',
    owner: '최채널',
    status: 'done',
    startDate: '2024-12',
    endDate: '2025-03',
    actions: [
      { id: 'd1', text: '대리점 파트너십 계약 체결 (3개사)', status: 'done' },
      { id: 'd2', text: '대리점 교육 프로그램 운영', status: 'done' },
      { id: 'd3', text: '대리점별 실적 추적 시스템 구축', status: 'done' },
    ]
  },
];

// Simple Gantt bar data
const ganttMonths = ['1월', '2월', '3월', '4월', '5월', '6월'];
const monthIndex = { '2025-01': 0, '2025-02': 1, '2025-03': 2, '2025-04': 3, '2025-05': 4, '2025-06': 5 };

const InitiativesSection = () => {
  const [collapsed, setCollapsed] = useState({});

  const toggleCollapse = (id) => {
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getStatusSummary = (actions) => {
    const done = actions.filter(a => a.status === 'done').length;
    return `${done}/${actions.length}`;
  };

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: '0 0 4px 0' }}>
            이니셔티브 현황
          </h2>
          <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0 }}>
            전략 과제별 진행 상황 및 액션 아이템
          </p>
        </div>
        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            backgroundColor: ACCENT,
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#E65100'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = ACCENT}
          onClick={() => alert('이니셔티브 생성 기능은 준비 중입니다.')}
        >
          <span style={{ fontSize: '16px' }}>+</span>
          생성
        </button>
      </div>

      {/* Initiative Tree */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
        {initiatives.map((initiative) => {
          const isOpen = !collapsed[initiative.id];
          const statusCfg = STATUS_CONFIG[initiative.status];

          return (
            <div key={initiative.id} style={{
              border: '1px solid #f3f4f6',
              borderRadius: '10px',
              overflow: 'hidden'
            }}>
              {/* Initiative Header */}
              <button
                onClick={() => toggleCollapse(initiative.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '14px 16px',
                  backgroundColor: isOpen ? '#fafafa' : 'white',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background-color 0.15s'
                }}
              >
                <span style={{
                  fontSize: '12px',
                  color: isOpen ? ACCENT : '#9ca3af',
                  flexShrink: 0,
                  transition: 'transform 0.2s',
                  display: 'inline-block',
                  transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)'
                }}>▶</span>

                <span style={{ flex: 1, fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                  {initiative.title}
                </span>

                <span style={{ fontSize: '12px', color: '#6b7280', flexShrink: 0 }}>
                  {initiative.owner}
                </span>

                <span style={{
                  fontSize: '11px',
                  fontWeight: '600',
                  color: statusCfg.color,
                  backgroundColor: statusCfg.bg,
                  padding: '3px 8px',
                  borderRadius: '100px',
                  flexShrink: 0
                }}>
                  {statusCfg.icon} {statusCfg.label}
                </span>

                <span style={{ fontSize: '12px', color: '#9ca3af', flexShrink: 0 }}>
                  {getStatusSummary(initiative.actions)} 완료
                </span>
              </button>

              {/* Action Items */}
              {isOpen && (
                <div style={{ padding: '4px 16px 12px 40px', backgroundColor: 'white' }}>
                  {initiative.actions.map((action, ai) => {
                    const aCfg = STATUS_CONFIG[action.status];
                    return (
                      <div key={action.id} style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        padding: '8px 0',
                        borderBottom: ai < initiative.actions.length - 1 ? '1px solid #f9fafb' : 'none'
                      }}>
                        <span style={{ fontSize: '14px', flexShrink: 0, marginTop: '1px' }}>{aCfg.icon}</span>
                        <span style={{
                          flex: 1,
                          fontSize: '13px',
                          color: action.status === 'done' ? '#9ca3af' : '#374151',
                          textDecoration: action.status === 'done' ? 'line-through' : 'none',
                          lineHeight: '1.5'
                        }}>
                          {action.text}
                        </span>
                        <span style={{
                          fontSize: '11px',
                          color: aCfg.color,
                          backgroundColor: aCfg.bg,
                          padding: '2px 7px',
                          borderRadius: '100px',
                          flexShrink: 0,
                          fontWeight: '500'
                        }}>
                          {aCfg.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Simple Gantt Chart */}
      <div>
        <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '14px' }}>
          타임라인 (2025년)
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
            <thead>
              <tr>
                <th style={{ width: '160px', padding: '6px 12px', textAlign: 'left', fontSize: '12px', color: '#6b7280', fontWeight: '600', borderBottom: '1px solid #f3f4f6' }}>
                  이니셔티브
                </th>
                {ganttMonths.map((m) => (
                  <th key={m} style={{ padding: '6px 4px', textAlign: 'center', fontSize: '11px', color: '#9ca3af', fontWeight: '600', borderBottom: '1px solid #f3f4f6' }}>
                    {m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {initiatives.map((initiative) => {
                const start = monthIndex[initiative.startDate] ?? 0;
                const end = monthIndex[initiative.endDate] ?? 5;
                const sCfg = STATUS_CONFIG[initiative.status];

                return (
                  <tr key={initiative.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                    <td style={{ padding: '8px 12px', fontSize: '12px', fontWeight: '500', color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }}>
                      {initiative.title}
                    </td>
                    {ganttMonths.map((_, mi) => {
                      const inRange = mi >= start && mi <= end;
                      const isFirst = mi === start;
                      const isLast = mi === end;
                      return (
                        <td key={mi} style={{ padding: '8px 2px', textAlign: 'center' }}>
                          {inRange ? (
                            <div style={{
                              height: '18px',
                              backgroundColor: sCfg.bg,
                              border: `1px solid ${sCfg.color}44`,
                              borderRadius: isFirst && isLast ? '6px' : isFirst ? '6px 0 0 6px' : isLast ? '0 6px 6px 0' : '0',
                              borderLeft: !isFirst ? 'none' : undefined,
                              borderRight: !isLast ? 'none' : undefined,
                            }} />
                          ) : (
                            <div style={{ height: '18px' }} />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ display: 'flex', gap: '16px', marginTop: '10px', flexWrap: 'wrap' }}>
            {Object.values(STATUS_CONFIG).map(({ label, icon, color, bg }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#6b7280' }}>
                <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '3px', backgroundColor: bg, border: `1px solid ${color}44` }} />
                {icon} {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InitiativesSection;
