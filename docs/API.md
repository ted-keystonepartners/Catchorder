# API 문서

## 기본 정보

- **Base URL**: `https://mk04952lrj.execute-api.ap-northeast-2.amazonaws.com/dev`
- **인증 방식**: Bearer Token (JWT)
- **응답 형식**: JSON

## 공통 응답 형식

### 성공 응답
```json
{
  "success": true,
  "data": { ... },
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### 에러 응답
```json
{
  "success": false,
  "error": "에러 메시지",
  "data": null
}
```

## 인증 API

### 로그인
- **POST** `/api/auth/login`
- **Body**:
```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```
- **Response**:
```json
{
  "success": true,
  "data": {
    "token": "jwt-token",
    "user": {
      "id": "user1",
      "email": "admin@example.com",
      "name": "김관리",
      "role": "ADMIN"
    }
  }
}
```

### 로그아웃
- **POST** `/api/auth/logout`
- **Headers**: `Authorization: Bearer {token}`

### 사용자 정보 조회
- **GET** `/api/auth/me`
- **Headers**: `Authorization: Bearer {token}`

## 매장 API

### 매장 목록 조회
- **GET** `/api/stores`
- **Query Parameters**:
  - `page`: 페이지 번호 (기본: 1)
  - `pageSize`: 페이지 크기 (기본: 20)
  - `status`: 상태 필터
  - `lifecycle`: 라이프사이클 필터
  - `search`: 검색어

### 매장 상세 조회
- **GET** `/api/stores/{storeId}`

### 매장 생성
- **POST** `/api/stores`
- **Body**:
```json
{
  "store_name": "매장명",
  "store_phone": "02-1234-5678",
  "store_address": "서울시 강남구",
  "status": "PRE_INTRODUCTION",
  "lifecycle": "P1"
}
```

### 매장 수정
- **PUT** `/api/stores/{storeId}`
- **Body**: 수정할 필드만 포함

### 매장 삭제
- **DELETE** `/api/stores/{storeId}`
- **권한**: ADMIN only

## 활동 로그 API

### 활동 목록 조회
- **GET** `/api/activities/{storeId}`
- **Query Parameters**:
  - `page`: 페이지 번호
  - `pageSize`: 페이지 크기
  - `type`: 활동 타입 필터

### 활동 생성
- **POST** `/api/activities/{storeId}`
- **Body**:
```json
{
  "type": "CALL",
  "content": "도입 문의 전화",
  "scheduledAt": "2024-01-15T10:00:00Z"
}
```

### 활동 수정
- **PUT** `/api/activities/{activityId}`

### 활동 삭제
- **DELETE** `/api/activities/{activityId}`

## 일정 API

### 일정 목록 조회
- **GET** `/api/schedules/{storeId}`
- **Query Parameters**:
  - `month`: 조회할 월 (YYYY-MM)

### 일정 생성
- **POST** `/api/schedules`
- **Body**:
```json
{
  "store_id": "store1",
  "visit_date": "2024-01-15",
  "visit_time": "14:00",
  "visit_purpose": "서비스 소개",
  "visit_type": "first"
}
```

### 일정 수정
- **PUT** `/api/schedules/{scheduleId}`

### 일정 삭제
- **DELETE** `/api/schedules/delete/{scheduleId}?storeId={storeId}`

## 설치 링크 API

### 설치 링크 조회
- **GET** `/api/installation-links/{storeId}`

### 설치 링크 생성
- **POST** `/api/installation-links/{storeId}/generate`
- **Response**:
```json
{
  "success": true,
  "data": {
    "id": "link1",
    "url": "https://catchorder.com/install/abc123",
    "token": "abc123",
    "expiresAt": "2024-01-22T00:00:00Z"
  }
}
```

### 설치 링크 발송
- **POST** `/api/installation-links/{linkId}/send`
- **Body**:
```json
{
  "phoneNumber": "010-1234-5678"
}
```

## 동의 응답 API

### 동의 응답 조회
- **GET** `/api/stores/{storeId}/consent-responses`

### 동의 응답 생성
- **POST** `/api/consent-responses`
- **Body**:
```json
{
  "store_id": "store1",
  "consent_given": true,
  "phone_number": "010-1234-5678"
}
```

## 담당자 API

### 담당자 목록 조회
- **GET** `/api/managers`

### 담당자 생성
- **POST** `/api/managers`
- **권한**: ADMIN only
- **Body**:
```json
{
  "email": "manager@example.com",
  "name": "김매니저",
  "role": "GENERAL"
}
```

### 담당자 수정
- **PUT** `/api/managers/{managerId}`
- **권한**: ADMIN only

### 담당자 삭제
- **DELETE** `/api/managers/{managerId}`
- **권한**: ADMIN only

## 통계 API

### 대시보드 통계
- **GET** `/api/stats/dashboard`
- **Response**:
```json
{
  "success": true,
  "data": {
    "totalStores": 150,
    "statusCounts": {
      "PRE_INTRODUCTION": 30,
      "IN_PROGRESS": 45,
      "ADOPTION_CONFIRMED": 25,
      "SIGNUP_COMPLETED": 50
    },
    "monthlyTrend": [...]
  }
}
```

### 활동 통계
- **GET** `/api/stats/activities`
- **Query Parameters**:
  - `storeId`: 특정 매장 (선택)
  - `startDate`: 시작 날짜
  - `endDate`: 종료 날짜

## 에러 코드

| 코드 | 설명 |
|------|------|
| 400 | 잘못된 요청 (파라미터 오류) |
| 401 | 인증 실패 (토큰 만료/무효) |
| 403 | 권한 없음 |
| 404 | 리소스를 찾을 수 없음 |
| 409 | 충돌 (중복 데이터) |
| 500 | 서버 내부 오류 |

## Rate Limiting

- 분당 최대 60개 요청
- 초과 시 429 상태 코드 반환
- `X-RateLimit-Remaining` 헤더에 남은 요청 수 표시

## 주의사항

1. **Lambda Cold Start**: 첫 요청 시 응답이 느릴 수 있음 (최대 3초)
2. **페이지네이션**: 대량 데이터 조회 시 반드시 페이지네이션 사용
3. **인증 토큰**: 1시간 후 만료, 재로그인 필요
4. **CORS**: 프로덕션에서는 화이트리스트된 도메인만 허용

---

Last Updated: 2024.11.26