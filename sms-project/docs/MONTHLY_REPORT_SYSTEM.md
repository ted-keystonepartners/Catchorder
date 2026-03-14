# 월간 리포트 시스템

## 개요

QR오더 프로젝트의 성과를 기간별로 분석하고 전략 현황을 한눈에 파악할 수 있는 리포트 시스템.

- **URL**: `/reports`
- **권한**: ADMIN 전용
- **핵심 개념**: "기간 선택 → 데이터 조회 → AI 요약 → 렌더링"

---

## Phase 1: UI 구현 (완료)

### 파일 구조
```
src/
├── pages/
│   └── ReportsPage.jsx              # 메인 페이지 (기간 선택 + 섹션 렌더링)
└── components/
    └── Reports/
        ├── KPISummarySection.jsx    # KPI 카드 4개 + AI 요약 텍스트
        ├── FunnelSection.jsx        # 퍼널 차트 + 월별 전환율 추이
        ├── CohortForecastSection.jsx # 코호트 히트맵 + 미래 예측
        ├── KeyTaskSection.jsx       # Key Task > Action Item > 실행내용
        └── TimelineSection.jsx      # 간트 차트 (클릭 시 하위 펼침)
```

### 기간 선택기
- 시작일 / 종료일 직접 입력
- 프리셋 버튼: 이번주, 이번달, 지난달, 분기, 누적
- "리포트 생성" 버튼 클릭 시 데이터 로드

### 섹션별 구성

#### 1. KPI Summary
| KPI | 설명 |
|-----|-----|
| 누적 가입 | 기간 내 신규 가입 수 |
| 이용 전환율 | 가입 → 이용 전환 비율 |
| 현재 잔존 | 현재 이용중인 매장 수 |
| 목표 Gap | 목표 70% 대비 차이 |

+ AI 요약 텍스트 (기간별 인사이트)

#### 2. 퍼널 현황
- 가로 바 차트: 영업시도 → 신규가입 → 정보수집 → 설치 → 이용
- 라인 차트: 월별 단계별 전환율 추이
- 인사이트 텍스트

#### 3. 코호트 & 예측
- 히트맵 테이블: 설치월별 M+0 ~ M+4 잔존율
- Stacked Area 차트: 기존 유지 + 신규 유입 누적 예측
- 마일스톤 텍스트

#### 4. Key Task 현황
```
▼ Key Task: 신규 가입 전환율 개선                              진행중
│
├── ▼ Action Item: 24시간 내 팔로업                              완료
│       ┌─────────────────────────────────────────────────┐
│       │ 2/15 - 콜 스크립트 작성 완료...                  │
│       │ 2/18 - 팀 교육 진행...                          │
│       │ [수정]                                          │
│       └─────────────────────────────────────────────────┘
│
├── ▶ Action Item: 모니터링 대시보드                           진행중
└── ▶ Action Item: 실패 원인 분석                               대기
```

#### 5. 타임라인
```
Task                       1월    2월    3월    4월    5월    6월    상태
─────────────────────────────────────────────────────────────────────────
▼ 신규 가입 전환율 개선    ████████████████████                  진행중
   24시간 내 팔로업        ░░░░░░░░░░░░                          완료
   모니터링 대시보드            ░░░░░░░░░░░░                     진행중
```

### 디자인 시스템
| 요소 | 값 |
|-----|-----|
| 메인 컬러 | #FF3D00 (주황) |
| 완료 | 초록 #16a34a (진함) / #86efac (연함) |
| 진행중 | 주황 #FF3D00 (진함) / #fdba74 (연함) |
| 대기 | 회색 #d1d5db (진함) / #e5e7eb (연함) |
| 카드 radius | 12px |
| 버튼 radius | 8px |
| 그림자 | 0 1px 3px rgba(0,0,0,0.08) |

---

## Phase 2: API 연동 (완료)

### 구현 파일
```
src/
└── api/
    └── reportsApi.js    # 리포트 전용 API 모듈
```

### 기간 선택 로직
| 섹션 | 로직 |
|-----|-----|
| 퍼널/KPI | 선택 기간 내 데이터 집계 |
| 코호트 | 전체 코호트 표시, end_date 기준 잔존율 계산 |
| 예측 | end_date 이후 미래 예측 |

### 필요 API

#### 1. 리포트 요약 (신규)
```
GET /api/reports/summary?start_date=2025-02-01&end_date=2025-02-28

Response:
{
  total_signups: 150,
  conversion_rate: 58.3,
  active_stores: 480,
  target_gap: -11.7
}
```

#### 2. 퍼널 데이터 (신규)
```
GET /api/reports/funnel?start_date=2025-02-01&end_date=2025-02-28

Response:
{
  funnel: [
    { stage: "영업시도", count: 320, rate: 100 },
    { stage: "신규가입", count: 150, rate: 46.9 },
    { stage: "정보수집", count: 90, rate: 60.0 },
    { stage: "설치", count: 70, rate: 77.8 },
    { stage: "이용", count: 63, rate: 90.0 }
  ],
  monthly_trend: [
    { month: "2024-11", signup: 45, collection: 55, install: 72, usage: 88 },
    { month: "2024-12", signup: 47, collection: 58, install: 75, usage: 89 },
    ...
  ]
}
```

#### 3. 코호트 (기존 재활용)
```
GET /api/dashboard?view=monthly_cohort_retention&end_date=2025-02-28

(기존 DashboardPage에서 사용중인 API 그대로 활용)
```

### 프론트엔드 구현 완료 (Mock 데이터 포함)
- [x] `src/api/reportsApi.js` - 리포트 API 모듈 생성
- [x] `getReportSummary()` - KPI 요약 데이터 (API 미구현시 Mock)
- [x] `getReportFunnel()` - 퍼널 데이터 (API 미구현시 Mock)
- [x] `getReportCohort()` - 코호트 잔존율 (기존 API 재활용)
- [x] `getKeyTasks()` - Key Task 목록 (API 미구현시 Mock)
- [x] 모든 컴포넌트 API 연동 및 로딩 상태 구현

### 백엔드 구현 필요 사항 (추후)
- [ ] `/api/reports/summary` 엔드포인트 추가 (Lambda)
- [ ] `/api/reports/funnel` 엔드포인트 추가 (Lambda)
- [ ] `/api/reports/tasks` CRUD 엔드포인트 추가 (Lambda)
- [ ] 기존 코호트 API에 `end_date` 파라미터 지원 확인

---

## Phase 3: AI 요약 연동 (예정)

### 구현 방식
1. 리포트 데이터 조회 완료 후
2. 데이터를 프롬프트에 포함하여 AI 호출
3. 응답을 KPISummarySection에 표시

### 프롬프트 템플릿
```
다음 QR오더 프로젝트 데이터를 분석하여 3-4문장으로 요약해주세요.

기간: {start_date} ~ {end_date}
신규 가입: {total_signups}건 (전월 대비 {signup_change}%)
이용 전환율: {conversion_rate}% (목표 70%)
병목 구간: {bottleneck_stage} (전환율 {bottleneck_rate}%)
현재 코호트 M+1 잔존율: {m1_retention}%

핵심 인사이트와 개선 방향을 포함해주세요.
```

---

## Phase 4: Key Task CRUD (예정)

### 데이터 구조
```sql
-- key_tasks 테이블
CREATE TABLE key_tasks (
  id UUID PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  owner VARCHAR(100),
  status VARCHAR(20), -- 'done', 'inprogress', 'waiting'
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- action_items 테이블
CREATE TABLE action_items (
  id UUID PRIMARY KEY,
  key_task_id UUID REFERENCES key_tasks(id),
  title VARCHAR(255) NOT NULL,
  status VARCHAR(20),
  content TEXT, -- 실행 내용 (마크다운)
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### 필요 API
- `GET /api/reports/tasks` - 목록 조회
- `POST /api/reports/tasks` - Key Task 생성
- `PUT /api/reports/tasks/:id` - Key Task 수정
- `DELETE /api/reports/tasks/:id` - Key Task 삭제
- `POST /api/reports/tasks/:id/actions` - Action Item 추가
- `PUT /api/reports/actions/:id` - Action Item 수정 (content 포함)

---

## 향후 확장 (Phase 5+)

### 1. 업무 자동 분류 (AI)
- 채팅창에 업무 내용/파일 입력
- AI가 적절한 Key Task / Action Item에 자동 분류
- 실행 내용에 자동 추가

### 2. PDF 내보내기
- 현재 리포트를 PDF로 다운로드
- 공유용 링크 생성

### 3. 알림 연동
- 주간/월간 리포트 자동 생성
- 슬랙/이메일로 발송

---

## 변경 이력

| 날짜 | 내용 |
|-----|-----|
| 2025-03-07 | Phase 1 UI 구현 완료 |
| 2025-03-07 | Phase 2 API 연동 완료 (Mock 데이터 포함) |
