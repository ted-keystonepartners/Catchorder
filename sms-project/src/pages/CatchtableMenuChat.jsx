import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../context/authStore.js';

// Chatscope
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';
import '../styles/chatscope-toss.css';
import {
  MainContainer,
  ChatContainer,
  MessageList,
  MessageInput,
  ConversationHeader,
  TypingIndicator
} from '@chatscope/chat-ui-kit-react';

// Components
import ChatMessage from '../components/catchtable/ChatMessage.jsx';
import ActionConfirmCard from '../components/catchtable/ActionConfirmCard.jsx';
import MenuStatePanel from '../components/catchtable/MenuStatePanel.jsx';

// Utils
import { initCatchtableSession, executeCatchtableActions, refreshCatchtableMenu, clearCatchtableSession } from '../utils/catchtableApi.js';
import { buildSystemPrompt, buildMessages } from '../utils/catchtablePrompt.js';
import { parseActionResponse, categorizeActions, formatActionResults } from '../utils/catchtableActions.js';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

// Toss color tokens
const C = {
  text1: '#191F28',
  text2: '#4E5968',
  text3: '#8B95A1',
  text4: '#B0B8C1',
  bg: '#F7F8FA',
  bg2: '#F2F3F5',
  border: '#E5E8EB',
  primary: '#FF3D00',
  primaryDark: '#E63600',
  primaryLight: '#FFF3EE',
  white: '#ffffff',
  error: '#D32F2F',
  errorBg: '#FFF5F5',
};

/**
 * 캐치테이블로 메뉴 관리 채팅 페이지 (토스 스타일)
 */
const CatchtableMenuChat = () => {
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);

  // 세션 상태
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState(null);
  const [menuCategories, setMenuCategories] = useState([]);
  const [menuOptions, setMenuOptions] = useState([]);
  const [optionCategories, setOptionCategories] = useState([]);
  const [storeInfo, setStoreInfo] = useState({});
  const [brandStoreId, setBrandStoreId] = useState('442');

  // 채팅 상태
  const [messages, setMessages] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 확인 카드 상태
  const [pendingAction, setPendingAction] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);

  // 사이드 패널
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const initCalledRef = useRef(false);

  // 세션 초기화 (StrictMode 중복 실행 방지)
  useEffect(() => {
    if (initCalledRef.current) return;
    initCalledRef.current = true;
    initSession();
  }, []);

  const initSession = async () => {
    setIsInitializing(true);
    setInitError(null);
    try {
      const data = await initCatchtableSession(brandStoreId);
      setMenuCategories(data.menu);
      setMenuOptions(data.menuOptions || []);
      setOptionCategories(data.optionCategories || []);
      setStoreInfo(data.store);
      setBrandStoreId(data.brandStoreId || '442');
      addSystemMessage('캐치테이블로 세션이 시작되었습니다. 메뉴나 매장 정보에 대해 자유롭게 질문해주세요.');
    } catch (err) {
      setInitError(err.message);
    } finally {
      setIsInitializing(false);
    }
  };

  const addMessage = useCallback((role, content, extra = {}) => {
    setMessages(prev => [...prev, { role, content, id: Date.now() + Math.random(), ...extra }]);
  }, []);

  const addSystemMessage = useCallback((content) => {
    addMessage('system', content);
  }, [addMessage]);

  // Claude API 호출
  const callClaude = async (userMessage) => {
    if (!import.meta.env.VITE_ANTHROPIC_API_KEY) {
      throw new Error('Anthropic API 키가 설정되지 않았습니다. .env.development 파일을 확인해주세요.');
    }

    const systemPrompt = buildSystemPrompt({
      menuCategories,
      store: storeInfo,
      brandStoreId,
      menuOptions
    });

    const apiMessages = buildMessages(userMessage, chatHistory);

    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        temperature: 0,
        system: systemPrompt,
        messages: apiMessages
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Claude API 오류: ${response.status}`);
    }

    const data = await response.json();
    return data.content[0].text;
  };

  // 메시지 전송 (텍스트 파라미터 직접 수신 - MessageInput 호환)
  const handleSendWithText = async (text) => {
    if (!text || isLoading) return;

    addMessage('user', text);
    setChatHistory(prev => [...prev, { role: 'user', content: text }]);

    setIsLoading(true);
    try {
      const response = await callClaude(text);
      const parsed = parseActionResponse(response);

      if (!parsed) {
        addMessage('assistant', response);
        setChatHistory(prev => [...prev, { role: 'assistant', content: response }]);
        return;
      }

      if (parsed.actions && parsed.actions.length > 0) {
        const { safe, needsConfirm, blocked } = categorizeActions(parsed.actions);

        if (blocked.length > 0) {
          addMessage('assistant', parsed.message + '\n\n(일부 작업은 보안상 지원하지 않습니다.)');
        }

        if (safe.length > 0 && needsConfirm.length === 0) {
          addMessage('assistant', parsed.message);
          await executeActions(safe);
        } else if (needsConfirm.length > 0) {
          const allActions = [...safe, ...needsConfirm];
          setPendingAction({ actions: allActions, message: parsed.message });
        } else if (safe.length > 0) {
          addMessage('assistant', parsed.message);
          await executeActions(safe);
        }
      } else {
        addMessage('assistant', parsed.message);
      }

      setChatHistory(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (err) {
      addMessage('result', `오류: ${err.message}`, { success: false });
    } finally {
      setIsLoading(false);
    }
  };

  // 기존 handleSend (inputValue 기반)
  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text) return;
    setInputValue('');
    await handleSendWithText(text);
  };

  // 액션 실행
  const executeActions = async (actions) => {
    setIsExecuting(true);
    try {
      const { results, rejected } = await executeCatchtableActions(
        actions, menuCategories, brandStoreId
      );
      const summary = formatActionResults(results, rejected);
      const allSuccess = results.every(r => r.success) && rejected.length === 0;

      addMessage('result', summary, { success: allSuccess });

      if (results.some(r => r.success)) {
        await handleRefreshMenu(true);
      }
    } catch (err) {
      addMessage('result', `실행 오류: ${err.message}`, { success: false });
    } finally {
      setIsExecuting(false);
    }
  };

  // 확인 카드 핸들러
  const handleConfirm = async () => {
    if (!pendingAction) return;
    const actions = pendingAction.actions;
    addMessage('assistant', pendingAction.message);
    setPendingAction(null);
    await executeActions(actions);
  };

  const handleCancel = () => {
    addMessage('system', '작업이 취소되었습니다.');
    setPendingAction(null);
  };

  // 메뉴 새로고침
  const handleRefreshMenu = async (silent = false) => {
    setIsRefreshing(true);
    try {
      const refreshData = await refreshCatchtableMenu(brandStoreId);
      setMenuCategories(refreshData.menu);
      setMenuOptions(refreshData.menuOptions || []);
      setOptionCategories(refreshData.optionCategories || []);
      if (refreshData.store && Object.keys(refreshData.store).length > 0) {
        setStoreInfo(refreshData.store);
      }
      if (!silent) {
        addSystemMessage('메뉴가 최신 상태로 갱신되었습니다.');
      }
    } catch (err) {
      if (!silent) {
        addMessage('result', `메뉴 새로고침 실패: ${err.message}`, { success: false });
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // 새 세션
  const handleNewSession = () => {
    clearCatchtableSession();
    setMessages([]);
    setChatHistory([]);
    setPendingAction(null);
    initCalledRef.current = false;
    initSession();
  };

  // 빠른 질문 입력
  const handleQuickQuestion = (q) => {
    setInputValue(q);
  };

  // 초기화 중
  if (isInitializing) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', backgroundColor: C.white,
        fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '36px', height: '36px',
            border: `3px solid ${C.bg2}`, borderTopColor: C.primary,
            borderRadius: '50%', animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }} />
          <p style={{ fontSize: '15px', color: C.text3, letterSpacing: '-0.01em' }}>
            캐치테이블로 연결 중...
          </p>
        </div>
      </div>
    );
  }

  // 초기화 에러
  if (initError) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', backgroundColor: C.white,
        fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
      }}>
        <div style={{ textAlign: 'center', maxWidth: '340px', padding: '0 24px' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '50%',
            backgroundColor: C.errorBg, display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 20px',
            fontSize: '22px', color: C.error
          }}>!</div>
          <h2 style={{
            fontSize: '18px', fontWeight: '700', color: C.text1,
            marginBottom: '8px', letterSpacing: '-0.02em'
          }}>
            연결 실패
          </h2>
          <p style={{
            fontSize: '14px', color: C.text3, marginBottom: '24px',
            lineHeight: '1.6', letterSpacing: '-0.01em'
          }}>
            {initError}
          </p>
          <button
            onClick={initSession}
            style={{
              padding: '12px 28px', backgroundColor: C.primary, color: C.white,
              border: 'none', borderRadius: '12px', fontSize: '15px',
              fontWeight: '600', cursor: 'pointer', transition: 'background-color 0.15s',
              letterSpacing: '-0.01em'
            }}
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      height: '100vh', display: 'flex', overflow: 'hidden',
      fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
    }}>
      {/* Chat Area */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <MainContainer style={{ border: 'none', flex: 1 }}>
          <ChatContainer>
            {/* Header */}
            <ConversationHeader>
              <ConversationHeader.Back onClick={() => navigate('/dashboard')} />
              <ConversationHeader.Content
                userName="정보관리 에이전트"
                info={storeInfo?.brand_store_name || storeInfo?.name || ''}
              />
              <ConversationHeader.Actions>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    onClick={() => setIsPanelOpen(!isPanelOpen)}
                    style={{
                      padding: '6px 14px', fontSize: '13px', borderRadius: '8px',
                      border: `1px solid ${isPanelOpen ? '#FFD4C2' : C.border}`,
                      backgroundColor: isPanelOpen ? C.primaryLight : C.white,
                      color: isPanelOpen ? C.primary : C.text2,
                      cursor: 'pointer', transition: 'all 0.15s',
                      fontWeight: '600', letterSpacing: '-0.01em'
                    }}
                  >
                    현황 {isPanelOpen ? '\u25b8' : '\u25c2'}
                  </button>
                </div>
              </ConversationHeader.Actions>
            </ConversationHeader>

            {/* Messages */}
            <MessageList
              autoScrollToBottom={true}
              autoScrollToBottomOnMount={true}
              scrollBehavior="smooth"
              typingIndicator={
                isLoading ? <TypingIndicator content="AI가 생각 중..." /> : null
              }
            >
              {/* Empty State */}
              {messages.length === 0 && (
                <MessageList.Content style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', height: '100%', padding: '40px 24px'
                }}>
                  <div style={{
                    width: '56px', height: '56px', borderRadius: '16px',
                    backgroundColor: C.primaryLight, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    marginBottom: '16px', fontSize: '24px'
                  }}>
                    &#128172;
                  </div>
                  <p style={{
                    fontSize: '16px', color: C.text1, marginBottom: '6px',
                    fontWeight: '600', letterSpacing: '-0.02em'
                  }}>
                    무엇을 도와드릴까요?
                  </p>
                  <p style={{
                    fontSize: '14px', color: C.text3, marginBottom: '24px',
                    letterSpacing: '-0.01em'
                  }}>
                    메뉴나 매장 정보에 대해 질문해보세요
                  </p>
                  <div style={{
                    display: 'flex', flexWrap: 'wrap', gap: '8px',
                    justifyContent: 'center', maxWidth: '380px'
                  }}>
                    {['메뉴 보여줘', '아메리카노 품절 처리', '옵션 품절 처리', '매장 정보 보여줘'].map(q => (
                      <button
                        key={q}
                        onClick={() => handleQuickQuestion(q)}
                        style={{
                          padding: '8px 16px', fontSize: '13px', borderRadius: '999px',
                          border: `1px solid ${C.border}`, backgroundColor: C.white,
                          color: C.text2, cursor: 'pointer',
                          transition: 'all 0.15s', fontWeight: '500',
                          letterSpacing: '-0.01em'
                        }}
                        onMouseOver={e => {
                          e.currentTarget.style.borderColor = C.primary;
                          e.currentTarget.style.color = C.primary;
                          e.currentTarget.style.backgroundColor = C.primaryLight;
                        }}
                        onMouseOut={e => {
                          e.currentTarget.style.borderColor = C.border;
                          e.currentTarget.style.color = C.text2;
                          e.currentTarget.style.backgroundColor = C.white;
                        }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </MessageList.Content>
              )}

              {/* Messages */}
              {messages.map(msg => (
                <ChatMessage key={msg.id} message={msg} />
              ))}

              {/* Pending Action Card */}
              {pendingAction && (
                <ActionConfirmCard
                  actions={pendingAction.actions}
                  message={pendingAction.message}
                  onConfirm={handleConfirm}
                  onCancel={handleCancel}
                  isLoading={isExecuting}
                />
              )}
            </MessageList>

            {/* Input */}
            <MessageInput
              placeholder="메뉴 변경을 요청하세요..."
              value={inputValue}
              onChange={(_, textContent) => setInputValue(textContent)}
              onSend={(_, textContent) => {
                setInputValue('');
                handleSendWithText(textContent);
              }}
              disabled={isLoading || !!pendingAction}
              sendButton={true}
              attachButton={false}
            />
          </ChatContainer>
        </MainContainer>
      </div>

      {/* Side Panel */}
      <MenuStatePanel
        menuCategories={menuCategories}
        menuOptions={menuOptions}
        optionCategories={optionCategories}
        storeInfo={storeInfo}
        isOpen={isPanelOpen}
        onToggle={() => setIsPanelOpen(false)}
        onRefresh={() => handleRefreshMenu(false)}
        isRefreshing={isRefreshing}
      />
    </div>
  );
};

export default CatchtableMenuChat;
