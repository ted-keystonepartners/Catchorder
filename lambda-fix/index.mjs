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
  let normalized = dateStr.replace(/\./g, '-');
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

    // 1. 사용자(담당자) 정보 조회
    const usersResult = await dynamodb.send(new ScanCommand({ TableName: usersTable }));
    const users = usersResult.Items || [];
    const userMap = {};
    for (const user of users) {
      userMap[user.user_id] = user;
    }

    // 2. 전체 매장 조회
    const storesResult = await dynamodb.send(new ScanCommand({ TableName: storesTable }));
    const stores = storesResult.Items || [];

    // 3. 이용매장 세트 구성
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
          // Set 타입인 경우
          for (const seq of day.store_seqs) {
            activeStoreSeqs.add(seq);
          }
        }
        totalOrderCount += day.order_count || 0;
      }

      // 기간 내 주문이 있는 매장의 상세 정보는 order-stats에서 가져옴
      const orderStatsResult = await dynamodb.send(new ScanCommand({ TableName: orderStatsTable }));
      for (const stat of orderStatsResult.Items || []) {
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
      const orderStatsResult = await dynamodb.send(new ScanCommand({ TableName: orderStatsTable }));
      const orderStats = orderStatsResult.Items || [];

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
