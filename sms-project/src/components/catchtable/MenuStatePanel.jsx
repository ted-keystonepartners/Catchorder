import React, { useState } from 'react';

/**
 * 사이드 메뉴 현황 패널 (접이식)
 * 카테고리별 메뉴명, 가격, 품절 상태 + 옵션 + 매장정보 표시
 */

const font = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

const colors = {
  text1: '#191F28',
  text2: '#4E5968',
  text3: '#8B95A1',
  text4: '#B0B8C1',
  bg: '#F7F8FA',
  bg2: '#F2F3F5',
  border: '#E5E8EB',
  borderLight: '#F2F3F5',
  primary: '#FF3D00',
  white: '#ffffff',
};

const RefreshIcon = ({ spinning }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{
      display: 'block',
      transform: spinning ? undefined : undefined,
      animation: spinning ? 'spin 0.8s linear infinite' : 'none',
    }}
  >
    <path
      d="M12.5 7A5.5 5.5 0 1 1 9.3 2.1"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M9 1L9.3 2.1L10.4 1.8"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CloseIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: 'block' }}
  >
    <path
      d="M1 1L11 11M11 1L1 11"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const IconButton = ({ onClick, disabled, title, children, spinning }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 28,
        height: 28,
        borderRadius: '50%',
        border: 'none',
        cursor: disabled ? 'default' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: hovered ? colors.bg2 : 'transparent',
        color: hovered ? colors.text1 : colors.text3,
        transition: 'background 0.15s, color 0.15s',
        flexShrink: 0,
        fontFamily: font,
      }}
    >
      {children}
    </button>
  );
};

const MenuStatePanel = ({ menuCategories, menuOptions, optionCategories, storeInfo, isOpen, onToggle, onRefresh, isRefreshing }) => {
  const [expandedCats, setExpandedCats] = useState({});
  const [activeTab, setActiveTab] = useState('menu');
  const [expandedTexts, setExpandedTexts] = useState({});

  const toggleCategory = (catId) => {
    setExpandedCats(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  const toggleText = (key) => {
    setExpandedTexts(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const totalMenus = menuCategories?.reduce((sum, cat) => sum + (cat.menus?.length || 0), 0) || 0;

  // 옵션을 카테고리별로 그룹핑
  const optionsByCategory = {};
  if (menuOptions) {
    for (const opt of menuOptions) {
      const catId = opt.menu_option_category_id;
      if (!optionsByCategory[catId]) optionsByCategory[catId] = [];
      optionsByCategory[catId].push(opt);
    }
  }

  // optionCategories에서 카테고리 이름 매핑 생성
  const optCatNameMap = {};
  const optCatMenuMap = {};
  if (optionCategories) {
    for (const oc of optionCategories) {
      optCatNameMap[oc.id] = oc.name;
      optCatMenuMap[oc.id] = oc.appliedMenus || [];
    }
  }

  const optionCategoryIds = Object.keys(optionsByCategory);

  // 영업시간 헬퍼
  const formatTime = (t) => {
    if (!t) return '';
    const s = String(t).padStart(4, '0');
    return `${s.slice(0, 2)}:${s.slice(2)}`;
  };

  const wdayLabel = (wday) => {
    if (wday === 1) return '평일';
    if (wday === 2) return '주말';
    return `(${wday})`;
  };

  const storeName = storeInfo?.brand_store_name || storeInfo?.name || '';
  const address = [storeInfo?.address, storeInfo?.detail_address].filter(Boolean).join(' ');
  const tel = storeInfo?.tel || '';
  const origin = storeInfo?.origin || '';
  const orderInfo = storeInfo?.order_info || '';

  // 영업시간: part===1 우선, 없으면 part===null fallback + 무효 시간 제거 + wday 중복 제거
  const isValidTime = (t) => t.start && t.end && !(t.start === t.end) && !(t.start === '00:00:00' && t.end === '00:00:00');
  const allTimes = (storeInfo?.brand_store_time || []).filter(isValidTime);
  const exactPart1 = allTimes.filter(t => t.part === 1);
  const nullPart = allTimes.filter(t => t.part === null || t.part === undefined);
  // part=1이 있으면 그것만 사용 (어드민 등록 데이터), 없으면 part=null fallback (레거시)
  const operatingHoursSource = exactPart1.length > 0 ? exactPart1 : nullPart;
  const operatingHoursMap = new Map();
  for (const t of operatingHoursSource) {
    operatingHoursMap.set(t.wday ?? 'unknown', t);
  }
  const operatingHours = Array.from(operatingHoursMap.values());
  const breakTimes = allTimes.filter(t => t.part === 2);
  const temporaryHolidays = storeInfo?.temporary_holiday || [];
  const regularHolidays = storeInfo?.regular_holiday || [];

  // 헤더 텍스트 동적 결정
  const headerTitle = activeTab === 'store'
    ? '매장 정보'
    : activeTab === 'options'
      ? '옵션 현황'
      : '메뉴 현황';

  const headerSub = activeTab === 'store'
    ? (storeName || '정보 없음')
    : activeTab === 'options'
      ? `${menuOptions?.length || 0}개 옵션`
      : `${menuCategories?.length || 0}개 카테고리 · ${totalMenus}개 메뉴${menuOptions?.length > 0 ? ` · ${menuOptions.length}개 옵션` : ''}`;

  const tabs = [
    { key: 'menu', label: '메뉴' },
    { key: 'options', label: '옵션' },
    { key: 'store', label: '매장정보' },
  ];

  return (
    <div
      style={{
        background: colors.white,
        boxShadow: isOpen ? '-1px 0 0 0 #E5E8EB' : 'none',
        width: isOpen ? 288 : 0,
        overflow: isOpen ? 'visible' : 'hidden',
        transition: 'width 0.3s',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        fontFamily: font,
      }}
    >
      {isOpen && (
        <>
          {/* 헤더 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 12px 12px 16px',
              background: colors.white,
              flexShrink: 0,
            }}
          >
            <div style={{ minWidth: 0, flex: 1, marginRight: 8 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: colors.text1,
                  lineHeight: '20px',
                  fontFamily: font,
                }}
              >
                {headerTitle}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: colors.text3,
                  lineHeight: '18px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontFamily: font,
                }}
              >
                {headerSub}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
              <IconButton onClick={onRefresh} disabled={isRefreshing} title="새로고침">
                <RefreshIcon spinning={isRefreshing} />
              </IconButton>
              <IconButton onClick={onToggle} title="닫기">
                <CloseIcon />
              </IconButton>
            </div>
          </div>

          {/* spin keyframe injection */}
          <style>{`
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          `}</style>

          {/* 탭 */}
          <div
            style={{
              display: 'flex',
              borderBottom: `1px solid ${colors.borderLight}`,
              flexShrink: 0,
            }}
          >
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  color: activeTab === tab.key ? colors.primary : colors.text3,
                  fontFamily: font,
                  position: 'relative',
                  transition: 'color 0.15s',
                  textAlign: 'center',
                }}
                onMouseEnter={e => {
                  if (activeTab !== tab.key) e.currentTarget.style.color = colors.text2;
                }}
                onMouseLeave={e => {
                  if (activeTab !== tab.key) e.currentTarget.style.color = colors.text3;
                }}
              >
                {tab.label}
                {activeTab === tab.key && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: 2,
                      background: colors.primary,
                      display: 'block',
                    }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* 콘텐츠 */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              scrollbarWidth: 'thin',
              scrollbarColor: `${colors.border} transparent`,
            }}
          >

            {/* 메뉴 탭 */}
            {activeTab === 'menu' && (
              (!menuCategories || menuCategories.length === 0) ? (
                <div
                  style={{
                    padding: 16,
                    fontSize: 13,
                    color: colors.text3,
                    textAlign: 'center',
                    fontFamily: font,
                  }}
                >
                  메뉴가 없습니다
                </div>
              ) : (
                menuCategories.map(cat => {
                  const isExpanded = expandedCats[cat.id] !== false;
                  const menus = cat.menus || [];

                  return (
                    <div
                      key={cat.id}
                      style={{ borderBottom: `1px solid ${colors.borderLight}` }}
                    >
                      <button
                        onClick={() => toggleCategory(cat.id)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 16px',
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          fontFamily: font,
                          textAlign: 'left',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = colors.bg; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: colors.text1,
                            fontFamily: font,
                          }}
                        >
                          {cat.name}
                        </span>
                        <span
                          style={{
                            fontSize: 12,
                            color: colors.text3,
                            fontFamily: font,
                          }}
                        >
                          {menus.length}개 {isExpanded ? '▾' : '▸'}
                        </span>
                      </button>

                      {isExpanded && menus.length > 0 && (
                        <div style={{ paddingBottom: 8 }}>
                          {menus.map(menu => (
                            <div
                              key={menu.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '6px 16px 6px 24px',
                                fontFamily: font,
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  minWidth: 0,
                                }}
                              >
                                {menu.is_soldout ? (
                                  <span
                                    title="품절"
                                    style={{
                                      flexShrink: 0,
                                      width: 6,
                                      height: 6,
                                      borderRadius: '50%',
                                      background: '#F04452',
                                      display: 'inline-block',
                                    }}
                                  />
                                ) : menu.status === 1 ? (
                                  <span
                                    title="숨김"
                                    style={{
                                      flexShrink: 0,
                                      width: 6,
                                      height: 6,
                                      borderRadius: '50%',
                                      background: colors.text4,
                                      display: 'inline-block',
                                    }}
                                  />
                                ) : (
                                  <span
                                    title="판매중"
                                    style={{
                                      flexShrink: 0,
                                      width: 6,
                                      height: 6,
                                      borderRadius: '50%',
                                      background: '#27C483',
                                      display: 'inline-block',
                                    }}
                                  />
                                )}
                                <span
                                  style={{
                                    fontSize: 13,
                                    color: menu.is_soldout ? '#F04452' : menu.status === 1 ? colors.text3 : colors.text2,
                                    textDecoration: menu.is_soldout ? 'line-through' : 'none',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    fontFamily: font,
                                  }}
                                >
                                  {menu.name}
                                </span>
                              </div>
                              <span
                                style={{
                                  fontSize: 13,
                                  color: colors.text3,
                                  flexShrink: 0,
                                  marginLeft: 8,
                                  fontFamily: font,
                                }}
                              >
                                {menu.price?.toLocaleString()}원
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )
            )}

            {/* 옵션 탭 */}
            {activeTab === 'options' && (
              optionCategoryIds.length === 0 ? (
                <div
                  style={{
                    padding: 16,
                    fontSize: 13,
                    color: colors.text3,
                    textAlign: 'center',
                    fontFamily: font,
                  }}
                >
                  옵션이 없습니다
                </div>
              ) : (
                optionCategoryIds.map(catId => {
                  const opts = optionsByCategory[catId];
                  const isExpanded = expandedCats[`opt_${catId}`] !== false;
                  const groupName = optCatNameMap[catId] || `옵션그룹 #${catId}`;
                  const appliedMenus = optCatMenuMap[catId] || [];

                  return (
                    <div
                      key={catId}
                      style={{ borderBottom: `1px solid ${colors.borderLight}` }}
                    >
                      <button
                        onClick={() => toggleCategory(`opt_${catId}`)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          padding: '10px 16px',
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          fontFamily: font,
                          textAlign: 'left',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = colors.bg; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            width: '100%',
                          }}
                        >
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: colors.text1,
                              fontFamily: font,
                            }}
                          >
                            {groupName}
                          </span>
                          <span
                            style={{
                              fontSize: 12,
                              color: colors.text3,
                              fontFamily: font,
                            }}
                          >
                            {opts.length}개 {isExpanded ? '▾' : '▸'}
                          </span>
                        </div>
                        {appliedMenus.length > 0 && (
                          <span
                            style={{
                              fontSize: 11,
                              color: colors.text3,
                              marginTop: 2,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              width: '100%',
                              fontFamily: font,
                            }}
                          >
                            {appliedMenus.join(', ')}
                          </span>
                        )}
                      </button>

                      {isExpanded && opts.length > 0 && (
                        <div style={{ paddingBottom: 8 }}>
                          {opts.map(opt => (
                            <div
                              key={opt.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '6px 16px 6px 24px',
                                fontFamily: font,
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  minWidth: 0,
                                }}
                              >
                                {opt.is_soldout ? (
                                  <span
                                    title="품절"
                                    style={{
                                      flexShrink: 0,
                                      width: 6,
                                      height: 6,
                                      borderRadius: '50%',
                                      background: '#F04452',
                                      display: 'inline-block',
                                    }}
                                  />
                                ) : opt.status === 1 ? (
                                  <span
                                    title="숨김"
                                    style={{
                                      flexShrink: 0,
                                      width: 6,
                                      height: 6,
                                      borderRadius: '50%',
                                      background: colors.text4,
                                      display: 'inline-block',
                                    }}
                                  />
                                ) : (
                                  <span
                                    title="판매중"
                                    style={{
                                      flexShrink: 0,
                                      width: 6,
                                      height: 6,
                                      borderRadius: '50%',
                                      background: '#27C483',
                                      display: 'inline-block',
                                    }}
                                  />
                                )}
                                <span
                                  style={{
                                    fontSize: 13,
                                    color: opt.is_soldout ? '#F04452' : opt.status === 1 ? colors.text3 : colors.text2,
                                    textDecoration: opt.is_soldout ? 'line-through' : 'none',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    fontFamily: font,
                                  }}
                                >
                                  {opt.name}
                                </span>
                              </div>
                              <span
                                style={{
                                  fontSize: 13,
                                  color: colors.text3,
                                  flexShrink: 0,
                                  marginLeft: 8,
                                  fontFamily: font,
                                }}
                              >
                                {opt.price > 0 ? `+${opt.price.toLocaleString()}원` : '-'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )
            )}

            {/* 매장정보 탭 */}
            {activeTab === 'store' && (
              !storeInfo ? (
                <div
                  style={{
                    padding: 16,
                    fontSize: 13,
                    color: colors.text3,
                    textAlign: 'center',
                    fontFamily: font,
                  }}
                >
                  매장 정보가 없습니다
                </div>
              ) : (
                <div>

                  {/* 기본정보 */}
                  <div style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
                    <div style={{ padding: '12px 16px 6px' }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: colors.text3,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          fontFamily: font,
                        }}
                      >
                        기본정보
                      </span>
                    </div>
                    <div style={{ padding: '0 16px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <span style={{ fontSize: 13, color: colors.text3, flexShrink: 0, width: 56, fontFamily: font }}>매장명</span>
                        <span style={{ fontSize: 13, color: colors.text2, fontFamily: font }}>{storeName || '-'}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <span style={{ fontSize: 13, color: colors.text3, flexShrink: 0, width: 56, fontFamily: font }}>주소</span>
                        <span style={{ fontSize: 13, color: colors.text2, wordBreak: 'break-word', fontFamily: font }}>{address || '-'}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <span style={{ fontSize: 13, color: colors.text3, flexShrink: 0, width: 56, fontFamily: font }}>전화번호</span>
                        <span style={{ fontSize: 13, color: colors.text2, fontFamily: font }}>{tel || '-'}</span>
                      </div>
                    </div>
                  </div>

                  {/* 영업시간 */}
                  <div style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
                    <div style={{ padding: '12px 16px 6px' }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: colors.text3,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          fontFamily: font,
                        }}
                      >
                        영업시간
                      </span>
                    </div>
                    <div style={{ padding: '0 16px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {operatingHours.length === 0 ? (
                        <span style={{ fontSize: 13, color: colors.text3, fontFamily: font }}>정보 없음</span>
                      ) : (
                        operatingHours.map(t => (
                          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span
                              style={{
                                fontSize: 11,
                                color: colors.primary,
                                fontWeight: 600,
                                flexShrink: 0,
                                width: 32,
                                fontFamily: font,
                              }}
                            >
                              {wdayLabel(t.wday)}
                            </span>
                            <span style={{ fontSize: 13, color: colors.text2, fontFamily: font }}>
                              {formatTime(t.start)} ~ {formatTime(t.end)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* 휴게시간 */}
                  {breakTimes.length > 0 && (
                    <div style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
                      <div style={{ padding: '12px 16px 6px' }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: colors.text3,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            fontFamily: font,
                          }}
                        >
                          휴게시간
                        </span>
                      </div>
                      <div style={{ padding: '0 16px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {breakTimes.map(t => (
                          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span
                              style={{
                                fontSize: 11,
                                color: colors.text3,
                                fontWeight: 600,
                                flexShrink: 0,
                                width: 32,
                                fontFamily: font,
                              }}
                            >
                              {wdayLabel(t.wday)}
                            </span>
                            <span style={{ fontSize: 13, color: colors.text2, fontFamily: font }}>
                              {formatTime(t.start)} ~ {formatTime(t.end)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 원산지 */}
                  <div style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
                    <div style={{ padding: '12px 16px 6px' }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: colors.text3,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          fontFamily: font,
                        }}
                      >
                        원산지
                      </span>
                    </div>
                    <div style={{ padding: '0 16px 12px' }}>
                      {!origin ? (
                        <span style={{ fontSize: 13, color: colors.text3, fontFamily: font }}>정보 없음</span>
                      ) : (
                        <>
                          <p
                            style={{
                              fontSize: 13,
                              color: colors.text2,
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              margin: 0,
                              fontFamily: font,
                              overflow: !expandedTexts['origin'] ? 'hidden' : 'visible',
                              display: !expandedTexts['origin'] ? '-webkit-box' : 'block',
                              WebkitLineClamp: !expandedTexts['origin'] ? 3 : 'unset',
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            {origin}
                          </p>
                          {origin.length > 80 && (
                            <button
                              onClick={() => toggleText('origin')}
                              style={{
                                marginTop: 4,
                                fontSize: 11,
                                color: colors.primary,
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 0,
                                fontFamily: font,
                              }}
                            >
                              {expandedTexts['origin'] ? '접기' : '더보기'}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* 주문안내 */}
                  <div style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
                    <div style={{ padding: '12px 16px 6px' }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: colors.text3,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          fontFamily: font,
                        }}
                      >
                        주문안내
                      </span>
                    </div>
                    <div style={{ padding: '0 16px 12px' }}>
                      {!orderInfo ? (
                        <span style={{ fontSize: 13, color: colors.text3, fontFamily: font }}>정보 없음</span>
                      ) : (
                        <>
                          <p
                            style={{
                              fontSize: 13,
                              color: colors.text2,
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              margin: 0,
                              fontFamily: font,
                              overflow: !expandedTexts['orderInfo'] ? 'hidden' : 'visible',
                              display: !expandedTexts['orderInfo'] ? '-webkit-box' : 'block',
                              WebkitLineClamp: !expandedTexts['orderInfo'] ? 3 : 'unset',
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            {orderInfo}
                          </p>
                          {orderInfo.length > 80 && (
                            <button
                              onClick={() => toggleText('orderInfo')}
                              style={{
                                marginTop: 4,
                                fontSize: 11,
                                color: colors.primary,
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 0,
                                fontFamily: font,
                              }}
                            >
                              {expandedTexts['orderInfo'] ? '접기' : '더보기'}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* 휴무일 */}
                  <div style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
                    <div style={{ padding: '12px 16px 6px' }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: colors.text3,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          fontFamily: font,
                        }}
                      >
                        휴무일
                      </span>
                    </div>
                    <div style={{ padding: '0 16px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <span style={{ fontSize: 13, color: colors.text3, flexShrink: 0, width: 56, fontFamily: font }}>임시휴무</span>
                        <span style={{ fontSize: 13, color: colors.text2, fontFamily: font }}>
                          {temporaryHolidays.length === 0
                            ? '-'
                            : temporaryHolidays.map(h => h.date || h).join(', ')
                          }
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <span style={{ fontSize: 13, color: colors.text3, flexShrink: 0, width: 56, fontFamily: font }}>정기휴무</span>
                        <span style={{ fontSize: 13, color: colors.text2, fontFamily: font }}>
                          {regularHolidays.length === 0
                            ? '-'
                            : regularHolidays.map(h => h.name || h.date || h).join(', ')
                          }
                        </span>
                      </div>
                    </div>
                  </div>

                </div>
              )
            )}

          </div>
        </>
      )}
    </div>
  );
};

export default MenuStatePanel;
