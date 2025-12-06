# SMS 프로젝트 - CatchOrder 영업 관리 시스템

## 📋 프로젝트 소개

CatchOrder 영업팀을 위한 통합 매장 관리 시스템(Store Management System)입니다.
매장 정보 관리, 영업 활동 추적, 일정 관리, 설치 링크 발송 등의 기능을 제공합니다.

## 🚀 주요 기능

- **매장 관리**: 매장 정보 CRUD, 상태 및 라이프사이클 관리
- **활동 기록**: 전화, 방문, 메모 등 영업 활동 로깅
- **일정 관리**: 방문 일정 예약 및 캘린더 뷰
- **설치 링크**: CatchOrder 앱 설치 링크 생성 및 발송
- **통계 대시보드**: 실시간 영업 현황 및 통계
- **권한 관리**: 관리자/일반 사용자 권한 분리

## 🛠 기술 스택

### Frontend
- **React 18** - UI 라이브러리
- **Vite** - 빌드 도구
- **React Router v6** - 라우팅
- **Zustand** - 상태 관리
- **Tailwind CSS** - 스타일링
- **Day.js** - 날짜 처리
- **React-Toastify** - 알림

### Backend (AWS)
- **API Gateway** - REST API
- **Lambda** - 서버리스 함수
- **DynamoDB** - NoSQL 데이터베이스

## 📦 설치 및 실행

### 사전 요구사항
- Node.js 18.0.0 이상
- npm 또는 yarn

### 설치
```bash
# 저장소 클론
git clone https://github.com/ted-keystonepartners/Catchorder.git
cd sms-project

# 의존성 설치
npm install
```

### 환경 변수 설정
`.env.local` 파일 생성:
```env
VITE_API_BASE=https://your-api-endpoint.amazonaws.com/dev
VITE_SESSION_TIMEOUT=3600000
```

### 실행
```bash
# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 미리보기
npm run preview
```

## 📁 프로젝트 구조

```
src/
├── api/              # API 클라이언트 및 서비스
│   ├── client.js     # 통합 API 클라이언트
│   ├── storeApi.js   # 매장 관련 API
│   ├── authApi.js    # 인증 관련 API
│   └── ...
├── components/       # React 컴포넌트
│   ├── Layout/       # 레이아웃 컴포넌트
│   ├── Store/        # 매장 관련 컴포넌트
│   ├── Calendar/     # 캘린더 컴포넌트
│   └── ui/           # 공통 UI 컴포넌트
├── context/          # 전역 상태 관리
│   └── authStore.js  # 인증 상태 (Zustand)
├── hooks/            # 커스텀 React 훅
├── pages/            # 페이지 컴포넌트
├── utils/            # 유틸리티 함수
├── constants/        # 상수 정의
├── types/            # 타입 정의
└── mocks/            # Mock 데이터
```

## 🔐 인증 및 권한

### 사용자 역할
- **ADMIN**: 전체 권한 (매장 삭제, 사용자 관리 등)
- **GENERAL**: 일반 권한 (조회, 생성, 수정)

### 로그인 정보 (개발)
```
관리자: admin@example.com / password123
일반: user1@example.com / password123
```

## 🔄 상태 관리

### 매장 상태 (Store Status)
- `PRE_INTRODUCTION`: 소개 전
- `IN_PROGRESS`: 진행중
- `ADOPTION_CONFIRMED`: 도입 확정
- `SIGNUP_COMPLETED`: 가입 완료
- `SERVICE_ACTIVE`: 서비스 활성
- `REJECTED`: 거절
- `PENDING`: 보류

### 라이프사이클 (Lifecycle)
- `P1`: 소개/관심도 확인
- `P2`: 도입 검토
- `P3`: 가입 진행
- `P4`: 서비스 완료

## 🐛 문제 해결

### Lambda Cold Start 500 에러
- 재시도 로직 구현 (3회, 지수 백오프)
- 순차 실행으로 동시 요청 제한
- 초기 로드 지연 추가

### 성능 최적화
- API 요청 동시성 제한 (최대 2개)
- 배치 간 지연 시간 추가
- 불필요한 리렌더링 방지

## 📝 개발 가이드

### 코드 스타일
- ESLint + Prettier 사용
- 함수형 컴포넌트 및 Hooks 사용
- JSDoc 주석으로 타입 명시

### Git 커밋 규칙
- `feat`: 새로운 기능
- `fix`: 버그 수정
- `docs`: 문서 수정
- `style`: 코드 포맷팅
- `refactor`: 코드 리팩토링
- `test`: 테스트 코드
- `chore`: 빌드, 설정 변경

### API 응답 형식
```javascript
{
  success: boolean,
  data: any,
  error: string | null,
  pagination?: {
    page: number,
    pageSize: number,
    total: number
  }
}
```

## 🚢 배포

### Vercel 배포
1. Vercel 프로젝트 연결
2. 환경 변수 설정
3. 자동 배포 (main 브랜치 푸시 시)

### 수동 배포
```bash
npm run build
# dist 폴더의 내용을 웹 서버에 업로드
```

## 📊 모니터링

- 브라우저 콘솔에서 로그 확인
- Network 탭에서 API 요청 모니터링
- React Developer Tools로 컴포넌트 상태 확인

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 비공개 소프트웨어입니다. 무단 복제 및 배포를 금지합니다.

## 📞 연락처

- 프로젝트 관리자: [이메일]
- 기술 지원: [이메일]
- GitHub Issues: [https://github.com/ted-keystonepartners/Catchorder/issues]

---

Last Updated: 2024.11.26