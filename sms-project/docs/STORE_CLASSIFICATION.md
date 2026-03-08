# 매장 분류 및 KPI 집계 방식

> 최종 업데이트: 2026-03-08

## 1. 매장 상태 (DB Status)

### 설치완료 상태 (INSTALL_COMPLETED)
```javascript
const INSTALL_COMPLETED = ["QR_MENU_INSTALL", "SERVICE_TERMINATED", "UNUSED_TERMINATED", "DEFECT_REPAIR"];
```

### 해지 상태 (CHURNED)
```javascript
const CHURNED = ["SERVICE_TERMINATED", "UNUSED_TERMINATED"];
```

### 보류 상태 (HOLD)
```javascript
const HOLD_STATUSES = ['PENDING', 'REVISIT_SCHEDULED', 'INFO_REQUEST',
  'REMOTE_INSTALL_SCHEDULED', 'ADMIN_SETTING', 'QR_LINKING', 'PRE_INTRODUCTION'];
```

---

## 2. 매장 분류 기준

### 분류 매트릭스

| 설치 이력 | 이용 기록 | 최근 30일 이용 | 분류 | 처리 |
|-----------|-----------|----------------|------|------|
| O | O | O | **정상 이용** | QR_MENU_INSTALL 유지 |
| O | O | X | **이용 후 미이용** | 상황에 따라 판단 |
| O | X | - | **미이용 보류** | 설치 후 미사용 |
| X | O | O | **미설치 이용** | → QR_MENU_INSTALL 변경 |
| X | O | X | **미설치 후 탈퇴** | → UNUSED_TERMINATED 변경 |
| X | X | - | **미설치 보류** | PENDING 유지 |

### 분류 정의

1. **미설치 보류**
   - 조건: 설치 이력 X + 이용 기록 X
   - 상태: PENDING, PRE_INTRODUCTION 등
   - 설명: 아직 설치가 진행되지 않은 매장

2. **미이용 보류**
   - 조건: 설치 이력 O + 이용 기록 X
   - 상태: QR_MENU_INSTALL 또는 PENDING
   - 설명: 설치는 완료했지만 한 번도 사용하지 않은 매장

3. **탈퇴 (이용 후)**
   - 조건: 이용 기록 O + 최근 30일 이용 X
   - 상태: → UNUSED_TERMINATED 또는 SERVICE_TERMINATED
   - 설명: 사용하다가 그만둔 매장

---

## 3. KPI 집계 방식

### 전체매장 (registered)
```
전체매장 = 모든 매장 수
```

### 설치매장 (install_completed)
```
설치매장 = INSTALL_COMPLETED 상태인 매장 수
         = QR_MENU_INSTALL + SERVICE_TERMINATED + UNUSED_TERMINATED + DEFECT_REPAIR
```
- **해지 포함**: 설치매장에는 해지된 매장도 포함됨 (누적 설치 수)

### 이용매장 (active)
```
이용매장 = 설치완료 상태 + 최근 30일 내 주문 발생
         = install_detail.active
```
- **주의**: `active_not_completed`는 제외 (설치 미완료 상태)

### 해지 (churned)
```
해지 = SERVICE_TERMINATED + UNUSED_TERMINATED
```

### 전환율
```
이용률 = (이용매장 / 설치매장) * 100
해지율 = (해지 / 설치매장) * 100
```

---

## 4. install_detail 구조

```javascript
install_detail: {
  // 설치완료 그룹
  active: [],           // QR_MENU_INSTALL + 최근 30일 주문 O
  inactive: [],         // QR_MENU_INSTALL + 최근 30일 주문 X (미이용)
  churned_service: [],  // SERVICE_TERMINATED (서비스 해지)
  churned_unused: [],   // UNUSED_TERMINATED (미사용 해지)
  repair: [],           // DEFECT_REPAIR (수리 중)

  // 미설치 그룹
  pending: [],          // PENDING (보류)
  active_not_completed: [] // 설치 미완료 + 주문 O (이상 케이스)
}
```

---

## 5. 데이터 정합성 규칙

### 중복 레코드 방지
- 동일 `seq`로 여러 레코드 존재 시 중복으로 판단
- 최신 `updated_at` 기준 정상 레코드 유지, 나머지 삭제

### active_not_completed 처리
- 설치 미완료 + 이용 기록 있음 = 이상 케이스
- 최근 30일 이용 O → QR_MENU_INSTALL로 변경
- 최근 30일 이용 X → UNUSED_TERMINATED로 변경

### 상태 변경 이력
| 변경 전 | 변경 후 | 조건 |
|---------|---------|------|
| PENDING | QR_MENU_INSTALL | 최근 30일 이용 O |
| PENDING | UNUSED_TERMINATED | 과거 이용 O + 최근 30일 X |
| QR_LINKING | QR_MENU_INSTALL | 최근 30일 이용 O |

---

## 6. Lambda 코드 참조

파일: `/lambda-fix/index.mjs`

```javascript
// 상태 분류 (line 47-50)
const INSTALL_COMPLETED = ["QR_MENU_INSTALL", "SERVICE_TERMINATED", "UNUSED_TERMINATED", "DEFECT_REPAIR"];
const CHURNED = ["SERVICE_TERMINATED", "UNUSED_TERMINATED"];

// 이용매장 판단 (line 280-284)
if (hasOrder) {
  activeStores++;
  ownerStats[ownerId].active++;
}

// 해지 판단 (line 286-290)
if (CHURNED.includes(status)) {
  totalChurned++;
  ownerStats[ownerId].churned++;
}
```

---

## 7. 프론트엔드 KPI 표시 (KPISummarySection.jsx)

```javascript
// 이용매장 계산 (active_not_completed 제외)
const activeStores = installDetail.active || 0;

// KPI 카드
const kpis = [
  { title: '전체매장', value: funnel.registered },
  { title: '설치매장', value: funnel.install_completed },
  { title: '이용매장', value: activeStores },
  { title: '해지', value: funnel.churned }
];
```

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-03-08 | 최초 작성 |
| 2026-03-08 | 중복 레코드 정리 (꼰미고, 대낚식당, 트라가 잠실점) |
| 2026-03-08 | active_not_completed → QR_MENU_INSTALL/UNUSED_TERMINATED 변환 |
