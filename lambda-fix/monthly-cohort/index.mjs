import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-northeast-2" });
const dynamodb = DynamoDBDocumentClient.from(client);

const storesTable = "sms-stores-dev";
const historyTable = "sms-store-history-dev";
const orderStatsTable = "sms-order-stats-dev";

export const handler = async (event) => {
  try {
    const queryParams = event.queryStringParameters || {};
    const baseDate = queryParams.base_date || new Date().toISOString().split("T")[0];

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

    // 4. 주문 통계 조회 (이용 여부 판단)
    const orderStatsResult = await dynamodb.send(new ScanCommand({ TableName: orderStatsTable }));
    const orderStats = orderStatsResult.Items || [];
    const activeSeqs = new Set();
    for (const stat of orderStats) {
      if (stat.order_count > 0) {
        activeSeqs.add(stat.seq);
      }
    }

    // 5. 월별 집계
    const monthlyData = {};
    const CHURNED_STATUSES = ["SERVICE_TERMINATED", "UNUSED_TERMINATED"];

    for (const [storeId, installDate] of Object.entries(firstInstallMap)) {
      const store = storeMap[storeId];
      if (!store) continue;

      // 기준일 이후 설치된 매장은 제외
      if (installDate > baseDate + "T23:59:59.999Z") continue;

      const installMonth = installDate.substring(0, 7); // YYYY-MM
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

    // 상태 노드 인덱스
    const stateNodes = {
      active: null,
      inactive: null,
      churned: null
    };

    // 최근 6개월만 표시
    const recentMonths = sortedMonths.slice(0, 6);

    // 월별 노드 추가
    const monthNodeIndices = {};
    for (const month of recentMonths) {
      const data = monthlyData[month];
      const monthLabel = `${month.substring(5)}월 설치 (${data.total})`;
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
  } catch (error) {
    console.error("ERROR:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
