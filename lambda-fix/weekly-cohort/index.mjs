import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-northeast-2" });
const dynamodb = DynamoDBDocumentClient.from(client);

const storesTable = "sms-stores-dev";
const historyTable = "sms-store-history-dev";
const ordersTable = "sms-orders-dev";

// 날짜를 주차 키로 변환 (YYYY-MM-WN 형식)
const getWeekKey = (dateStr) => {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const firstDayOfMonth = new Date(year, d.getMonth(), 1);
  const firstDayWeekday = firstDayOfMonth.getDay();
  const dayOfMonth = d.getDate();
  const weekNumber = Math.ceil((dayOfMonth + firstDayWeekday) / 7);
  return `${year}-${String(month).padStart(2, '0')}-W${weekNumber}`;
};

// 주차 키를 라벨로 변환
const getWeekLabel = (weekKey) => {
  const parts = weekKey.split('-');
  const month = parseInt(parts[1]);
  const weekNum = parts[2].replace('W', '');
  return `${month}월 ${weekNum}주`;
};

// 주차의 시작/종료일 계산
const getWeekStartEnd = (weekKey) => {
  const parts = weekKey.split('-');
  const year = parseInt(parts[0]);
  const monthNum = parseInt(parts[1]) - 1;
  const weekNum = parseInt(parts[2].replace('W', ''));

  const firstDayOfMonth = new Date(year, monthNum, 1);
  const firstDayWeekday = firstDayOfMonth.getDay();
  const startDay = (weekNum - 1) * 7 - firstDayWeekday + 1;

  const start = new Date(year, monthNum, Math.max(startDay, 1));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  // 월 경계 처리
  const lastDayOfMonth = new Date(year, monthNum + 1, 0);
  if (end > lastDayOfMonth) {
    end.setTime(lastDayOfMonth.getTime());
  }

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
  };
};

// 날짜 정규화
const normalizeDate = (dateStr) => {
  if (!dateStr) return null;
  let normalized = dateStr.replace(/\./g, '-');
  const parts = normalized.split('-');
  if (parts.length === 3) {
    return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
  }
  return normalized.split('T')[0];
};

export const handler = async (event) => {
  try {
    const queryParams = event.queryStringParameters || {};
    const startDate = queryParams.start_date || "2024-12-15";

    // 1. 전체 매장 조회
    const storesResult = await dynamodb.send(new ScanCommand({ TableName: storesTable }));
    const stores = storesResult.Items || [];
    const storeMap = {};
    for (const store of stores) {
      storeMap[store.store_id] = store;
    }

    // 2. 히스토리에서 QR_MENU_INSTALL 기록 조회 (설치 완료일)
    const historyResult = await dynamodb.send(new ScanCommand({
      TableName: historyTable,
      FilterExpression: "new_status = :status",
      ExpressionAttributeValues: { ":status": "QR_MENU_INSTALL" }
    }));
    const historyItems = historyResult.Items || [];

    // 매장별 최초 설치완료일 찾기
    const firstInstallMap = {};
    for (const item of historyItems) {
      const storeId = item.store_id;
      const changedAt = normalizeDate(item.changed_at);
      if (!changedAt) continue;
      if (changedAt < startDate) continue; // 시작일 이전은 제외

      if (!firstInstallMap[storeId] || changedAt < firstInstallMap[storeId]) {
        firstInstallMap[storeId] = changedAt;
      }
    }

    // 3. 주문 데이터 전체 스캔
    const ordersBySeqDate = {};
    let lastKey = null;

    do {
      const params = {
        TableName: ordersTable,
        FilterExpression: "seq <> :unmapped",
        ExpressionAttributeValues: { ":unmapped": "UNMAPPED" }
      };
      if (lastKey) params.ExclusiveStartKey = lastKey;

      const result = await dynamodb.send(new ScanCommand(params));

      for (const order of result.Items || []) {
        const rawDate = order.order_date;
        const seq = order.seq;

        if (rawDate && seq) {
          const date = normalizeDate(rawDate);
          if (date && date >= startDate) {
            if (!ordersBySeqDate[seq]) {
              ordersBySeqDate[seq] = new Set();
            }
            ordersBySeqDate[seq].add(date);
          }
        }
      }

      lastKey = result.LastEvaluatedKey;
    } while (lastKey);

    // 4. 설치 주차별 코호트 그룹화
    const cohorts = {};
    const now = new Date();
    const currentWeekKey = getWeekKey(now.toISOString());

    for (const [storeId, installDate] of Object.entries(firstInstallMap)) {
      const store = storeMap[storeId];
      if (!store || !store.seq) continue;

      const weekKey = getWeekKey(installDate);

      if (!cohorts[weekKey]) {
        cohorts[weekKey] = {
          weekKey,
          label: getWeekLabel(weekKey),
          installDate: getWeekStartEnd(weekKey),
          stores: []
        };
      }

      cohorts[weekKey].stores.push({
        storeId,
        seq: store.seq,
        storeName: store.store_name,
        installDate,
        orderDates: ordersBySeqDate[store.seq] || new Set()
      });
    }

    // 5. 주차별 잔존율 계산
    const result = [];
    const sortedWeeks = Object.keys(cohorts).sort();

    // 최대 주차 수 계산
    let maxWeekOffset = 0;
    if (sortedWeeks.length > 0) {
      const oldestWeek = sortedWeeks[0];
      const { start } = getWeekStartEnd(oldestWeek);
      const oldestStart = new Date(start);
      maxWeekOffset = Math.floor((now - oldestStart) / (7 * 24 * 60 * 60 * 1000));
    }

    for (const weekKey of sortedWeeks) {
      const cohort = cohorts[weekKey];
      const week0Count = cohort.stores.length;
      const { start: cohortStart } = getWeekStartEnd(weekKey);

      const row = {
        weekKey: cohort.weekKey,
        label: cohort.label,
        week0: { count: week0Count, rate: 100 },
        weeks: []
      };

      // Week 1 ~ Week N 계산
      for (let weekOffset = 1; weekOffset <= Math.min(maxWeekOffset, 12); weekOffset++) {
        const checkStart = new Date(cohortStart);
        checkStart.setDate(checkStart.getDate() + weekOffset * 7);

        if (checkStart > now) break;

        const checkEnd = new Date(checkStart);
        checkEnd.setDate(checkEnd.getDate() + 6);

        const checkStartStr = checkStart.toISOString().split('T')[0];
        const checkEndStr = checkEnd.toISOString().split('T')[0];

        // 해당 주차에 주문 1건 이상인 매장 수
        const activeCount = cohort.stores.filter(store => {
          const orderDates = store.orderDates;
          if (!orderDates || orderDates.size === 0) return false;

          for (const orderDate of orderDates) {
            if (orderDate >= checkStartStr && orderDate <= checkEndStr) {
              return true;
            }
          }
          return false;
        }).length;

        row.weeks.push({
          weekOffset,
          count: activeCount,
          rate: Math.round((activeCount / week0Count) * 100)
        });
      }

      result.push(row);
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        success: true,
        data: {
          start_date: startDate,
          current_week: currentWeekKey,
          cohort_count: result.length,
          cohorts: result
        }
      })
    };
  } catch (error) {
    console.error("ERROR:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
