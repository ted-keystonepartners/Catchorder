/**
 * 캐치테이블로 채팅 시스템 프롬프트 생성
 * Claude API에 전달할 시스템 프롬프트를 메뉴 상태 + API 스펙으로 구성
 */

/**
 * 메뉴 상태를 요약 텍스트로 변환
 * @param {Array} menuCategories - 메뉴 카테고리 배열
 * @returns {string} 요약 텍스트
 */
function summarizeMenu(menuCategories) {
  if (!menuCategories || menuCategories.length === 0) {
    return '등록된 메뉴가 없습니다.';
  }

  const lines = [];
  for (const cat of menuCategories) {
    const menus = cat.menus || [];
    lines.push(`\n[카테고리: ${cat.name}] (id: ${cat.id})`);
    for (const menu of menus) {
      const soldout = menu.is_soldout ? ' [품절]' : '';
      const hidden = menu.status === 1 ? ' [숨김]' : menu.status === 2 ? ' [삭제]' : '';
      const price = menu.price ? `${menu.price.toLocaleString()}원` : '가격미정';
      lines.push(`  - ${menu.name} (id: ${menu.id}) | ${price} | 원가: ${menu.original_price?.toLocaleString() || '-'}원${soldout}${hidden}`);
      if (menu.content) {
        lines.push(`    설명: ${menu.content}`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * 옵션 상태를 요약 텍스트로 변환
 * @param {Array} options - 옵션 배열
 * @param {Array} menuCategories - 메뉴 카테고리 (옵션카테고리 ID 매핑용)
 * @returns {string} 요약 텍스트
 */
function summarizeOptions(options, menuCategories) {
  if (!options || options.length === 0) {
    return '등록된 옵션이 없습니다.';
  }

  // 옵션 카테고리 ID별로 그룹핑
  const grouped = {};
  for (const opt of options) {
    const catId = opt.menu_option_category_id;
    if (!grouped[catId]) grouped[catId] = [];
    grouped[catId].push(opt);
  }

  // 메뉴에서 옵션 카테고리 사용처 찾기
  const catMenuMap = {};
  if (menuCategories) {
    for (const cat of menuCategories) {
      for (const menu of (cat.menus || [])) {
        const ids = typeof menu.menu_option_category_ids === 'string'
          ? JSON.parse(menu.menu_option_category_ids || '[]')
          : (menu.menu_option_category_ids || []);
        for (const ocId of ids) {
          if (!catMenuMap[ocId]) catMenuMap[ocId] = [];
          catMenuMap[ocId].push(menu.name);
        }
      }
    }
  }

  const lines = [];
  for (const [catId, opts] of Object.entries(grouped)) {
    const menus = catMenuMap[catId];
    const menuInfo = menus ? ` → 적용 메뉴: ${menus.join(', ')}` : '';
    lines.push(`\n[옵션그룹 id: ${catId}]${menuInfo}`);
    for (const opt of opts) {
      const soldout = opt.is_soldout ? ' [품절]' : '';
      const hidden = opt.status === 1 ? ' [숨김]' : opt.status === 2 ? ' [삭제]' : '';
      const price = opt.price ? `+${opt.price.toLocaleString()}원` : '추가금없음';
      lines.push(`  - ${opt.name} (id: ${opt.id}) | ${price}${soldout}${hidden}`);
    }
  }

  return lines.join('\n');
}

/**
 * 매장 정보 요약 (상세)
 * @param {Object} store - 매장 데이터
 * @returns {string}
 */
function summarizeStore(store) {
  if (!store || !store.id) return '매장 정보 없음';

  const parts = [
    `매장 ID: ${store.id}`,
    store.name || store.brand_store_name ? `매장명: ${store.name || store.brand_store_name}` : null,
    store.address ? `주소: ${store.address} ${store.detail_address || ''}` : null,
    store.tel ? `전화: ${store.tel}` : null,
  ].filter(Boolean);

  // 원산지
  if (store.origin) {
    parts.push(`원산지: ${store.origin}`);
  }

  // 주문안내
  if (store.order_info) {
    parts.push(`주문안내: ${store.order_info}`);
  }

  // 영업시간: part===1 우선, 없으면 part===null fallback + 무효 시간 제거
  const isValidTime = (t) => t.start && t.end && !(t.start === t.end) && !(t.start === '00:00:00' && t.end === '00:00:00');
  if (store.brand_store_time && store.brand_store_time.length > 0) {
    const allValid = store.brand_store_time.filter(isValidTime);
    const exactPart1 = allValid.filter(t => t.part === 1);
    const nullPart = allValid.filter(t => t.part === null || t.part === undefined);
    const opTimes = exactPart1.length > 0 ? exactPart1 : nullPart;
    const breakTimes = allValid.filter(t => t.part === 2);
    if (opTimes.length > 0) {
      const opStr = opTimes.map(t => {
        const dayLabel = t.wday === 1 ? '평일' : t.wday === 2 ? '주말' : `wday${t.wday}`;
        return `${dayLabel} ${t.start?.substring(0,5)}~${t.end?.substring(0,5)}`;
      }).join(', ');
      parts.push(`영업시간: ${opStr}`);
    }
    if (breakTimes.length > 0) {
      const brStr = breakTimes.map(t => {
        const dayLabel = t.wday === 1 ? '평일' : t.wday === 2 ? '주말' : `wday${t.wday}`;
        return `${dayLabel} ${t.start?.substring(0,5)}~${t.end?.substring(0,5)}`;
      }).join(', ');
      parts.push(`휴게시간: ${brStr}`);
    }
  }

  // 공휴일
  if (store.temporary_holiday && store.temporary_holiday.length > 0) {
    const holidays = store.temporary_holiday.map(h => h.date || h).join(', ');
    parts.push(`임시휴무: ${holidays}`);
  }
  if (store.regular_holiday && store.regular_holiday.length > 0) {
    const holidays = store.regular_holiday.map(h => h.name || h.day || h).join(', ');
    parts.push(`정기휴무: ${holidays}`);
  }

  return parts.join('\n');
}

/**
 * 시스템 프롬프트 생성
 * @param {Object} params
 * @param {Array} params.menuCategories - 메뉴 카테고리 데이터
 * @param {Object} params.store - 매장 정보
 * @param {string} params.brandStoreId - brand_store_id
 * @param {Array} params.menuOptions - 메뉴 옵션 데이터
 * @returns {string} 시스템 프롬프트
 */
export function buildSystemPrompt({ menuCategories, store, brandStoreId, menuOptions }) {
  return `당신은 캐치테이블로 매장 관리 도우미입니다.
관리자가 자연어로 요청하면, 적절한 캐치테이블로 API 액션을 JSON으로 생성합니다.

## 현재 매장 정보
${summarizeStore(store)}
brand_store_id: ${brandStoreId}

## 현재 메뉴 상태
${summarizeMenu(menuCategories)}

## 현재 옵션 상태
${summarizeOptions(menuOptions, menuCategories)}

## 사용 가능한 API 액션

### 메뉴 관리
| 작업 | method | path | 설명 |
|------|--------|------|------|
| 메뉴 조회 | GET | /menu/categories?brand_store_id={brand_store_id} | 전체 메뉴 목록 |
| 메뉴 추가 | POST | /menu_category/{cat_id}/menu | 카테고리에 메뉴 추가 (body: name, price, content) |
| 메뉴 수정 | POST | /menu_category/{cat_id}/menu/{menu_id} | 메뉴 정보 수정 (body에 name, price 필수 - 이름만 바꿔도 현재 price 포함) |
| 품절 처리 | PUT | /menu/{menu_id}/soldout/1/{brand_store_id} | 메뉴 품절 설정 |
| 품절 해제 | PUT | /menu/{menu_id}/soldout/0/{brand_store_id} | 메뉴 품절 해제 |
| 메뉴 숨김 | PUT | /menu/status/{menu_id} | body: {status: 1} |
| 메뉴 표시 | PUT | /menu/status/{menu_id} | body: {status: 0} |
| 메뉴 삭제 | PUT | /menu/status/{menu_id} | body: {status: 2} (soft delete) |
| 카테고리 추가 | POST | /menu_category | body: {name, brand_store_id} |
| 카테고리 수정 | PUT | /menu_category/{id} | body: {name} |
| 카테고리 삭제 | - | - | ⚠️ 현재 API 서버 버그로 지원 불가. 삭제 요청 시 안내 메시지 반환 |
| 대표메뉴 설정 | POST | /rep_menu | body: {menu_id, brand_store_id} |
| 대표메뉴 해제 | DELETE | /rep_menu | body: {menu_id, brand_store_id} |

### 옵션 관리
| 작업 | method | path | 설명 |
|------|--------|------|------|
| 옵션 조회 | GET | /menu/option?brand_store_id={brand_store_id} | 전체 옵션 목록 |
| 옵션 품절 | PUT | /menu/option/{option_id}/soldout/1/{brand_store_id} | 옵션 품절 설정 |
| 옵션 품절해제 | PUT | /menu/option/{option_id}/soldout/0/{brand_store_id} | 옵션 품절 해제 |
| 옵션 숨김 | PUT | /menu/option/status/{option_id} | body: {status: 1} |
| 옵션 표시 | PUT | /menu/option/status/{option_id} | body: {status: 0} |
| 옵션 삭제 | PUT | /menu/option/status/{option_id} | body: {status: 2} (soft delete) |
| 옵션 생성 | - | - | ⚠️ 현재 API 서버 버그로 지원 불가. 생성 요청 시 안내 메시지 반환 |
| 옵션 수정 | - | - | ⚠️ 현재 API 서버 버그로 지원 불가. 수정 요청 시 안내 메시지 반환 |

### 매장 정보 관리
| 작업 | method | path | 설명 |
|------|--------|------|------|
| 매장 조회 | GET | /brand_store?brand_store_id={brand_store_id} | 매장 상세 정보 |
| 원산지 변경 | PUT | /brand_store/origin | body: {brand_store_id, origin: "원산지 텍스트"} |
| 주문안내 변경 | PUT | /brand_store/order_info | body: {brand_store_id, order_info: "안내 텍스트"} |
| 영업시간 변경 | POST | /brand_store_time/update | body: {brand_store_id, part: 1, time: [{wday:1,start:"09:00:00",end:"22:00:00"},{wday:2,start:"10:00:00",end:"21:00:00"}]} (part=1:영업시간, part=2:휴게시간, wday=1:평일, wday=2:주말, wday=3:휴일) ⚠️ 중요: time 배열에 반드시 모든 요일(평일/주말/휴일)을 포함해야 함. 영업하지 않는 요일은 start:"00:00:00",end:"00:00:00"으로 설정. 예: 평일만 영업 시 [{wday:1,start:"10:00:00",end:"22:00:00"},{wday:2,start:"00:00:00",end:"00:00:00"}]. 현재 영업시간 정보를 기반으로 변경할 요일만 수정하고 나머지는 기존 값 유지 |
| 임시휴무 설정 | POST | /brand_store_holiday/update | body: {brand_store_id, brand_store_holiday: ["20260320","20260321"]} (날짜는 YYYYMMDD 형식 배열) |
| 임시휴무 해제 | POST | /brand_store_holiday/update | body: {brand_store_id, brand_store_holiday: []} (빈 배열로 전체 해제) |

### 조회 전용
| 작업 | method | path |
|------|--------|------|
| 주문 조회 | GET | /order?brand_store_id={brand_store_id} |
| 미확인 주문 수 | GET | /order/count?brand_store_id={brand_store_id} |
| 인기메뉴 통계 | GET | /stat_daily_sell_menu_v1?brand_store_id={brand_store_id} |
| 리뷰 조회 | GET | /order_review/{type}?brand_store_id={brand_store_id} |
| 별점 평균 | GET | /stat_review_point?brand_store_id={brand_store_id} |

## 응답 규칙

1. 반드시 아래 JSON 스키마로만 응답하세요. 다른 텍스트는 message 필드에 넣으세요.
2. 조회 요청(GET)은 risk_level을 "safe"로, 변경 요청은 "normal"로 설정하세요.
3. 메뉴 이름으로 요청이 오면 위 메뉴 상태에서 정확한 menu_id를 찾아 사용하세요.
4. 일괄삭제, 결제취소, 회원가입, 비밀번호 변경은 절대 생성하지 마세요.
5. 해당하는 메뉴를 찾을 수 없으면 actions를 비우고 message로 안내하세요.
7. 옵션 이름으로 요청이 오면 위 옵션 상태에서 정확한 option_id를 찾아 사용하세요.
6. brand_store_id는 항상 ${brandStoreId}를 사용하세요. **모든 POST/PUT 요청의 body에 반드시 brand_store_id를 포함**하세요 (인증에 필수).
8. **연쇄 액션**: 카테고리 생성 후 그 카테고리에 메뉴를 추가하는 등 이전 액션 결과의 ID가 필요하면, params에서 해당 값을 **"$prev"**로 설정하세요. 시스템이 자동으로 이전 액션에서 생성된 ID로 치환합니다.
   예시: 카테고리 생성(POST /menu_category) 후 메뉴 추가 시 params: {"cat_id": "$prev"}

## 응답 JSON 스키마
\`\`\`json
{
  "message": "사용자에게 보여줄 자연어 설명",
  "actions": [
    {
      "type": "api_call",
      "method": "GET|POST|PUT|DELETE",
      "path": "/api/path",
      "params": { "key": "value" },
      "body": { "key": "value" },
      "description": "이 액션이 하는 일 설명",
      "risk_level": "safe|normal"
    }
  ],
  "requires_confirmation": true
}
\`\`\`

조회만 하는 경우 requires_confirmation은 false, 변경이 있으면 true로 설정하세요.`;
}

/**
 * 대화 맥락용 메시지 빌드
 * @param {string} userMessage - 사용자 입력
 * @param {Array} chatHistory - 이전 대화 (role, content 배열)
 * @returns {Array} Claude messages 배열
 */
export function buildMessages(userMessage, chatHistory = []) {
  const messages = [];

  // 이전 대화 추가 (최근 10턴만)
  const recentHistory = chatHistory.slice(-20); // role+content 쌍이므로 20개 = 10턴
  for (const msg of recentHistory) {
    messages.push({
      role: msg.role,
      content: msg.content
    });
  }

  // 현재 사용자 메시지
  messages.push({
    role: 'user',
    content: userMessage
  });

  return messages;
}
