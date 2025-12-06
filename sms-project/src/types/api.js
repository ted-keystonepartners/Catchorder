/**
 * API 응답 타입 정의
 */

/**
 * 기본 API 응답 구조
 * @typedef {Object} ApiResponse
 * @property {boolean} success - 성공 여부
 * @property {any} [data] - 응답 데이터
 * @property {string} [error] - 에러 메시지
 * @property {Object} [pagination] - 페이지네이션 정보
 * @property {number} [pagination.page] - 현재 페이지
 * @property {number} [pagination.pageSize] - 페이지 크기
 * @property {number} [pagination.total] - 전체 개수
 * @property {number} [pagination.totalPages] - 전체 페이지 수
 */

/**
 * 매장 정보
 * @typedef {Object} Store
 * @property {string} id - 매장 ID
 * @property {string} store_id - 매장 ID (서버)
 * @property {string} store_name - 매장명
 * @property {string} store_phone - 전화번호
 * @property {string} store_address - 주소
 * @property {string} status - 상태
 * @property {string} lifecycle - 라이프사이클
 * @property {string} [owner_id] - 담당자 ID
 * @property {string} [business_number] - 사업자번호
 * @property {string} created_at - 생성일시
 * @property {string} updated_at - 수정일시
 * @property {string} [last_contact_at] - 마지막 연락일시
 * @property {string} [scheduled_at] - 예약일시
 * @property {string} [notes] - 메모
 * @property {number} [rating] - 평점
 * @property {number} [revenue] - 매출
 * @property {number} [employee_count] - 직원수
 * @property {string} [category] - 카테고리
 */

/**
 * 사용자 정보
 * @typedef {Object} User
 * @property {string} id - 사용자 ID
 * @property {string} email - 이메일
 * @property {string} name - 이름
 * @property {string} role - 역할 (ADMIN | GENERAL)
 * @property {string} created_at - 생성일시
 * @property {string} [last_login_at] - 마지막 로그인 일시
 */

/**
 * 활동 로그
 * @typedef {Object} Activity
 * @property {string} id - 활동 ID
 * @property {string} store_id - 매장 ID
 * @property {string} type - 활동 타입
 * @property {string} content - 활동 내용
 * @property {string} created_at - 생성일시
 * @property {string} created_by - 작성자 ID
 * @property {string} [scheduled_at] - 예약일시
 * @property {string} [status] - 상태
 */

/**
 * 일정 정보
 * @typedef {Object} Schedule
 * @property {string} id - 일정 ID
 * @property {string} store_id - 매장 ID
 * @property {string} visit_date - 방문 날짜
 * @property {string} visit_time - 방문 시간
 * @property {string} visit_purpose - 방문 목적
 * @property {string} visit_type - 방문 타입 (first | repeat)
 * @property {string} [status] - 일정 상태
 * @property {string} created_at - 생성일시
 * @property {string} [store_name] - 매장명
 */

/**
 * 설치 링크
 * @typedef {Object} InstallationLink
 * @property {string} id - 링크 ID
 * @property {string} store_id - 매장 ID
 * @property {string} token - 토큰
 * @property {string} url - 설치 URL
 * @property {string} status - 상태 (SENT | PENDING)
 * @property {string} [sent_at] - 발송일시
 * @property {string} expires_at - 만료일시
 * @property {string} created_at - 생성일시
 * @property {string} created_by - 생성자 ID
 */

/**
 * 동의 응답
 * @typedef {Object} ConsentResponse
 * @property {string} id - 응답 ID
 * @property {string} store_id - 매장 ID
 * @property {boolean} consent_given - 동의 여부
 * @property {string} consent_date - 동의 일자
 * @property {string} [phone_number] - 전화번호
 * @property {string} created_at - 생성일시
 */

export {};