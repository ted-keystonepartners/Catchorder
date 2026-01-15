import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-northeast-2" });
const dynamodb = DynamoDBDocumentClient.from(client);

const dailyStatsTable = "sms-daily-order-stats-dev";

export const handler = async (event) => {
  try {
    const queryParams = event.queryStringParameters || {};

    // 기본값: 최근 30일
    const endDate = queryParams.end_date || new Date().toISOString().split("T")[0];
    const startDate = queryParams.start_date || (() => {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return d.toISOString().split("T")[0];
    })();

    // 집계 테이블에서 조회 (매우 빠름!)
    const result = await dynamodb.send(new ScanCommand({
      TableName: dailyStatsTable,
      FilterExpression: "order_date BETWEEN :start AND :end",
      ExpressionAttributeValues: {
        ":start": startDate,
        ":end": endDate
      }
    }));

    const statsMap = {};
    for (const item of result.Items || []) {
      // store_seqs Set이 있으면 크기로, 없으면 active_store_count 사용
      const activeCount = item.store_seqs
        ? (item.store_seqs.size || item.store_seqs.length || 0)
        : (item.active_store_count || 0);

      statsMap[item.order_date] = {
        date: item.order_date,
        active: activeCount,
        order_count: item.order_count || 0,
        new_installs: item.new_installs || 0,
        new_churns: item.new_churns || 0,
        cumulative_installed: item.cumulative_installed || 0,
        cumulative_churned: item.cumulative_churned || 0
      };
    }

    // 날짜 범위 생성 및 결과 매핑
    const dailyUsage = [];
    let currentDate = new Date(startDate);
    const end = new Date(endDate);

    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split("T")[0];
      const stat = statsMap[dateStr];

      dailyUsage.push({
        date: dateStr,
        active: stat ? stat.active : 0,
        order_count: stat ? stat.order_count : 0,
        new_installs: stat ? stat.new_installs : 0,
        new_churns: stat ? stat.new_churns : 0,
        cumulative_installed: stat ? stat.cumulative_installed : 0,
        cumulative_churned: stat ? stat.cumulative_churned : 0
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // 요약 통계
    const daysWithData = dailyUsage.filter(d => d.active > 0);
    const totalActive = daysWithData.reduce((sum, d) => sum + d.active, 0);
    const avgActive = daysWithData.length > 0 ? (totalActive / daysWithData.length).toFixed(1) : 0;
    const maxActive = Math.max(...dailyUsage.map(d => d.active), 0);

    const summary = {
      period: { start_date: startDate, end_date: endDate },
      total_days: daysWithData.length,
      avg_daily_active: parseFloat(avgActive),
      max_daily_active: maxActive
    };

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        success: true,
        data: {
          summary,
          daily_usage: dailyUsage
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
