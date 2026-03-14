# 캐치테이블로 API 알려진 이슈

## 1. 카테고리 삭제 API 서버 버그

- **엔드포인트**: `DELETE /v1/api/menu_category/{id}`
- **상태**: 서버 측 PHP 코드 버그로 동작 불가
- **에러 메시지**:
  ```
  오류 [Exception]Undefined variable $request
  /home/catchtable_rest_api/app/Http/Controllers/V1/MenuCategoryController.php 1087
  ```
- **재현 조건**: 어떤 body를 보내든 (name, brand_store_id 포함 여부 무관) 동일 에러 발생
- **확인일**: 2026-03-14
- **대응**:
  - 프롬프트에서 카테고리 삭제 API 서버 버그 안내 메시지 처리
  - 카테고리 내 메뉴를 모두 삭제 후 빈 카테고리로 유지하거나, 캐치테이블로 웹 관리자 화면에서 직접 삭제
- **해결 방법**: 캐치테이블로 개발팀에 버그 리포트 필요

## 2. 쓰기 API brand_store_id 필수

- **영향 범위**: 모든 POST/PUT 요청
- **내용**: URL 파라미터가 아닌 **request body**에 `brand_store_id`를 포함해야 인증 통과
- **대응**: Lambda `catchtableClient.mjs`에서 자동 주입 처리 완료

## 3. 메뉴 수정 시 price 필수

- **엔드포인트**: `POST /v1/api/menu_category/{cat_id}/menu/{menu_id}`
- **내용**: 이름만 변경해도 `price` 필드를 body에 포함해야 함. 누락 시 validation 에러 반환
- **에러**: `{"price": ["The price field is required."]}`
- **대응**: 프롬프트에서 메뉴 수정 시 현재 price를 항상 포함하도록 안내

## 4. API 응답 에러 형식 비표준

- **내용**: HTTP 200 반환하면서 body에 `{"success": false, "message": {...}}` 형태로 에러 반환
- **message 필드**: 문자열이 아닌 객체일 수 있음 (예: `{"price": ["The price field is required."]}`)
- **대응**: Lambda `formatApiError()` 함수로 객체 메시지를 문자열로 변환 처리

## 5. 옵션 생성/수정 API 서버 버그

- **엔드포인트**:
  - `POST /v1/api/menu/option/category` (옵션 그룹 생성)
  - `POST /v1/api/menu/option/group` (옵션 그룹 생성 - 별칭)
  - `POST /v1/api/menu/option/{option_id}` (옵션 수정)
- **상태**: 서버 측 코드 버그로 동작 불가
- **에러 메시지**: `{"success":false,"message":"메뉴옵션 그룹정보가 없습니다."}`
- **재현 조건**: 어떤 body를 보내든 (JSON, form-urlencoded, multipart 모두) 동일 에러 발생
- **테스트한 필드 조합**:
  - `name`, `brand_store_id`, `menu_option_category_id`, `option_category_id`, `id`, `category_id`
  - PHP 배열 구문: `menu_option_category[name]`, `options[0][name]` 등
  - 중첩 객체: `group`, `groups`, `option_group`, `menu_option_group` 등
- **지원되지 않는 메서드**:
  - `PUT /menu/option/{id}` → 405 Method Not Allowed
  - `DELETE /menu/option/{id}` → 405 Method Not Allowed
- **확인일**: 2026-03-14
- **대응**:
  - 프롬프트에서 옵션 생성/수정 API 서버 버그 안내 메시지 처리
  - 옵션 생성/수정은 캐치테이블로 웹 관리자 화면에서 직접 작업
- **해결 방법**: 캐치테이블로 개발팀에 버그 리포트 필요

## 6. 옵션 카테고리(그룹) 조회 API validation 버그

- **엔드포인트**: `GET /api/menu/option/category`
- **상태**: Laravel validation 규칙 버그로 조회 불가
- **에러 메시지**: `{"success":false,"message":{"id":["The id must be an integer."]}}`
- **원인**: 쿼리스트링 파라미터는 항상 문자열인데 validation 규칙이 `integer` (strict 타입 체크). `numeric`으로 변경 필요
- **재현 조건**: `?id=34812` 등 어떤 정수값을 넘겨도 동일 에러 발생
- **참고**: 비즈 API (`/v1/api/menu/option/category`)는 POST만 지원 (GET 불가)
- **확인일**: 2026-03-14
- **영향**:
  - 옵션 그룹명(예: "사이즈", "샷 추가", "토핑")을 API로 조회할 수 없음
  - 현재 Lambda에서 옵션 데이터를 그룹핑하여 옵션명 나열(S/M/L)로 대체 표시
- **해결 방법**: 캐치테이블로 개발팀에 validation 규칙 수정 요청 (`integer` → `numeric`)

## 7. 영업시간 API time 필드 PHP json_decode 버그

- **엔드포인트**: `POST /v1/api/brand_store_time/update`
- **상태**: PHP 코드에서 `json_decode($time)` 호출 시 이미 파싱된 배열이 들어가면 TypeError 발생
- **에러 메시지**:
  ```
  TypeError: json_decode(): Argument #1 ($json) must be of type string, array given
  /home/catchtable_rest_api/app/Http/Controllers/V1/BrandStoreTimeController.php line 126
  ```
- **원인**: JSON Content-Type으로 보내면 Laravel이 자동 파싱하여 배열로 전달, 그런데 컨트롤러가 다시 `json_decode()` 호출
- **대응**: Lambda `transformBodyForApi()`에서 `time` 배열을 JSON 문자열로 변환하여 전송
- **올바른 body 형식**: `{brand_store_id, part: 1, time: "[{\"wday\":1,\"start\":\"09:00:00\",\"end\":\"22:00:00\"}]"}`
- **확인일**: 2026-03-14

## 8. 영업시간 저장 시 part 필드 null 버그 (치명적)

- **엔드포인트**: `POST /v1/api/brand_store_time/update`
- **상태**: ❌ 서버 PHP 코드에서 `part` 값을 DB에 저장하지 않음 (항상 `null`)
- **심각도**: **치명적** - 어드민과 데이터 불일치 발생
- **재현 조건**: 어떤 형식으로 보내도 동일
  - `part: 1` (정수) → DB에 `null` 저장
  - `part: "1"` (문자열) → DB에 `null` 저장
  - `part: '1'` → DB에 `null` 저장
- **영향**:
  1. API로 생성된 영업시간 레코드가 모두 `part=null`로 저장
  2. **어드민 UI는 `part=1`(영업시간), `part=2`(휴게시간) 레코드만 표시** → API로 만든 레코드가 어드민에서 보이지 않음
  3. 사용자가 채팅으로 영업시간 변경 후 어드민에서 확인하면 "아무것도 없음" 상태
  4. 영업시간(part=1)과 휴게시간(part=2) 구분 불가
- **추가 문제**: 이 API는 **기존 레코드를 덮어쓰지 않고 새 레코드를 추가(APPEND)** 함 → `part=null` 레코드가 계속 누적됨
- **실제 DB 데이터 예시** (brand_store_id=442):
  ```
  id:976  part:2    wday:1 03:00~04:00  ← 어드민 등록 (휴게시간, 정상)
  id:977  part:2    wday:2 03:00~04:00  ← 어드민 등록 (휴게시간, 정상)
  id:1019 part:null wday:1 09:00~22:00  ← API 생성 (null 버그)
  id:1020 part:null wday:2 10:00~21:00  ← API 생성 (null 버그)
  id:1021 part:null wday:1 10:00~23:00  ← API 생성 (null 버그, 중복)
  id:1022 part:null wday:1 10:00~22:00  ← API 생성 (null 버그, 중복)
  id:1026 part:1    wday:1 09:00~22:00  ← 어드민 등록 (영업시간, 정상)
  ```
- **현재 대응**:
  - 프론트에서 `part===1` 우선 표시, 없으면 `part===null` fallback
  - **영업시간 변경 기능은 사실상 사용 불가** (어드민 동기화 안 됨)
- **확인일**: 2026-03-14
- **해결 방법**: 캐치테이블로 개발팀에 `BrandStoreTimeController.php`에서 `part` 필드가 DB INSERT 시 누락되는 버그 수정 요청. 추가로 UPDATE 시 기존 레코드를 삭제/갱신하는 로직도 필요 (현재는 APPEND만 됨)

## 9. 공휴일 API 필드명/형식 비직관적

- **엔드포인트**: `POST /v1/api/brand_store_holiday/update`
- **필드명**: `brand_store_holiday` (not `holiday`, `dates`, `temporary_holiday`)
- **날짜 형식**: `YYYYMMDD` 문자열 배열 (not `YYYY-MM-DD`)
  - 올바른 예: `["20260320", "20260321"]`
  - 잘못된 예: `["2026-03-20"]` → `does not match the format Ymd` 에러
- **다른 필드명 시도 결과**: `holiday`, `dates`, `date`, `temporary_holiday` → 모두 `array_unique(): null given` PHP 에러
- **확인일**: 2026-03-14

## 동작 현황 요약

| 기능 | method | 상태 | 비고 |
|------|--------|------|------|
| 메뉴 조회 | GET | ✅ | |
| 메뉴 추가 | POST | ✅ | body에 brand_store_id 필수 |
| 메뉴 수정 | POST | ✅ | body에 name, price, brand_store_id 필수 |
| 메뉴 삭제 | PUT (soft) | ✅ | status: 2로 soft delete |
| 메뉴 품절 | PUT | ✅ | |
| 메뉴 숨김/표시 | PUT | ✅ | |
| 카테고리 조회 | GET | ✅ | |
| 카테고리 추가 | POST | ✅ | |
| 카테고리 수정 | PUT | ✅ | body에 name 필수 |
| 카테고리 삭제 | DELETE | ❌ | 서버 PHP 버그 |
| 옵션 조회 | GET | ✅ | |
| 옵션 카테고리(그룹) 조회 | GET | ❌ | validation 버그 - "id must be integer" |
| 옵션 품절 | PUT | ✅ | |
| 옵션 숨김/표시 | PUT | ✅ | |
| 옵션 삭제 | PUT (soft) | ✅ | status: 2로 soft delete |
| 옵션 생성 | POST | ❌ | 서버 버그 - "그룹정보 없음" |
| 옵션 수정 | POST | ❌ | 서버 버그 - "그룹정보 없음" |
| 연쇄 액션 | - | ✅ | $prev 참조로 이전 생성 ID 자동 치환 |
| 매장정보 조회 | GET | ✅ | |
| 원산지 변경 | PUT | ✅ | body에 origin 필드 |
| 주문안내 변경 | PUT | ✅ | body에 order_info 필드 |
| 영업시간 변경 | POST | ⚠️ | time 변환은 해결(이슈 #7), **part=null 버그로 어드민 동기화 불가(이슈 #8)** |
| 공휴일 설정 | POST | ✅ | brand_store_holiday 필드, YYYYMMDD 형식 (이슈 #9) |
