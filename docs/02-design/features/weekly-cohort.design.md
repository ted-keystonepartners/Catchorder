# Design: 주간 코호트 잔존율 차트

## 1. 개요

**Plan 참조**: `docs/01-plan/features/weekly-cohort.plan.md`

주간 코호트 잔존율 표를 대시보드에 추가하는 기능의 상세 설계 문서.

## 2. 아키텍처

### 2.1 컴포넌트 구조

```
DashboardPage.jsx
├── State
│   ├── cohortRetentionData (코호트 테이블 데이터)
│   └── cohortRetentionLoading (로딩 상태)
├── Functions
│   ├── getWeekKey() - 주차 키 생성
│   ├── getWeekLabel() - 주차 라벨 생성
│   ├── calculateWeeklyCohort() - 코호트 계산
│   └── getRetentionColor() - 잔존율 색상 반환
└── UI
    └── WeeklyCohortTable (JSX 섹션)
```

### 2.2 데이터 흐름

```
[히트맵 API 응답]
      ↓
stores[] (first_install_completed_at, orders)
      ↓
[calculateWeeklyCohort()]
      ↓
cohortRetentionData[]
      ↓
[WeeklyCohortTable 렌더링]
```

## 3. 상세 설계

### 3.1 State 정의

```javascript
// 코호트 테이블 데이터
const [cohortRetentionData, setCohortRetentionData] = useState([]);
const [cohortRetentionLoading, setCohortRetentionLoading] = useState(false);
```

### 3.2 핵심 함수

#### 3.2.1 getWeekKey(date)
날짜를 주차 키로 변환

```javascript
/**
 * 날짜를 "YYYY-MM-W#" 형식의 주차 키로 변환
 * @param {Date|string} date - 날짜
 * @returns {string} 주차 키 (예: "2024-12-W2")
 */
const getWeekKey = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;

  // 해당 월의 첫째 날
  const firstDayOfMonth = new Date(year, d.getMonth(), 1);
  // 첫째 날의 요일 (0=일, 1=월, ...)
  const firstDayWeekday = firstDayOfMonth.getDay();

  // 주차 계산 (월요일 시작 기준)
  const dayOfMonth = d.getDate();
  const weekNumber = Math.ceil((dayOfMonth + firstDayWeekday) / 7);

  return `${year}-${String(month).padStart(2, '0')}-W${weekNumber}`;
};
```

#### 3.2.2 getWeekLabel(weekKey)
주차 키를 사용자 친화적 라벨로 변환

```javascript
/**
 * 주차 키를 라벨로 변환
 * @param {string} weekKey - 주차 키 (예: "2024-12-W2")
 * @returns {string} 라벨 (예: "12월 2주")
 */
const getWeekLabel = (weekKey) => {
  const [year, month, week] = weekKey.split('-');
  const weekNum = week.replace('W', '');
  return `${parseInt(month)}월 ${weekNum}주`;
};
```

#### 3.2.3 getWeekStartEnd(weekKey)
주차 키의 시작일과 종료일 반환

```javascript
/**
 * 주차 키의 시작일과 종료일 계산
 * @param {string} weekKey - 주차 키
 * @returns {{ start: Date, end: Date }}
 */
const getWeekStartEnd = (weekKey) => {
  const [year, month, week] = weekKey.split('-');
  const weekNum = parseInt(week.replace('W', ''));
  const monthNum = parseInt(month) - 1;

  const firstDayOfMonth = new Date(parseInt(year), monthNum, 1);
  const firstDayWeekday = firstDayOfMonth.getDay();

  // 해당 주차의 시작일 (일요일 기준)
  const startDay = (weekNum - 1) * 7 - firstDayWeekday + 1;
  const start = new Date(parseInt(year), monthNum, Math.max(startDay, 1));

  // 종료일
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return { start, end };
};
```

#### 3.2.4 calculateWeeklyCohort(stores)
코호트 테이블 데이터 생성

```javascript
/**
 * 주간 코호트 잔존율 데이터 계산
 * @param {Array} stores - 매장 목록 (first_install_completed_at, orders 포함)
 * @returns {Array} 코호트 테이블 데이터
 */
const calculateWeeklyCohort = useCallback((stores) => {
  if (!stores || stores.length === 0) return [];

  // 1. 설치완료된 매장만 필터링
  const installedStores = stores.filter(s => s.first_install_completed_at);

  // 2. 설치 주차별로 그룹화
  const cohorts = new Map();
  installedStores.forEach(store => {
    const weekKey = getWeekKey(store.first_install_completed_at);
    if (!cohorts.has(weekKey)) {
      cohorts.set(weekKey, []);
    }
    cohorts.get(weekKey).push(store);
  });

  // 3. 현재 주차 계산
  const currentWeekKey = getWeekKey(new Date());

  // 4. 각 코호트별 주차별 잔존율 계산
  const result = [];
  const sortedWeeks = Array.from(cohorts.keys()).sort();

  sortedWeeks.forEach(weekKey => {
    const cohortStores = cohorts.get(weekKey);
    const week0Count = cohortStores.length;

    const row = {
      weekKey,
      label: getWeekLabel(weekKey),
      week0: { count: week0Count, rate: 100 },
      weeks: []
    };

    // Week 1 ~ Week N 계산
    const { start: cohortStart } = getWeekStartEnd(weekKey);
    let weekOffset = 1;
    let checkDate = new Date(cohortStart);
    checkDate.setDate(checkDate.getDate() + 7);

    while (getWeekKey(checkDate) <= currentWeekKey && weekOffset <= 12) {
      const { start, end } = getWeekStartEnd(getWeekKey(checkDate));

      // 해당 주차에 주문이 1건 이상인 매장 수
      const activeCount = cohortStores.filter(store => {
        if (!store.orders) return false;

        // 해당 주차 범위 내 주문 확인
        return Object.entries(store.orders).some(([date, count]) => {
          const orderDate = new Date(date);
          return orderDate >= start && orderDate <= end && count > 0;
        });
      }).length;

      row.weeks.push({
        weekOffset,
        count: activeCount,
        rate: Math.round((activeCount / week0Count) * 100)
      });

      checkDate.setDate(checkDate.getDate() + 7);
      weekOffset++;
    }

    result.push(row);
  });

  return result;
}, []);
```

#### 3.2.5 getRetentionColor(rate)
잔존율에 따른 배경색 반환

```javascript
/**
 * 잔존율에 따른 배경색 반환
 * @param {number} rate - 잔존율 (0-100)
 * @returns {string} 배경색 hex
 */
const getRetentionColor = (rate) => {
  if (rate >= 90) return '#dcfce7'; // 연한 초록
  if (rate >= 70) return '#fef9c3'; // 연한 노랑
  if (rate >= 50) return '#fed7aa'; // 연한 주황
  if (rate >= 30) return '#fecaca'; // 연한 빨강
  return '#fee2e2'; // 진한 빨강
};
```

### 3.3 useEffect - 데이터 로드

```javascript
// 히트맵 데이터가 로드되면 코호트 계산
useEffect(() => {
  if (heatmapData?.stores) {
    setCohortRetentionLoading(true);
    const cohortData = calculateWeeklyCohort(heatmapData.stores);
    setCohortRetentionData(cohortData);
    setCohortRetentionLoading(false);
  }
}, [heatmapData, calculateWeeklyCohort]);
```

### 3.4 UI 컴포넌트 (JSX)

```jsx
{/* 주간 코호트 잔존율 표 */}
<div style={{
  backgroundColor: 'white',
  borderRadius: '12px',
  padding: '20px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  marginTop: '24px'
}}>
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
    <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: 0 }}>
      주간 코호트 잔존율
    </h3>
    <span style={{ fontSize: '12px', color: '#6b7280' }}>
      * 해당 주차에 주문 1건 이상 발생한 매장
    </span>
  </div>

  {cohortRetentionLoading ? (
    <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: '#6b7280' }}>로딩 중...</span>
    </div>
  ) : cohortRetentionData.length > 0 ? (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr>
            <th style={{
              padding: '10px 12px',
              textAlign: 'left',
              fontWeight: '600',
              color: '#374151',
              backgroundColor: '#f9fafb',
              borderBottom: '2px solid #e5e7eb',
              position: 'sticky',
              left: 0,
              minWidth: '100px'
            }}>
              설치 주차
            </th>
            <th style={{
              padding: '10px 12px',
              textAlign: 'center',
              fontWeight: '600',
              color: '#374151',
              backgroundColor: '#f9fafb',
              borderBottom: '2px solid #e5e7eb',
              minWidth: '90px'
            }}>
              Week 0
            </th>
            {/* 동적 Week 헤더 */}
            {cohortRetentionData[0]?.weeks?.map((_, idx) => (
              <th key={`week-${idx + 1}`} style={{
                padding: '10px 12px',
                textAlign: 'center',
                fontWeight: '600',
                color: '#374151',
                backgroundColor: '#f9fafb',
                borderBottom: '2px solid #e5e7eb',
                minWidth: '90px'
              }}>
                Week {idx + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cohortRetentionData.map((row, rowIdx) => (
            <tr key={row.weekKey}>
              <td style={{
                padding: '10px 12px',
                fontWeight: '500',
                color: '#111827',
                backgroundColor: 'white',
                borderBottom: '1px solid #e5e7eb',
                position: 'sticky',
                left: 0
              }}>
                {row.label}
              </td>
              <td style={{
                padding: '10px 12px',
                textAlign: 'center',
                backgroundColor: getRetentionColor(100),
                borderBottom: '1px solid #e5e7eb',
                fontWeight: '600'
              }}>
                {row.week0.count} (100%)
              </td>
              {row.weeks.map((week, weekIdx) => (
                <td key={`${row.weekKey}-w${weekIdx}`} style={{
                  padding: '10px 12px',
                  textAlign: 'center',
                  backgroundColor: getRetentionColor(week.rate),
                  borderBottom: '1px solid #e5e7eb',
                  fontWeight: week.rate >= 70 ? '600' : '400',
                  color: week.rate >= 50 ? '#166534' : '#991b1b'
                }}>
                  {week.count} ({week.rate}%)
                </td>
              ))}
              {/* 미래 주차는 빈 셀로 표시 */}
              {Array.from({ length: Math.max(0, (cohortRetentionData[0]?.weeks?.length || 0) - row.weeks.length) }).map((_, emptyIdx) => (
                <td key={`${row.weekKey}-empty-${emptyIdx}`} style={{
                  padding: '10px 12px',
                  textAlign: 'center',
                  backgroundColor: '#f9fafb',
                  borderBottom: '1px solid #e5e7eb',
                  color: '#d1d5db'
                }}>
                  -
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: '#6b7280' }}>데이터가 없습니다</span>
    </div>
  )}
</div>
```

## 4. 구현 순서

| 순서 | 작업 | 파일 | 예상 LOC |
|------|------|------|----------|
| 1 | State 추가 | DashboardPage.jsx | 2 |
| 2 | 유틸 함수 추가 (getWeekKey, getWeekLabel 등) | DashboardPage.jsx | 40 |
| 3 | calculateWeeklyCohort 함수 추가 | DashboardPage.jsx | 60 |
| 4 | getRetentionColor 함수 추가 | DashboardPage.jsx | 8 |
| 5 | useEffect 추가 | DashboardPage.jsx | 8 |
| 6 | UI 컴포넌트 추가 | DashboardPage.jsx | 100 |

**총 예상 LOC**: ~220줄

## 5. 삽입 위치

DashboardPage.jsx 내 **"월별 설치 코호트 분석"** 섹션 바로 아래에 추가.

```
[기존 코드]
...
{/* 월별 설치 코호트 분석 (Sankey 차트) */}
...

{/* === 여기에 추가 === */}
{/* 주간 코호트 잔존율 표 */}
...
```

## 6. 테스트 시나리오

| 시나리오 | 예상 결과 |
|----------|----------|
| 데이터 없음 | "데이터가 없습니다" 표시 |
| 1개 코호트 | 1행 표시, Week 0만 100% |
| 다중 코호트 | 각 주차별 잔존율 계산 정확 |
| 주문 없는 주차 | 0 (0%) 표시 |
| 현재 주차 | 아직 끝나지 않은 주차도 계산 |

## 7. 색상 가이드

| 잔존율 | 배경색 | 텍스트 색상 |
|--------|--------|------------|
| 90-100% | `#dcfce7` (연초록) | `#166534` (진초록) |
| 70-89% | `#fef9c3` (연노랑) | `#166534` (진초록) |
| 50-69% | `#fed7aa` (연주황) | `#166534` (진초록) |
| 30-49% | `#fecaca` (연빨강) | `#991b1b` (진빨강) |
| 0-29% | `#fee2e2` (진빨강) | `#991b1b` (진빨강) |

---

**작성일**: 2026-02-10
**작성자**: AI Assistant
**상태**: Draft
