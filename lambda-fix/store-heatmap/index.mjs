import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-northeast-2" });
const dynamodb = DynamoDBDocumentClient.from(client);

const ordersTable = "sms-orders-dev";
const storesTable = "sms-stores-dev";

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

export const handler = async (event) => {
  try {
    const queryParams = event.queryStringParameters || {};

    // 기본값: 최근 14일
    const endDate = queryParams.end_date || new Date().toISOString().split("T")[0];
    const startDate = queryParams.start_date || (() => {
      const d = new Date();
      d.setDate(d.getDate() - 14);
      return d.toISOString().split("T")[0];
    })();

    // 1. 설치완료 매장 목록 조회
    const storesResult = await dynamodb.send(new ScanCommand({
      TableName: storesTable,
      FilterExpression: "#status = :installed",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: { ":installed": "QR_MENU_INSTALL" }
    }));

    const stores = storesResult.Items || [];
    const storeMap = {};
    const ownerSet = new Set();
    for (const store of stores) {
      if (store.seq) {
        const ownerId = store.owner_id || "unassigned";
        storeMap[store.seq] = {
          store_id: store.store_id,
          store_name: store.store_name,
          seq: store.seq,
          owner_id: ownerId
        };
        ownerSet.add(ownerId);
      }
    }

    // 2. 주문 데이터 스캔 (pagination 처리)
    const ordersByStoreDate = {};
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

          // 날짜 범위 필터
          if (date >= startDate && date <= endDate) {
            if (!ordersByStoreDate[seq]) {
              ordersByStoreDate[seq] = {};
            }
            ordersByStoreDate[seq][date] = (ordersByStoreDate[seq][date] || 0) + 1;
          }
        }
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

    // 4. 히트맵 데이터 구성
    const heatmapData = [];

    for (const [seq, dateOrders] of Object.entries(ordersByStoreDate)) {
      const storeInfo = storeMap[seq];
      if (!storeInfo) continue; // 설치완료 매장만

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

    // 주문 총합 기준 내림차순 정렬
    heatmapData.sort((a, b) => b.total - a.total);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        success: true,
        data: {
          period: { start_date: startDate, end_date: endDate },
          dates,
          stores: heatmapData,
          owners: Array.from(ownerSet).sort()
        }
      }),
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
        error: error.message,
      }),
    };
  }
};
