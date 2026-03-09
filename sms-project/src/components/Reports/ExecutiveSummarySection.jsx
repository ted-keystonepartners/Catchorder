import React, { useState } from 'react';

const ExecutiveSummarySection = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      borderLeft: '4px solid #FF3D00'
    }}>
      {/* Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          marginBottom: isExpanded ? '20px' : '0'
        }}
      >
        <div>
          <h2 style={{
            fontSize: '18px',
            fontWeight: '700',
            color: '#111827',
            margin: '0 0 4px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            Executive Summary
          </h2>
          <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
            1분기 현황 요약 (3월 기준)
          </p>
        </div>
        <span style={{
          fontSize: '12px',
          color: '#9ca3af',
          transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
          transition: 'transform 0.15s'
        }}>
          ▶
        </span>
      </div>

      {isExpanded && (
        <div style={{ fontSize: '14px', color: '#374151', lineHeight: '1.8' }}>
          {/* 목표와 현실 */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              fontSize: '13px',
              fontWeight: '600',
              color: '#111827',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{
                width: '6px',
                height: '6px',
                backgroundColor: '#6b7280',
                borderRadius: '50%'
              }} />
              목표와 현실
            </div>
            <ul style={{ margin: '0', paddingLeft: '20px', color: '#4b5563' }}>
              <li style={{ marginBottom: '4px' }}>1분기 목표: 이용매장 90개 → 270개 (180개 순증)</li>
              <li style={{ marginBottom: '4px' }}>현재 실적: 74개 → 120개 (46개 순증, 달성률 26%)</li>
              <li>3월말 전망: 현재까지 8개 순증, 이대로면 약 150개로 목표 달성 어려움</li>
            </ul>
          </div>

          {/* 왜 안 됐나 */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              fontSize: '13px',
              fontWeight: '600',
              color: '#111827',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{
                width: '6px',
                height: '6px',
                backgroundColor: '#EF4444',
                borderRadius: '50%'
              }} />
              왜 안 됐나
            </div>
            <ul style={{ margin: '0', paddingLeft: '20px', color: '#4b5563' }}>
              <li style={{ marginBottom: '4px' }}>초기 전략은 "설치 매장 수 최대화"였음</li>
              <li style={{ marginBottom: '4px' }}>1월에 54개를 설치했으나, 이용매장 순증은 22개에 그침</li>
              <li style={{ marginBottom: '4px' }}>원인을 분석해보니 신규 유입이 기존 매장 이탈로 상쇄되고 있었음</li>
              <li>즉, 아무리 설치를 늘려도 잔존율이 낮으면 이용매장은 안 늘어남</li>
            </ul>
          </div>

          {/* 무엇을 배웠나 */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              fontSize: '13px',
              fontWeight: '600',
              color: '#111827',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{
                width: '6px',
                height: '6px',
                backgroundColor: '#F59E0B',
                borderRadius: '50%'
              }} />
              무엇을 배웠나
            </div>
            <ul style={{ margin: '0', paddingLeft: '20px', color: '#4b5563' }}>
              <li style={{ marginBottom: '4px' }}>이용매장 성장의 핵심 드라이버는 설치 수가 아니라 잔존율</li>
              <li style={{ marginBottom: '4px' }}>잔존율이 낮았던 이유: 규모가 맞지 않는 매장에도 무분별하게 설치</li>
              <li>이후 이탈이 발생한 이유: 메뉴 세팅 불일치, 기능 오류 등 초기 경험 문제</li>
            </ul>
          </div>

          {/* 전략을 어떻게 바꿨나 */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              fontSize: '13px',
              fontWeight: '600',
              color: '#111827',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{
                width: '6px',
                height: '6px',
                backgroundColor: '#3B82F6',
                borderRadius: '50%'
              }} />
              전략을 어떻게 바꿨나
            </div>
            <ul style={{ margin: '0', paddingLeft: '20px', color: '#4b5563' }}>
              <li style={{ marginBottom: '4px' }}>"설치 수 늘리기" → "잔존율 높이기" 중심으로 전환</li>
              <li style={{ marginBottom: '4px' }}>현재 2개 Task, 4개 Action Item 실행 중</li>
              <li style={{ marginBottom: '4px', paddingLeft: '16px', listStyle: 'none' }}>
                <span style={{ color: '#6b7280' }}>-</span> Task 1: 이용매장 잔존율 높이기 (M+0 유지 + M+1 이후 이탈 방지)
              </li>
              <li style={{ paddingLeft: '16px', listStyle: 'none' }}>
                <span style={{ color: '#6b7280' }}>-</span> Task 2: 설치 전환율 높이기 (메뉴 등록 효율화 + 온보딩 개선)
              </li>
            </ul>
          </div>

          {/* 현재 진행 상황 */}
          <div>
            <div style={{
              fontSize: '13px',
              fontWeight: '600',
              color: '#111827',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{
                width: '6px',
                height: '6px',
                backgroundColor: '#6b7280',
                borderRadius: '50%'
              }} />
              현재 진행 상황
            </div>
            <ul style={{ margin: '0', paddingLeft: '20px', color: '#4b5563' }}>
              <li style={{ marginBottom: '4px' }}>M+0 잔존율 55% → 80%로 개선 중 (설치 기준 상향 효과 확인)</li>
              <li style={{ marginBottom: '4px' }}>M+1 이후 잔존율 유지를 위해 담당제 도입 및 자동실행 기능 개발 진행 중</li>
              <li>오케이포스 연동 해결 및 설치 Capacity 회복 병행 추진 중</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExecutiveSummarySection;
