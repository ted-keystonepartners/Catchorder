import React from 'react';
import { Message } from '@chatscope/chat-ui-kit-react';

/**
 * 액션 확인 카드 (토스 스타일)
 */
const ActionConfirmCard = ({ actions, message, onConfirm, onCancel, isLoading }) => {
  if (!actions || actions.length === 0) return null;

  const methodIcon = (m) => {
    if (m === 'GET') return '\ud83d\udd0d';
    if (m === 'DELETE') return '\ud83d\uddd1';
    return '\u270f\ufe0f';
  };

  return (
    <Message model={{ direction: 'incoming', position: 'single' }}>
      <Message.CustomContent>
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #E5E8EB',
          borderRadius: '16px',
          overflow: 'hidden',
          minWidth: '260px',
          maxWidth: '360px'
        }}>
          {/* Header */}
          <div style={{
            backgroundColor: '#FFF8F0',
            borderBottom: '1px solid #FFE8D6',
            padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            <span style={{ fontSize: '14px' }}>&#9888;</span>
            <span style={{
              fontSize: '13px', fontWeight: '600', color: '#D84315',
              letterSpacing: '-0.01em'
            }}>
              변경 확인 필요
            </span>
          </div>

          {/* Actions List */}
          <div style={{ padding: '10px 16px' }}>
            {actions.map((action, idx) => (
              <div key={idx} style={{
                display: 'flex', alignItems: 'flex-start', gap: '10px',
                padding: '6px 0', fontSize: '13px'
              }}>
                <span style={{ flexShrink: 0, marginTop: '1px' }}>
                  {methodIcon(action.method)}
                </span>
                <div style={{ minWidth: 0 }}>
                  <span style={{ fontWeight: '500', color: '#191F28', letterSpacing: '-0.01em' }}>
                    {action.description}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Buttons */}
          <div style={{
            padding: '12px 16px 14px',
            borderTop: '1px solid #F2F3F5',
            display: 'flex', gap: '8px', justifyContent: 'flex-end'
          }}>
            <button
              onClick={onCancel}
              disabled={isLoading}
              style={{
                padding: '8px 18px', fontSize: '13px', fontWeight: '500',
                borderRadius: '10px', border: '1px solid #E5E8EB',
                backgroundColor: '#ffffff', color: '#4E5968',
                cursor: 'pointer', transition: 'all 0.15s',
                letterSpacing: '-0.01em'
              }}
            >
              취소
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              style={{
                padding: '8px 18px', fontSize: '13px', fontWeight: '600',
                borderRadius: '10px', border: 'none',
                backgroundColor: isLoading ? '#D1D6DB' : '#FF3D00',
                color: '#ffffff',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px',
                transition: 'all 0.15s',
                letterSpacing: '-0.01em'
              }}
            >
              {isLoading ? (
                <>
                  <span style={{
                    width: '14px', height: '14px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#ffffff',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                    display: 'inline-block'
                  }} />
                  실행 중...
                </>
              ) : '확인 및 실행'}
            </button>
          </div>
        </div>
      </Message.CustomContent>
    </Message>
  );
};

export default ActionConfirmCard;
