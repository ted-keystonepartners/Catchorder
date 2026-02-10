import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-northeast-2" });
const dynamodb = DynamoDBDocumentClient.from(client);

const storesTable = "sms-stores-dev";
const orderStatsTable = "sms-order-stats-dev";
const dailyStatsTable = "sms-daily-order-stats-dev";
const usersTable = "sms-users-dev";
const ordersTable = "sms-orders-dev";
const storeDailyOrdersTable = "sms-store-daily-orders-dev";

// 담당자 이름 매핑
const OWNER_NAMES = {
  "dy@catchtable.co.kr": "안다윤",
  "reczoon@catchtable.co.kr": "이병준",
  "whghdfo36@catchtable.co.kr": "조홍래",
  "back@catchtable.co.kr": "외주",
  "unassigned": "미지정"
};

// 날짜 형식 정규화 (YYYY-MM-DD)
const normalizeDate = (dateStr) => {
  if (!dateStr) return null;
  // ISO 형식(2025-12-07T11:24:26.054Z)에서 날짜 부분만 추출
  let dateOnly = dateStr.split('T')[0];
  let normalized = dateOnly.replace(/\./g, '-');
  const parts = normalized.split('-');
  if (parts.length === 3) {
    return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
  }
  return normalized;
};

// 상태값 분류
const INSTALL_COMPLETED = ["QR_MENU_INSTALL", "SERVICE_TERMINATED", "UNUSED_TERMINATED", "DEFECT_REPAIR"];
const CHURNED = ["SERVICE_TERMINATED", "UNUSED_TERMINATED"];

export const handler = async (event) => {
  try {
    // 날짜 파라미터 확인
    const queryParams = event.queryStringParameters || {};
    let startDate = queryParams.start_date;
    let endDate = queryParams.end_date;
    const hasDateFilter = startDate && endDate;
    const view = queryParams.view;

    // 시작일이 종료일보다 뒤면 swap
    if (hasDateFilter && startDate > endDate) {
      [startDate, endDate] = [endDate, startDate];
    }

    // 히트맵 뷰 요청 처리
    if (view === 'heatmap' && hasDateFilter) {
      return await handleHeatmapView(startDate, endDate);
    }

    // 주간 코호트 뷰 요청 처리
    if (view === 'weekly_cohort') {
      return await handleWeeklyCohortView(startDate || '2024-12-15');
    }

    // 주간 코호트 상세 뷰 (특정 주차 매장 리스트)
    if (view === 'weekly_cohort_detail') {
      const weekKey = queryParams.week_key;
      if (!weekKey) {
        return {
          statusCode: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify({ success: false, error: "week_key parameter required" })
        };
      }
      return await handleWeeklyCohortDetailView(weekKey);
    }

    // 월별 코호트(Sankey) 뷰 요청 처리
    if (view === 'cohort') {
      const baseDate = queryParams.base_date || new Date().toISOString().split("T")[0];
      return await handleCohortView(baseDate);
    }

    // 전일 미이용 매장 뷰 처리
    if (view === 'inactive_today') {
      const targetDate = queryParams.target_date;
      return await handleInactiveTodayView(targetDate);
    }

    // 1. 병렬로 기본 데이터 조회 (성능 최적화)
    const [usersResult, storesResult, orderStatsResult] = await Promise.all([
      dynamodb.send(new ScanCommand({ TableName: usersTable })),
      dynamodb.send(new ScanCommand({ TableName: storesTable })),
      dynamodb.send(new ScanCommand({ TableName: orderStatsTable }))
    ]);

    const users = usersResult.Items || [];
    const userMap = {};
    for (const user of users) {
      userMap[user.user_id] = user;
    }

    const stores = storesResult.Items || [];
    const orderStats = orderStatsResult.Items || [];

    // 2. 이용매장 세트 구성
    let activeStoreSeqs = new Set();
    let orderStatsBySeq = {};
    let totalOrderCount = 0;
    let totalCustomerCount = 0;

    if (hasDateFilter) {
      // 날짜 필터가 있으면 일별 집계 테이블에서 해당 기간의 매장 추출
      const dailyResult = await dynamodb.send(new ScanCommand({
        TableName: dailyStatsTable,
        FilterExpression: "order_date BETWEEN :start AND :end",
        ExpressionAttributeValues: {
          ":start": startDate,
          ":end": endDate
        }
      }));

      const dailyStats = dailyResult.Items || [];

      // 해당 기간 동안 주문이 있었던 모든 매장 수집
      for (const day of dailyStats) {
        if (day.store_seqs) {
          for (const seq of day.store_seqs) {
            activeStoreSeqs.add(seq);
          }
        }
        totalOrderCount += day.order_count || 0;
      }

      // 기간 내 주문이 있는 매장의 상세 정보
      for (const stat of orderStats) {
        if (activeStoreSeqs.has(stat.seq)) {
          orderStatsBySeq[stat.seq] = {
            orderCount: stat.order_count || 0,
            customerCount: stat.customer_count || 0
          };
          totalCustomerCount += stat.customer_count || 0;
        }
      }
    } else {
      // 날짜 필터 없으면 전체 기간
      for (const stat of orderStats) {
        orderStatsBySeq[stat.seq] = {
          orderCount: stat.order_count || 0,
          customerCount: stat.customer_count || 0
        };
        totalOrderCount += stat.order_count || 0;
        totalCustomerCount += stat.customer_count || 0;
      }
      activeStoreSeqs = new Set(Object.keys(orderStatsBySeq));
    }

    // 4. 집계
    const overallStats = {};
    const ownerStats = {};

    let totalRegistered = 0;
    let installCompleted = 0;
    let activeStores = 0;
    let totalChurned = 0;

    const installDetail = {
      active: [],
      inactive: [],
      churned_service: [],
      churned_unused: [],
      repair: [],
      pending: [],
      active_not_completed: []
    };

    for (const store of stores) {
      const status = store.status || "UNKNOWN";
      const ownerId = store.owner_id || "unassigned";
      const seq = store.seq || "";
      const ownerUser = userMap[ownerId] || {};
      const ownerName = ownerUser.name || ownerId.split('@')[0];
      const hasOrder = seq && activeStoreSeqs.has(seq);

      const storeOrderStats = orderStatsBySeq[seq] || { orderCount: 0, customerCount: 0 };
      const orderCount = storeOrderStats.orderCount;
      const customerCount = storeOrderStats.customerCount;

      overallStats[status] = (overallStats[status] || 0) + 1;

      if (!ownerStats[ownerId]) {
        ownerStats[ownerId] = {
          owner_id: ownerId,
          owner_name: ownerName,
          stats: {},
          registered: 0,
          installCompleted: 0,
          active: 0,
          churned: 0,
        };
      }
      ownerStats[ownerId].stats[status] = (ownerStats[ownerId].stats[status] || 0) + 1;
      ownerStats[ownerId].registered++;

      totalRegistered++;

      const storeInfo = {
        store_id: store.store_id,
        store_name: store.store_name,
        seq: seq,
        owner_id: ownerId,
        owner_name: ownerName,
        status: status,
        created_at: store.created_at,
        hasOrder: hasOrder,
        order_count: hasOrder ? orderCount : 0,
        customer_count: hasOrder ? customerCount : 0
      };

      // 설치완료 체크
      if (INSTALL_COMPLETED.includes(status)) {
        installCompleted++;
        ownerStats[ownerId].installCompleted++;

        // 날짜 필터가 있는 경우, 매장 등록일이 선택한 기간 이후면 미이용 리스트에서 제외
        const storeCreatedDate = store.created_at ? store.created_at.split('T')[0] : null;
        const isStoreInDateRange = !hasDateFilter || !storeCreatedDate || storeCreatedDate <= endDate;

        if (status === "QR_MENU_INSTALL") {
          if (hasOrder) {
            installDetail.active.push(storeInfo);
          } else if (isStoreInDateRange) {
            // 날짜 범위 내에 등록된 매장만 미이용으로 분류
            installDetail.inactive.push(storeInfo);
          }
        } else if (status === "SERVICE_TERMINATED") {
          installDetail.churned_service.push(storeInfo);
        } else if (status === "UNUSED_TERMINATED") {
          installDetail.churned_unused.push(storeInfo);
        } else if (status === "DEFECT_REPAIR") {
          installDetail.repair.push(storeInfo);
        } else if (status === "PENDING") {
          installDetail.pending.push(storeInfo);
        }
      } else {
        if (hasOrder) {
          installDetail.active_not_completed.push(storeInfo);
        }
      }

      // 이용매장 체크
      if (hasOrder) {
        activeStores++;
        ownerStats[ownerId].active++;
      }

      // 해지/보류 체크
      if (CHURNED.includes(status)) {
        totalChurned++;
        ownerStats[ownerId].churned++;
      }
    }

    // 5. 전환율 계산
    const activeRate = installCompleted > 0 ? ((activeStores / installCompleted) * 100).toFixed(1) : 0;
    const churnRate = installCompleted > 0 ? ((totalChurned / installCompleted) * 100).toFixed(1) : 0;

    // 6. 담당자별 전환율 계산
    const ownerStatsArray = Object.values(ownerStats).map(owner => {
      const regToInstall = owner.registered > 0 ? ((owner.installCompleted / owner.registered) * 100).toFixed(1) : 0;
      const instToActive = owner.installCompleted > 0 ? ((owner.active / owner.installCompleted) * 100).toFixed(1) : 0;

      return {
        owner_id: owner.owner_id,
        owner_name: owner.owner_name,
        stats: owner.stats,
        funnel: {
          registered: owner.registered,
          install_completed: owner.installCompleted,
          active: owner.active,
          churned: owner.churned,
        },
        conversion: {
          register_to_install: parseFloat(regToInstall),
          install_to_active: parseFloat(instToActive),
        },
      };
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        success: true,
        data: {
          filter: hasDateFilter ? { start_date: startDate, end_date: endDate } : null,
          overall: {
            stats: overallStats,
            total_stores: totalRegistered,
            total_order_count: totalOrderCount,
            total_customer_count: totalCustomerCount,
            funnel: {
              registered: totalRegistered,
              install_completed: installCompleted,
              active: activeStores,
              churned: totalChurned,
            },
            conversion: {
              active_rate: parseFloat(activeRate),
              churn_rate: parseFloat(churnRate),
            },
            churned: totalChurned,
            install_detail: {
              active: installDetail.active,
              inactive: installDetail.inactive,
              churned_service: installDetail.churned_service,
              churned_unused: installDetail.churned_unused,
              repair: installDetail.repair,
              pending: installDetail.pending,
              active_not_completed: installDetail.active_not_completed,
              summary: {
                active: installDetail.active.length,
                inactive: installDetail.inactive.length,
                churned_service: installDetail.churned_service.length,
                churned_unused: installDetail.churned_unused.length,
                repair: installDetail.repair.length,
                pending: installDetail.pending.length,
                active_not_completed: installDetail.active_not_completed.length
              }
            }
          },
          owners: ownerStatsArray,
        },
      }),
    };
  } catch (error) {
    console.error("ERROR:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        success: false,
        error: error.message,
      }),
    };
  }
};

// 히트맵 데이터 처리 함수 (집계 테이블 사용으로 최적화)
async function handleHeatmapView(startDate, endDate) {
  // 1. 설치완료 매장 목록 조회
  const storesResult = await dynamodb.send(new ScanCommand({
    TableName: storesTable,
    FilterExpression: "#status = :installed",
    ExpressionAttributeNames: { "#status": "status" },
    ExpressionAttributeValues: { ":installed": "QR_MENU_INSTALL" }
  }));

  const stores = storesResult.Items || [];
  const storeMap = {};
  const ownerMap = {};  // { owner_id: owner_name }
  for (const store of stores) {
    if (store.seq) {
      const ownerId = store.owner_id || "unassigned";
      const ownerName = OWNER_NAMES[ownerId] || ownerId.split('@')[0];
      storeMap[store.seq] = {
        store_id: store.store_id,
        store_name: store.store_name,
        seq: store.seq,
        owner_id: ownerId
      };
      if (!ownerMap[ownerId]) {
        ownerMap[ownerId] = ownerName;
      }
    }
  }

  // 2. 집계 테이블에서 매장별 일별 주문 수 조회 (빠름!)
  const ordersByStoreDate = {};
  let lastKey = null;

  do {
    const params = {
      TableName: storeDailyOrdersTable,
      FilterExpression: "order_date BETWEEN :start AND :end",
      ExpressionAttributeValues: {
        ":start": startDate,
        ":end": endDate
      }
    };
    if (lastKey) params.ExclusiveStartKey = lastKey;

    const result = await dynamodb.send(new ScanCommand(params));

    for (const item of result.Items || []) {
      const seq = item.seq;
      const date = item.order_date;
      const count = item.order_count || 0;

      if (!ordersByStoreDate[seq]) {
        ordersByStoreDate[seq] = {};
      }
      ordersByStoreDate[seq][date] = count;
    }

    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  // 3. 날짜 범위 생성
  const dates = [];
  let currentDate = new Date(startDate);
  const end = new Date(endDate);
  while (currentDate <= end) {
    dates.push(currentDate.toISOString().split("T")[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // 4. 히트맵 데이터 구성 (모든 설치완료 매장 포함)
  const heatmapData = [];

  for (const [seq, storeInfo] of Object.entries(storeMap)) {
    const dateOrders = ordersByStoreDate[seq] || {};

    const row = {
      seq,
      store_name: storeInfo.store_name,
      owner_id: storeInfo.owner_id,
      orders: {}
    };

    let totalOrders = 0;
    for (const date of dates) {
      const count = dateOrders[date] || 0;
      row.orders[date] = count;
      totalOrders += count;
    }
    row.total = totalOrders;

    heatmapData.push(row);
  }

  // 주문 총합 기준 내림차순 정렬 (미이용 매장은 맨 아래로)
  heatmapData.sort((a, b) => b.total - a.total);

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify({
      success: true,
      data: {
        period: { start_date: startDate, end_date: endDate },
        dates,
        stores: heatmapData,
        owners: Object.entries(ownerMap).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
      }
    }),
  };
}

// 주간 코호트 뷰 핸들러 (월~일 기준)
async function handleWeeklyCohortView(startDate) {
  try {
    const historyTable = "sms-store-history-dev";

    // 해당 날짜가 속한 주의 월요일 구하기
    const getMonday = (dateStr) => {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return null;
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 일요일이면 -6, 아니면 1
      const monday = new Date(d.setDate(diff));
      return monday.toISOString().split('T')[0];
    };

    // 주차 키 생성 (월요일 날짜 기준: YYYY-MM-DD)
    const getWeekKey = (dateStr) => {
      return getMonday(dateStr);
    };

    // 주차 라벨 (N월 N주차 형식)
    const getWeekLabel = (weekKey) => {
      const monday = new Date(weekKey);
      const month = monday.getMonth() + 1;
      const weekOfMonth = Math.ceil(monday.getDate() / 7);
      return `${month}월 ${weekOfMonth}주차`;
    };

    // 주차 시작/종료일 (월요일~일요일)
    const getWeekStartEnd = (weekKey) => {
      const monday = new Date(weekKey);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return {
        start: monday.toISOString().split('T')[0],
        end: sunday.toISOString().split('T')[0]
      };
    };

  // 1. 병렬로 매장과 히스토리 조회 (성능 최적화)
  const [storesResult, historyResult] = await Promise.all([
    dynamodb.send(new ScanCommand({ TableName: storesTable })),
    dynamodb.send(new ScanCommand({
      TableName: historyTable,
      FilterExpression: "new_status = :status",
      ExpressionAttributeValues: { ":status": "QR_MENU_INSTALL" }
    }))
  ]);

  const stores = storesResult.Items || [];
  const storeMap = {};
  for (const store of stores) {
    storeMap[store.store_id] = store;
  }

  // 2. 히스토리에서 QR_MENU_INSTALL 기록 필터링
  // 진행중 상태에서 QR_MENU_INSTALL로 변경된 것만 최초 설치로 카운트
  const INSTALL_PROGRESS_STATUS = [
    'PRE_INTRODUCTION',
    'VISIT_COMPLETED',
    'REVISIT_SCHEDULED',
    'INFO_REQUEST',
    'REMOTE_INSTALL_SCHEDULED',
    'ADMIN_SETTING',
    'QR_LINKING',
    'QR_MENU_ONLY'
  ];

  const historyItems = historyResult.Items || [];

  // 매장별 가장 최근 설치완료일 (진행중 상태에서 변경된 것만, admin 제외)
  // 보류 후 재설치되면 최근 설치일 기준으로 코호트에 포함
  const ADMIN_EMAIL = 'admin@catchtable.co.kr';
  const latestInstallMap = {};
  for (const item of historyItems) {
    const storeId = item.store_id;
    const oldStatus = item.old_status;
    const changedBy = item.changed_by;
    const changedAt = normalizeDate(item.changed_at);

    // admin 담당 설치 제외 (주간 설치 차트와 동일하게)
    if (changedBy === ADMIN_EMAIL) continue;
    // 진행중 상태에서 QR_MENU_INSTALL로 변경된 것만
    if (!INSTALL_PROGRESS_STATUS.includes(oldStatus)) continue;
    if (!changedAt || changedAt < startDate) continue;
    // 가장 최근 설치일로 업데이트 (최초 → 최근)
    if (!latestInstallMap[storeId] || changedAt > latestInstallMap[storeId]) {
      latestInstallMap[storeId] = changedAt;
    }
  }

  // 3. 일별 집계 테이블에서 주문 데이터 조회 (성능 최적화: 전체 주문 스캔 대신)
  const ordersBySeqDate = {};
  let lastKey = null;
  do {
    const params = {
      TableName: storeDailyOrdersTable,
      FilterExpression: "order_date >= :startDate",
      ExpressionAttributeValues: { ":startDate": startDate }
    };
    if (lastKey) params.ExclusiveStartKey = lastKey;
    const result = await dynamodb.send(new ScanCommand(params));
    for (const item of result.Items || []) {
      const seq = item.seq;
      const orderDate = item.order_date;
      if (seq && orderDate && item.order_count > 0) {
        if (!ordersBySeqDate[seq]) ordersBySeqDate[seq] = new Set();
        ordersBySeqDate[seq].add(orderDate);
      }
    }
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  // 4. 설치 주차별 코호트 그룹화
  const cohorts = {};
  const now = new Date();

  for (const [storeId, installDate] of Object.entries(latestInstallMap)) {
    const store = storeMap[storeId];
    if (!store || !store.seq) continue;
    const weekKey = getWeekKey(installDate);
    if (!weekKey) continue; // 유효하지 않은 날짜 스킵
    if (!cohorts[weekKey]) {
      cohorts[weekKey] = { weekKey, label: getWeekLabel(weekKey), stores: [] };
    }
    cohorts[weekKey].stores.push({
      storeId,
      seq: store.seq,
      orderDates: ordersBySeqDate[store.seq] || new Set()
    });
  }

  // 5. 주차별 잔존율 계산
  const result = [];
  const sortedWeeks = Object.keys(cohorts).sort();

  let maxWeekOffset = 0;
  if (sortedWeeks.length > 0) {
    const { start } = getWeekStartEnd(sortedWeeks[0]);
    maxWeekOffset = Math.floor((now - new Date(start)) / (7 * 24 * 60 * 60 * 1000));
  }

  for (const weekKey of sortedWeeks) {
    const cohort = cohorts[weekKey];
    const installedCount = cohort.stores.length; // 설치 매장 수
    const { start: cohortStart } = getWeekStartEnd(weekKey);

    const row = {
      weekKey: cohort.weekKey,
      label: cohort.label,
      installed: installedCount, // 설치 매장 수 (신규 필드)
      weeks: []
    };

    // Week 0 (설치 주간 이용)부터 시작
    for (let weekOffset = 0; weekOffset <= Math.min(maxWeekOffset, 12); weekOffset++) {
      const checkStart = new Date(cohortStart);
      checkStart.setDate(checkStart.getDate() + weekOffset * 7);
      if (checkStart > now) break;

      const checkEnd = new Date(checkStart);
      checkEnd.setDate(checkEnd.getDate() + 6);
      const checkStartStr = checkStart.toISOString().split('T')[0];
      const checkEndStr = checkEnd.toISOString().split('T')[0];

      const activeCount = cohort.stores.filter(store => {
        const orderDates = store.orderDates;
        if (!orderDates || orderDates.size === 0) return false;
        for (const orderDate of orderDates) {
          if (orderDate >= checkStartStr && orderDate <= checkEndStr) return true;
        }
        return false;
      }).length;

      row.weeks.push({ weekOffset, count: activeCount, rate: Math.round((activeCount / installedCount) * 100) });
    }
    result.push(row);
  }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        success: true,
        data: {
          start_date: startDate,
          cohort_count: result.length,
          cohorts: result
        }
      })
    };
  } catch (error) {
    console.error("Weekly cohort error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
}

// 주간 코호트 상세 뷰 핸들러 (특정 주차 매장별 주문 건수)
async function handleWeeklyCohortDetailView(weekKey) {
  try {
    const historyTable = "sms-store-history-dev";
    const ADMIN_EMAIL = 'admin@catchtable.co.kr';

    // 진행중 상태 (설치 전)
    const INSTALL_PROGRESS_STATUS = [
      'PRE_INTRODUCTION', 'VISIT_COMPLETED', 'REVISIT_SCHEDULED',
      'INFO_REQUEST', 'REMOTE_INSTALL_SCHEDULED', 'ADMIN_SETTING',
      'QR_LINKING', 'QR_MENU_ONLY'
    ];

    // 보류 상태 (설치 후 다시 진행중으로)
    const HOLD_STATUSES = [
      'REVISIT_SCHEDULED', 'INFO_REQUEST', 'REMOTE_INSTALL_SCHEDULED',
      'ADMIN_SETTING', 'QR_LINKING'
    ];

    // 해지 상태
    const CHURNED_STATUSES = ['SERVICE_TERMINATED', 'UNUSED_TERMINATED'];

    // weekKey는 월요일 날짜 (YYYY-MM-DD)
    const monday = new Date(weekKey);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const weekStartStr = monday.toISOString().split('T')[0];
    const weekEndStr = sunday.toISOString().split('T')[0];

    // 주차 라벨
    const month = monday.getMonth() + 1;
    const weekOfMonth = Math.ceil(monday.getDate() / 7);
    const label = `${month}월 ${weekOfMonth}주차`;

    // 1. 병렬로 모든 데이터 조회 (성능 최적화)
    const [storesResult, historyResult, allHistoryResult, dailyOrdersResult] = await Promise.all([
      dynamodb.send(new ScanCommand({ TableName: storesTable })),
      dynamodb.send(new ScanCommand({
        TableName: historyTable,
        FilterExpression: "new_status = :status",
        ExpressionAttributeValues: { ":status": "QR_MENU_INSTALL" }
      })),
      dynamodb.send(new ScanCommand({ TableName: historyTable })),
      dynamodb.send(new ScanCommand({ TableName: storeDailyOrdersTable }))
    ]);

    const storeMap = {};
    for (const store of storesResult.Items || []) {
      storeMap[store.store_id] = store;
    }

    // 2. 해당 주차에 설치된 매장 필터링 (최근 설치일 기준)
    const installsInWeek = {};
    for (const item of historyResult.Items || []) {
      const changedAt = normalizeDate(item.changed_at);
      const changedBy = item.changed_by;
      const oldStatus = item.old_status;

      if (changedBy === ADMIN_EMAIL) continue;
      if (!INSTALL_PROGRESS_STATUS.includes(oldStatus)) continue;
      if (!changedAt) continue;
      if (changedAt < weekStartStr || changedAt > weekEndStr) continue;

      const storeId = item.store_id;
      // 해당 주차 내 최근 설치일
      if (!installsInWeek[storeId] || changedAt > installsInWeek[storeId].changedAt) {
        installsInWeek[storeId] = { changedAt, item };
      }
    }

    // 3. 매장별 상태 변경 이력 정리 (위에서 병렬 조회 완료)
    const statusChangesByStore = {};
    for (const item of allHistoryResult.Items || []) {
      const storeId = item.store_id;
      if (!statusChangesByStore[storeId]) {
        statusChangesByStore[storeId] = [];
      }
      statusChangesByStore[storeId].push({
        changedAt: normalizeDate(item.changed_at),
        oldStatus: item.old_status,
        newStatus: item.new_status
      });
    }

    // 4. seq별 일별 주문 건수 (위에서 병렬 조회 완료)
    const ordersBySeq = {};
    for (const item of dailyOrdersResult.Items || []) {
      const seq = item.seq;
      const orderDate = item.order_date;
      const orderCount = item.order_count || 0;
      if (!ordersBySeq[seq]) ordersBySeq[seq] = {};
      ordersBySeq[seq][orderDate] = orderCount;
    }

    // 5. 현재 날짜 및 최대 주차 수 계산
    const now = new Date();
    const maxWeeks = Math.min(12, Math.floor((now - monday) / (7 * 24 * 60 * 60 * 1000)));

    // 6. 각 매장별 주차별 데이터 생성
    const storesData = [];

    for (const [storeId, { changedAt, item }] of Object.entries(installsInWeek)) {
      const store = storeMap[storeId];
      if (!store || !store.seq) continue;

      const seq = store.seq;
      const storeName = store.store_name;
      const storeOrders = ordersBySeq[seq] || {};
      const statusChanges = (statusChangesByStore[storeId] || []).sort((a, b) =>
        a.changedAt.localeCompare(b.changedAt)
      );

      const weeks = [];
      let terminated = false;
      let terminatedWeek = -1;
      let terminationType = null;

      for (let weekOffset = 0; weekOffset <= maxWeeks; weekOffset++) {
        const checkStart = new Date(monday);
        checkStart.setDate(monday.getDate() + weekOffset * 7);
        const checkEnd = new Date(checkStart);
        checkEnd.setDate(checkStart.getDate() + 6);

        // 아직 도래하지 않은 주차
        if (checkStart > now) {
          weeks.push({ week: weekOffset, value: "-" });
          continue;
        }

        // 이미 보류/해지된 이후
        if (terminated) {
          weeks.push({ week: weekOffset, value: "-" });
          continue;
        }

        const checkStartStr = checkStart.toISOString().split('T')[0];
        const checkEndStr = checkEnd.toISOString().split('T')[0];

        // 해당 주차에 보류/해지 여부 확인
        for (const change of statusChanges) {
          if (change.changedAt >= checkStartStr && change.changedAt <= checkEndStr) {
            // 설치 후 보류로 변경
            if (change.oldStatus === 'QR_MENU_INSTALL' && HOLD_STATUSES.includes(change.newStatus)) {
              terminated = true;
              terminatedWeek = weekOffset;
              terminationType = '보류';
              break;
            }
            // 해지
            if (CHURNED_STATUSES.includes(change.newStatus)) {
              terminated = true;
              terminatedWeek = weekOffset;
              terminationType = '해지';
              break;
            }
          }
        }

        if (terminated && terminatedWeek === weekOffset) {
          weeks.push({ week: weekOffset, value: terminationType });
          continue;
        }

        // 주문 건수 계산
        let orderCount = 0;
        const currentDate = new Date(checkStart);
        while (currentDate <= checkEnd) {
          const dateStr = currentDate.toISOString().split('T')[0];
          orderCount += storeOrders[dateStr] || 0;
          currentDate.setDate(currentDate.getDate() + 1);
        }

        weeks.push({ week: weekOffset, value: `${orderCount}건` });
      }

      storesData.push({
        store_id: storeId,
        store_name: storeName,
        seq: seq,
        install_date: changedAt,
        weeks: weeks
      });
    }

    // 설치일 기준 정렬
    storesData.sort((a, b) => a.install_date.localeCompare(b.install_date));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        success: true,
        data: {
          weekKey,
          label,
          weekStart: weekStartStr,
          weekEnd: weekEndStr,
          storeCount: storesData.length,
          maxWeeks,
          stores: storesData
        }
      })
    };
  } catch (error) {
    console.error("Weekly cohort detail error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
}

// 월별 코호트 분석 처리 함수 (Sankey)
async function handleCohortView(baseDate) {
  const historyTable = "sms-store-history-dev";
  const CHURNED_STATUSES = ["SERVICE_TERMINATED", "UNUSED_TERMINATED"];

  // 1. 전체 매장 조회
  const storesResult = await dynamodb.send(new ScanCommand({ TableName: storesTable }));
  const stores = storesResult.Items || [];
  const storeMap = {};
  for (const store of stores) {
    storeMap[store.store_id] = store;
  }

  // 2. 히스토리에서 모든 QR_MENU_INSTALL 기록 조회
  const historyResult = await dynamodb.send(new ScanCommand({
    TableName: historyTable,
    FilterExpression: "new_status = :status",
    ExpressionAttributeValues: { ":status": "QR_MENU_INSTALL" }
  }));
  const historyItems = historyResult.Items || [];

  // 3. 매장별 최초 설치완료일 찾기
  const firstInstallMap = {};
  for (const item of historyItems) {
    const storeId = item.store_id;
    const changedAt = item.changed_at;
    if (!firstInstallMap[storeId] || changedAt < firstInstallMap[storeId]) {
      firstInstallMap[storeId] = changedAt;
    }
  }

  // 4. 주문 통계 조회 (이용 여부 판단) - 최근 2주 기준
  const twoWeeksAgo = new Date(baseDate);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const startDate = twoWeeksAgo.toISOString().split('T')[0];
  const endDate = baseDate;

  const activeSeqs = new Set();
  let lastKey = null;
  do {
    const params = {
      TableName: storeDailyOrdersTable,
      FilterExpression: "order_date BETWEEN :start AND :end AND order_count > :zero",
      ExpressionAttributeValues: {
        ":start": startDate,
        ":end": endDate,
        ":zero": 0
      }
    };
    if (lastKey) params.ExclusiveStartKey = lastKey;

    const result = await dynamodb.send(new ScanCommand(params));
    for (const item of result.Items || []) {
      if (item.seq) {
        activeSeqs.add(item.seq);
      }
    }
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  // 5. 월별 집계
  const monthlyData = {};

  for (const [storeId, installDate] of Object.entries(firstInstallMap)) {
    const store = storeMap[storeId];
    if (!store) continue;

    // 기준일 이후 설치된 매장은 제외
    if (installDate > baseDate + "T23:59:59.999Z") continue;

    let installMonth = installDate.substring(0, 7); // YYYY-MM

    // 12월 7일 이전 대량 등록 데이터는 "이전 설치"로 분류
    if (installDate < "2025-12-08") {
      installMonth = "0000-00";
    }

    if (!monthlyData[installMonth]) {
      monthlyData[installMonth] = {
        month: installMonth,
        total: 0,
        active: 0,
        inactive: 0,
        churned: 0,
        stores: []
      };
    }

    monthlyData[installMonth].total++;

    const seq = store.seq;
    const status = store.status;
    const isActive = seq && activeSeqs.has(seq);
    const isChurned = CHURNED_STATUSES.includes(status);

    if (isChurned) {
      monthlyData[installMonth].churned++;
    } else if (isActive) {
      monthlyData[installMonth].active++;
    } else {
      monthlyData[installMonth].inactive++;
    }

    monthlyData[installMonth].stores.push({
      store_id: storeId,
      store_name: store.store_name,
      seq: seq,
      status: status,
      install_date: installDate,
      is_active: isActive,
      is_churned: isChurned
    });
  }

  // 6. 월별 정렬 (최신순)
  const sortedMonths = Object.keys(monthlyData).sort().reverse();

  // 7. Sankey 데이터 생성
  const nodes = [];
  const links = [];
  let nodeIndex = 0;

  const stateNodes = { active: null, inactive: null, churned: null };

  // 최근 6개월만 표시
  const recentMonths = sortedMonths.slice(0, 6);

  // 월별 노드 추가
  const monthNodeIndices = {};
  for (const month of recentMonths) {
    const data = monthlyData[month];
    let monthLabel;
    if (month === "0000-00") {
      monthLabel = `이전 설치 (${data.total})`;
    } else {
      monthLabel = `${month.substring(5)}월 설치 (${data.total})`;
    }
    nodes.push({ name: monthLabel });
    monthNodeIndices[month] = nodeIndex++;
  }

  // 상태 노드 추가
  nodes.push({ name: "이용중" });
  stateNodes.active = nodeIndex++;
  nodes.push({ name: "미이용" });
  stateNodes.inactive = nodeIndex++;
  nodes.push({ name: "해지" });
  stateNodes.churned = nodeIndex++;

  // 링크 추가
  for (const month of recentMonths) {
    const data = monthlyData[month];
    const sourceIndex = monthNodeIndices[month];

    if (data.active > 0) {
      links.push({ source: sourceIndex, target: stateNodes.active, value: data.active });
    }
    if (data.inactive > 0) {
      links.push({ source: sourceIndex, target: stateNodes.inactive, value: data.inactive });
    }
    if (data.churned > 0) {
      links.push({ source: sourceIndex, target: stateNodes.churned, value: data.churned });
    }
  }

  // 8. 요약 통계
  const summary = {
    total_installed: Object.values(monthlyData).reduce((sum, m) => sum + m.total, 0),
    total_active: Object.values(monthlyData).reduce((sum, m) => sum + m.active, 0),
    total_inactive: Object.values(monthlyData).reduce((sum, m) => sum + m.inactive, 0),
    total_churned: Object.values(monthlyData).reduce((sum, m) => sum + m.churned, 0)
  };

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify({
      success: true,
      data: {
        base_date: baseDate,
        summary,
        monthly: recentMonths.map(m => monthlyData[m]),
        sankey: { nodes, links }
      }
    })
  };
}

// 전일 미이용 매장 조회 (지난주 같은 요일 대비)
async function handleInactiveTodayView(inputDate) {
  const historyTable = "sms-store-history-dev";
  const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

  // 날짜 계산: 파라미터가 있으면 해당 날짜, 없으면 어제
  let targetDate;
  if (inputDate) {
    targetDate = new Date(inputDate + 'T00:00:00Z');
  } else {
    const today = new Date();
    targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() - 1);
  }
  const targetDateStr = targetDate.toISOString().split('T')[0];
  const dayOfWeek = DAY_NAMES[targetDate.getUTCDay()];

  const lastWeek = new Date(targetDate);
  lastWeek.setDate(lastWeek.getDate() - 7);
  const lastWeekStr = lastWeek.toISOString().split('T')[0];

  // 1. 지난주 같은 요일에 주문이 있었던 매장 조회
  const lastWeekOrdersResult = await dynamodb.send(new ScanCommand({
    TableName: storeDailyOrdersTable,
    FilterExpression: "order_date = :lastWeek AND order_count > :zero",
    ExpressionAttributeValues: {
      ":lastWeek": lastWeekStr,
      ":zero": 0
    }
  }));

  const lastWeekStores = {};
  for (const item of lastWeekOrdersResult.Items || []) {
    lastWeekStores[item.seq] = item.order_count || 0;
  }

  // 2. 선택한 날짜에 주문이 있는 매장 조회
  const targetDateOrdersResult = await dynamodb.send(new ScanCommand({
    TableName: storeDailyOrdersTable,
    FilterExpression: "order_date = :targetDate AND order_count > :zero",
    ExpressionAttributeValues: {
      ":targetDate": targetDateStr,
      ":zero": 0
    }
  }));

  const targetDateActiveSeqs = new Set();
  for (const item of targetDateOrdersResult.Items || []) {
    targetDateActiveSeqs.add(item.seq);
  }

  // 3. 지난주에는 있었지만 선택한 날짜에는 없는 매장 추출
  const inactiveSeqs = Object.keys(lastWeekStores).filter(seq => !targetDateActiveSeqs.has(seq));

  // 4. 매장 상세 정보 조회
  const storesResult = await dynamodb.send(new ScanCommand({ TableName: storesTable }));
  const storeMap = {};
  for (const store of storesResult.Items || []) {
    if (store.seq) {
      storeMap[store.seq] = store;
    }
  }

  // 5. 히스토리에서 설치완료일 조회
  const historyResult = await dynamodb.send(new ScanCommand({
    TableName: historyTable,
    FilterExpression: "new_status = :status",
    ExpressionAttributeValues: { ":status": "QR_MENU_INSTALL" }
  }));

  const firstInstallMap = {};
  for (const item of historyResult.Items || []) {
    const storeId = item.store_id;
    const changedAt = item.changed_at;
    if (!firstInstallMap[storeId] || changedAt < firstInstallMap[storeId]) {
      firstInstallMap[storeId] = changedAt;
    }
  }

  // 6. 금일 미이용 매장 상세 정보 구성
  const inactiveStores = [];
  for (const seq of inactiveSeqs) {
    const store = storeMap[seq];
    if (!store) continue;

    // 현재 상태가 설치완료(QR_MENU_INSTALL)인 매장만 포함
    if (store.status !== 'QR_MENU_INSTALL') continue;

    const ownerId = store.owner_id || 'unassigned';
    const ownerName = OWNER_NAMES[ownerId] || ownerId.split('@')[0];

    inactiveStores.push({
      store_id: store.store_id,
      store_name: store.store_name,
      seq: seq,
      owner_id: ownerId,
      owner_name: ownerName,
      first_install_completed_at: firstInstallMap[store.store_id] || null,
      last_week_order_count: lastWeekStores[seq] || 0
    });
  }

  // 7. 설치일 기준 최신순 정렬
  inactiveStores.sort((a, b) => {
    const dateA = a.first_install_completed_at || '0000-00-00';
    const dateB = b.first_install_completed_at || '0000-00-00';
    return dateB.localeCompare(dateA);
  });

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify({
      success: true,
      data: {
        target_date: targetDateStr,
        last_week_same_day: lastWeekStr,
        day_of_week: dayOfWeek,
        stores: inactiveStores,
        summary: {
          last_week_active: Object.keys(lastWeekStores).length,
          target_date_active: targetDateActiveSeqs.size,
          inactive_count: inactiveStores.length
        }
      }
    })
  };
}
