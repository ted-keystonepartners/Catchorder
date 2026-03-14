import React from 'react';
import { Message, MessageSeparator } from '@chatscope/chat-ui-kit-react';

/**
 * 채팅 메시지 컴포넌트 (chatscope + 토스 스타일)
 * 4가지 타입: user, assistant, system, result
 */
const ChatMessage = ({ message }) => {
  // 시스템 메시지: 가운데 알약
  if (message.role === 'system') {
    return (
      <MessageSeparator>
        <span style={{
          fontSize: '12px',
          color: '#8B95A1',
          backgroundColor: '#F2F3F5',
          padding: '4px 12px',
          borderRadius: '999px',
          letterSpacing: '-0.01em'
        }}>
          {message.content}
        </span>
      </MessageSeparator>
    );
  }

  // 실행 결과: 성공(초록) / 실패(빨강)
  if (message.role === 'result') {
    const ok = message.success !== false;
    return (
      <Message model={{ direction: 'incoming', position: 'single' }}>
        <Message.CustomContent>
          <div style={{
            backgroundColor: ok ? '#F8FFF8' : '#FFF5F5',
            border: `1px solid ${ok ? '#E8F5E8' : '#FFE0E0'}`,
            borderRadius: '14px',
            padding: '12px 16px',
            fontSize: '13px',
            lineHeight: '1.6',
            color: ok ? '#1A7A1A' : '#D32F2F',
            maxWidth: '340px',
            letterSpacing: '-0.01em'
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              fontSize: '12px', fontWeight: '600', marginBottom: '6px'
            }}>
              <span>{ok ? '\u2713' : '\u2717'}</span>
              <span>{ok ? '실행 완료' : '실행 실패'}</span>
            </div>
            <div style={{ whiteSpace: 'pre-wrap', color: ok ? '#2D5F2D' : '#B71C1C' }}>
              {message.content}
            </div>
          </div>
        </Message.CustomContent>
      </Message>
    );
  }

  // 사용자 메시지: 오른쪽 오렌지 버블
  if (message.role === 'user') {
    return (
      <Message model={{
        message: message.content,
        direction: 'outgoing',
        position: 'single'
      }} />
    );
  }

  // 어시스턴트 메시지: 왼쪽 흰색 카드
  return (
    <Message model={{ direction: 'incoming', position: 'single' }}>
      <Message.CustomContent>
        <div style={{
          maxWidth: '340px',
          fontSize: '14px',
          lineHeight: '1.65',
          color: '#191F28',
          letterSpacing: '-0.01em'
        }}>
          <div style={{
            fontSize: '11px', fontWeight: '700',
            color: '#FF3D00', marginBottom: '6px',
            letterSpacing: '0.02em',
            textTransform: 'uppercase'
          }}>
            AI
          </div>
          <div style={{ whiteSpace: 'pre-wrap' }}>
            {message.content}
          </div>
        </div>
      </Message.CustomContent>
    </Message>
  );
};

export default ChatMessage;
