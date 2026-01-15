import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-northeast-2" });
const dynamodb = DynamoDBDocumentClient.from(client);

const dailyStatsTable = "sms-daily-order-stats-dev";
const historyTable = "sms-store-history-dev";

const INSTALL_COMPLETED = ["QR_MENU_INSTALL", "SERVICE_TERMINATED", "UNUSED_TERMINATED", "DEFECT_REPAIR"];
const CHURNED = ["SERVICE_TERMINATED", "UNUSED_TERMINATED"];

async function recalcWithReactivation() {
  // 1. 모든 상태 변경 이력 조회
  console.log("📜 상태 변경 이력 조회 중...");
  const historyResult = await dynamodb.send(new ScanCommand({ TableName: historyTable }));
  const history = historyResult.Items || [];
  console.log(`총 ${history.length}개 이력`);

  // 2. 날짜별로 변동 집계
  const dailyChanges = {};  // { date: { newInstalls, uninstalls, newChurns, reactivations } }

  for (const h of history) {
    const date = h.changed_date;
    if (!date) continue;

    if (!dailyChanges[date]) {
      dailyChanges[date] = { newInstalls: 0, uninstalls: 0, newChurns: 0, reactivations: 0 };
    }

    const oldStatus = h.old_status || "";
    const newStatus = h.new_status || "";

    // 설치완료 → 미설치 (uninstall)
    if (INSTALL_COMPLETED.includes(oldStatus) && !INSTALL_COMPLETED.includes(newStatus)) {
      dailyChanges[date].uninstalls++;
    }
    // 미설치 → 설치완료 (new install)
    if (!INSTALL_COMPLETED.includes(oldStatus) && INSTALL_COMPLETED.includes(newStatus)) {
      dailyChanges[date].newInstalls++;
    }

    // 해지 → 비해지 (reactivation)
    if (CHURNED.includes(oldStatus) && !CHURNED.includes(newStatus)) {
      dailyChanges[date].reactivations++;
    }
    // 비해지 → 해지 (new churn)
    if (!CHURNED.includes(oldStatus) && CHURNED.includes(newStatus)) {
      dailyChanges[date].newChurns++;
    }
  }

  // 3. 모든 일별 데이터 조회
  const result = await dynamodb.send(new ScanCommand({ TableName: dailyStatsTable }));
  const items = result.Items || [];
  items.sort((a, b) => a.order_date.localeCompare(b.order_date));

  console.log(`\n📊 ${items.length}개 일별 레코드 업데이트 중...`);

  // 4. 누적값 계산 (변동 고려)
  let cumulativeInstalled = 0;
  let cumulativeChurned = 0;

  for (const item of items) {
    const date = item.order_date;
    const changes = dailyChanges[date] || { newInstalls: 0, uninstalls: 0, newChurns: 0, reactivations: 0 };

    // 누적값 업데이트
    cumulativeInstalled += changes.newInstalls - changes.uninstalls;
    cumulativeChurned += changes.newChurns - changes.reactivations;

    // 음수 방지
    if (cumulativeInstalled < 0) cumulativeInstalled = 0;
    if (cumulativeChurned < 0) cumulativeChurned = 0;

    // DB 업데이트
    await dynamodb.send(new UpdateCommand({
      TableName: dailyStatsTable,
      Key: { order_date: date },
      UpdateExpression: "SET cumulative_installed = :installed, cumulative_churned = :churned, new_installs = :ni, new_churns = :nc, reactivations = :react",
      ExpressionAttributeValues: {
        ":installed": cumulativeInstalled,
        ":churned": cumulativeChurned,
        ":ni": changes.newInstalls,
        ":nc": changes.newChurns,
        ":react": changes.reactivations
      }
    }));

    console.log(`${date}: +${changes.newInstalls}/-${changes.uninstalls} installs, +${changes.newChurns}/-${changes.reactivations} churns → 누적: ${cumulativeInstalled} installed, ${cumulativeChurned} churned`);
  }

  console.log(`\n✅ 완료! 최종 누적: installed=${cumulativeInstalled}, churned=${cumulativeChurned}`);
}

recalcWithReactivation().catch(console.error);
