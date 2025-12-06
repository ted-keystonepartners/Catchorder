/**
 * 개발용 Mock 데이터
 */
import { STORE_STATUS, LIFECYCLE, ACTIVITY_TYPES, ROLE } from '../utils/constants.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * 사용자 계정 Mock 데이터
 */
export const mockUsers = [
  {
    id: 'user1',
    email: 'admin@example.com',
    password: 'password123',
    name: '김관리',
    role: ROLE.ADMIN.code,
    createdAt: '2024-01-01T00:00:00.000Z',
    lastLoginAt: '2024-01-15T09:00:00.000Z'
  },
  {
    id: 'user2',
    email: 'user1@example.com',
    password: 'password123',
    name: '이영업',
    role: ROLE.GENERAL.code,
    createdAt: '2024-01-02T00:00:00.000Z',
    lastLoginAt: '2024-01-15T10:30:00.000Z'
  }
];

/**
 * 매장 샘플 데이터 생성 함수
 */
const generateMockStore = (index) => {
  const storeNames = [
    '맛있는김밥천국', '신전떡볶이', '백종원의원조닭발', '투썸플레이스', '스타벅스',
    '맥도날드', 'KFC', '롯데리아', '서브웨이', '파파존스',
    '도미노피자', '미스터피자', '엔제리너스커피', '카페베네', '커피빈',
    '할리스커피', '이디야커피', 'CGV', '롯데시네마', '메가박스',
    '이마트24', 'GS25', 'CU', '세븐일레븐', '버거킹',
    '크리스피크림도넛', '배스킨라빈스', '던킨도너츠', '뚜레주르', 'SPC삼립',
    '파리바게뜨', '토니로마', 'TGIF', '아웃백', '갤러리아',
    '신세계', '롯데백화점', '현대백화점', '이마트', '홈플러스',
    '코스트코', '스타필드', '롯데몰', 'NC백화점', '아울렛',
    '온누리약국', '하나로마트', '농협마트', '메가마트', '홈플러스익스프레스',
    '훼미리마트', '바이더웨이', '씨스페이스', '랄라블라', '더페이스샵'
  ];

  const addresses = [
    '서울특별시 강남구 테헤란로 152', '서울특별시 종로구 종로 123',
    '서울특별시 마포구 홍대앞 45-67', '부산광역시 해운대구 우동 1234',
    '대구광역시 달서구 상인동 567-8', '인천광역시 연수구 송도동 123-45',
    '광주광역시 서구 치평동 890-12', '대전광역시 유성구 봉명동 345-67',
    '울산광역시 남구 삼산동 678-90', '세종특별자치시 한누리대로 2130',
    '경기도 수원시 영통구 영통동 123', '경기도 성남시 분당구 야탑동 456',
    '경기도 고양시 일산동구 장항동 789', '경기도 안양시 동안구 평촌동 101',
    '경기도 부천시 원미구 중동 202', '강원도 춘천시 퇴계동 303',
    '충청북도 청주시 상당구 서운동 404', '충청남도 천안시 동남구 신부동 505',
    '전라북도 전주시 완산구 효자동 606', '전라남도 목포시 상동 707',
    '경상북도 포항시 북구 덕산동 808', '경상남도 창원시 마산회원구 회원동 909',
    '제주특별자치도 제주시 일도동 110', '서울특별시 서초구 서초동 221',
    '서울특별시 송파구 잠실동 332', '부산광역시 부산진구 부전동 443'
  ];

  const phoneNumbers = [
    '02-123-4567', '02-234-5678', '02-345-6789', '051-456-7890',
    '053-567-8901', '032-678-9012', '062-789-0123', '042-890-1234',
    '052-901-2345', '044-012-3456', '031-123-4567', '031-234-5678',
    '031-345-6789', '031-456-7890', '032-567-8901', '033-678-9012',
    '043-789-0123', '041-890-1234', '063-901-2345', '061-012-3456',
    '054-123-4567', '055-234-5678', '064-345-6789', '02-456-7890',
    '02-567-8901', '051-678-9012'
  ];

  const statuses = Object.keys(STORE_STATUS);
  const lifecycles = Object.keys(LIFECYCLE);
  const owners = ['user1', 'user2', null];

  const createdDate = new Date(2024, 0, 1 + Math.floor(Math.random() * 14));
  const lastContactDate = new Date(createdDate.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000);

  return {
    id: `store${index + 1}`,
    name: storeNames[index % storeNames.length],
    phone: phoneNumbers[index % phoneNumbers.length],
    address: addresses[index % addresses.length],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    lifecycle: lifecycles[Math.floor(Math.random() * lifecycles.length)],
    ownerId: owners[Math.floor(Math.random() * owners.length)],
    businessNumber: `${100 + index}-${10 + Math.floor(Math.random() * 90)}-${10000 + Math.floor(Math.random() * 90000)}`,
    createdAt: createdDate.toISOString(),
    updatedAt: lastContactDate.toISOString(),
    lastContactAt: Math.random() > 0.3 ? lastContactDate.toISOString() : null,
    notes: Math.random() > 0.5 ? `매장 ${index + 1} 관련 메모 내용입니다.` : null,
    scheduledAt: Math.random() > 0.7 ? 
      new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString() : null,
    rating: Math.floor(Math.random() * 5) + 1,
    revenue: Math.floor(Math.random() * 50000000) + 10000000,
    employeeCount: Math.floor(Math.random() * 20) + 1,
    category: ['한식', '중식', '일식', '양식', '카페', '패스트푸드', '치킨', '피자'][Math.floor(Math.random() * 8)]
  };
};

/**
 * 매장 데이터 (50개)
 */
export const mockStores = Array.from({ length: 50 }, (_, index) => generateMockStore(index));

/**
 * 활동 로그 생성 함수
 */
const generateActivityLogs = (storeId) => {
  const activities = [];
  const activityTypes = Object.keys(ACTIVITY_TYPES);
  const activityCount = Math.floor(Math.random() * 5) + 1;

  for (let i = 0; i < activityCount; i++) {
    const activityDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
    const activityType = activityTypes[Math.floor(Math.random() * activityTypes.length)];
    
    let content = '';
    switch (activityType) {
      case 'CALL':
        content = `전화 연락 - ${['도입 문의', '서비스 설명', '일정 조율', '상태 확인'][Math.floor(Math.random() * 4)]}`;
        break;
      case 'VISIT':
        content = `매장 방문 - ${['초기 미팅', '서비스 데모', '계약 논의', '설치 지원'][Math.floor(Math.random() * 4)]}`;
        break;
      case 'SCHEDULE_CALL':
        content = `전화 예약 - ${new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toLocaleDateString()} 통화 예정`;
        break;
      case 'SCHEDULE_VISIT':
        content = `방문 예약 - ${new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toLocaleDateString()} 방문 예정`;
        break;
      case 'MEMO':
        content = `메모 - ${['관심도 높음', '재연락 필요', '경쟁사 비교중', '의사결정자 부재'][Math.floor(Math.random() * 4)]}`;
        break;
      default:
        content = '기타 활동';
    }

    activities.push({
      id: uuidv4(),
      storeId,
      type: activityType,
      content,
      createdAt: activityDate.toISOString(),
      createdBy: Math.random() > 0.5 ? 'user1' : 'user2',
      scheduledAt: ['SCHEDULE_CALL', 'SCHEDULE_VISIT'].includes(activityType) ? 
        new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString() : null
    });
  }

  return activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

/**
 * 모든 매장의 활동 로그 데이터
 */
export const mockActivityLogs = mockStores.reduce((acc, store) => {
  acc[store.id] = generateActivityLogs(store.id);
  return acc;
}, {});

/**
 * 설치 링크 데이터
 */
export const mockInstallationLinks = mockStores
  .filter(store => ['REMOTE_INSTALL_SCHEDULED', 'ADMIN_SETTING', 'QR_LINKING'].includes(store.status))
  .map(store => ({
    id: uuidv4(),
    storeId: store.id,
    token: uuidv4(),
    url: `https://catchorder.com/install/${uuidv4()}`,
    status: Math.random() > 0.5 ? 'SENT' : 'PENDING',
    sentAt: Math.random() > 0.3 ? 
      new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString() : null,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - Math.random() * 2 * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: Math.random() > 0.5 ? 'user1' : 'user2'
  }));

/**
 * 통계 데이터
 */
export const mockStats = {
  totalStores: mockStores.length,
  statusCounts: Object.keys(STORE_STATUS).reduce((acc, status) => {
    acc[status] = mockStores.filter(store => store.status === status).length;
    return acc;
  }, {}),
  lifecycleCounts: Object.keys(LIFECYCLE).reduce((acc, lifecycle) => {
    acc[lifecycle] = mockStores.filter(store => store.lifecycle === lifecycle).length;
    return acc;
  }, {}),
  monthlySignups: [
    { month: '2024-01', count: 12 },
    { month: '2024-02', count: 8 },
    { month: '2024-03', count: 15 },
    { month: '2024-04', count: 10 },
    { month: '2024-05', count: 18 },
    { month: '2024-06', count: 22 }
  ],
  conversionRates: {
    p1ToP2: 0.65,
    p2ToP3: 0.45,
    p3ToP4: 0.80
  }
};