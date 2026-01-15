import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-northeast-2" });
const dynamodb = DynamoDBDocumentClient.from(client);

const storesTable = "sms-stores-dev";
const statsTable = "sms-daily-stats-dev";
const historyTable = "sms-store-history-dev";
const ordersTable = "sms-orders-dev";

// 상태값 분류
const INSTALL_COMPLETED = ["QR_MENU_INSTALL"];
const CHURNED = ["SERVICE_TERMINATED", "UNUSED_TERMINATED"];
const IN_PROGRESS = ["VISIT_PENDING", "VISIT_COMPLETED", "REVISIT_SCHEDULED", "INFO_REQUEST", "REMOTE_INSTALL_SCHEDULED", "ADMIN_SETTING", "QR_LINKING"];

export const handler = async (event) => {
  try {
    const now = new Date();
    const snapshotDate = now.toISOString().split("T")[0];
    const yesterdayDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // 1. 전체 매장 조회
    const storesResult = await dynamodb.send(new ScanCommand({ TableName: storesTable }));
    const stores = storesResult.Items || [];

    // 2. 주문 데이터 조회 (이용매장 파악)
    const ordersResult = await dynamodb.send(new ScanCommand({ TableName: ordersTable }));
    const orders = ordersResult.Items || [];
    
    // seq별 주문 있는 매장 Set
    const activeStoreSeqs = new Set();
    for (const order of orders) {
      if (order.seq && order.seq !== "UNMAPPED") {
        activeStoreSeqs.add(order.seq);
      }
    }

    // 3. 오늘 상태 변경 이력 조회 (신규등록, 이탈 등)
    const historyResult = await dynamodb.send(
      new QueryCommand({
        TableName: historyTable,
        IndexName: "changed_date-index",
        KeyConditionExpression: "changed_date = :date",
        ExpressionAttributeValues: { ":date": snapshotDate },
      })
    );
    const todayHistory = historyResult.Items || [];

    // 4. 어제 스냅샷 조회 (비교용)
    let yesterdayStats = null;
    try {
      const yesterdayResult = await dynamodb.send(
        new QueryCommand({
          TableName: statsTable,
          KeyConditionExpression: "snapshot_date = :date AND stats_type = :type",
          ExpressionAttributeValues: { ":date": yesterdayDate, ":type": "overall" },
        })
      );
      yesterdayStats = yesterdayResult.Items?.[0] || null;
    } catch (e) {
      console.log("어제 스냅샷 없음");
    }

    // 5. 집계 시작
    const overallStats = {};
    const ownerStats = {};
    
    let totalRegistered = 0;
    let installCompleted = 0;
    let activeStores = 0;
    let totalChurned = 0;
    const churnByStage = {};

    for (const store of stores) {
      const status = store.status || "UNKNOWN";
      const ownerId = store.owner_id || "unassigned";
      const seq = store.seq || "";

      // 상태별 집계
      overallStats[status] = (overallStats[status] || 0) + 1;

      // 담당자별 집계 초기화
      if (!ownerStats[ownerId]) {
        ownerStats[ownerId] = {
          stats: {},
          registered: 0,
          installCompleted: 0,
          active: 0,
          churned: 0,
        };
      }
      ownerStats[ownerId].stats[status] = (ownerStats[ownerId].stats[status] || 0) + 1;
      ownerStats[ownerId].registered++;

      // 전체 등록
      totalRegistered++;

      // 설치완료 체크
      if (INSTALL_COMPLETED.includes(status)) {
        installCompleted++;
        ownerStats[ownerId].installCompleted++;
      }

      // 이용매장 체크 (주문 있는 매장)
      if (seq && activeStoreSeqs.has(seq)) {
        activeStores++;
        ownerStats[ownerId].active++;
      }

      // 이탈 체크
      if (CHURNED.includes(status)) {
        totalChurned++;
        ownerStats[ownerId].churned++;
      }
    }

    // 6. 이탈 단계별 분석 (history에서)
    for (const history of todayHistory) {
      if (CHURNED.includes(history.new_status)) {
        const oldStatus = history.old_status || "UNKNOWN";
        churnByStage[oldStatus] = (churnByStage[oldStatus] || 0) + 1;
      }
    }

    // 7. 오늘 변동 계산
    const todayNewRegistered = todayHistory.filter(h => h.old_status === "N/A" || !h.old_status).length;
    const todayNewInstall = todayHistory.filter(h => INSTALL_COMPLETED.includes(h.new_status)).length;
    const todayChurned = todayHistory.filter(h => CHURNED.includes(h.new_status)).length;
    
    // 오늘 신규 이용매장 (어제 대비)
    const yesterdayActive = yesterdayStats?.funnel?.active || 0;
    const todayNewActive = activeStores - yesterdayActive;

    // 8. 전환율 계산
    const registerToInstall = totalRegistered > 0 ? ((installCompleted / totalRegistered) * 100).toFixed(1) : 0;
    const installToActive = installCompleted > 0 ? ((activeStores / installCompleted) * 100).toFixed(1) : 0;

    // 9. 전체 스냅샷 저장
    await dynamodb.send(
      new PutCommand({
        TableName: statsTable,
        Item: {
          snapshot_date: snapshotDate,
          stats_type: "overall",
          stats: overallStats,
          total_stores: stores.length,
          funnel: {
            registered: totalRegistered,
            install_completed: installCompleted,
            active: activeStores,
          },
          conversion: {
            register_to_install: parseFloat(registerToInstall),
            install_to_active: parseFloat(installToActive),
          },
          daily_change: {
            new_registered: todayNewRegistered,
            new_install: todayNewInstall,
            new_active: todayNewActive > 0 ? todayNewActive : 0,
            churned: todayChurned,
          },
          churn_analysis: {
            total_churned: totalChurned,
            by_stage: churnByStage,
          },
          created_at: now.toISOString(),
        },
      })
    );

    // 10. 담당자별 스냅샷 저장
    for (const [ownerId, data] of Object.entries(ownerStats)) {
      const ownerRegToInstall = data.registered > 0 ? ((data.installCompleted / data.registered) * 100).toFixed(1) : 0;
      const ownerInstallToActive = data.installCompleted > 0 ? ((data.active / data.installCompleted) * 100).toFixed(1) : 0;

      await dynamodb.send(
        new PutCommand({
          TableName: statsTable,
          Item: {
            snapshot_date: snapshotDate,
            stats_type: `owner:${ownerId}`,
            stats: data.stats,
            total_stores: data.registered,
            funnel: {
              registered: data.registered,
              install_completed: data.installCompleted,
              active: data.active,
            },
            conversion: {
              register_to_install: parseFloat(ownerRegToInstall),
              install_to_active: parseFloat(ownerInstallToActive),
            },
            created_at: now.toISOString(),
          },
        })
      );
    }

    console.log(`스냅샷 완료: ${snapshotDate}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        snapshot_date: snapshotDate,
        total_stores: stores.length,
        funnel: { registered: totalRegistered, install_completed: installCompleted, active: activeStores },
        conversion: { register_to_install: registerToInstall, install_to_active: installToActive },
        churn_analysis: { total_churned: totalChurned, by_stage: churnByStage },
      }),
    };
  } catch (error) {
    console.error("ERROR:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message }),
    };
  }
};