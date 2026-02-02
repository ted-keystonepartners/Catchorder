import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-northeast-2" });
const dynamodb = DynamoDBDocumentClient.from(client);

const dailyStatsTable = "sms-daily-order-stats-dev";
const storeDailyOrdersTable = "sms-store-daily-orders-dev";

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

    // WAU 계산을 위해 시작일 6일 전부터 데이터 조회
    const wauStartDate = new Date(startDate);
    wauStartDate.setDate(wauStartDate.getDate() - 6);
    const wauStartStr = wauStartDate.toISOString().split("T")[0];

    // 1. 매장별 일별 주문 데이터 조회 (WAU 계산용)
    const storeOrdersByDate = {}; // { date: Set<seq> }
    let lastKey = null;
    do {
      const params = {
        TableName: storeDailyOrdersTable,
        FilterExpression: "order_date BETWEEN :start AND :end AND order_count > :zero",
        ExpressionAttributeValues: {
          ":start": wauStartStr,
          ":end": endDate,
          ":zero": 0
        }
      };
      if (lastKey) params.ExclusiveStartKey = lastKey;

      const result = await dynamodb.send(new ScanCommand(params));
      for (const item of result.Items || []) {
        const date = item.order_date;
        const seq = item.seq;
        if (date && seq) {
          if (!storeOrdersByDate[date]) storeOrdersByDate[date] = new Set();
          storeOrdersByDate[date].add(seq);
        }
      }
      lastKey = result.LastEvaluatedKey;
    } while (lastKey);

    // 2. 기존 집계 테이블에서 누적 데이터 조회
    const statsResult = await dynamodb.send(new ScanCommand({
      TableName: dailyStatsTable,
      FilterExpression: "order_date BETWEEN :start AND :end",
      ExpressionAttributeValues: {
        ":start": startDate,
        ":end": endDate
      }
    }));

    const statsMap = {};
    for (const item of statsResult.Items || []) {
      statsMap[item.order_date] = {
        order_count: item.order_count || 0,
        new_installs: item.new_installs || 0,
        new_churns: item.new_churns || 0,
        cumulative_installed: item.cumulative_installed || 0,
        cumulative_churned: item.cumulative_churned || 0
      };
    }

    // 3. 날짜별 WAU 계산 (최근 7일간 이용 매장 수)
    const dailyUsage = [];
    let currentDate = new Date(startDate);
    const end = new Date(endDate);

    let lastCumulativeInstalled = 0;
    let lastCumulativeChurned = 0;

    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split("T")[0];

      // 최근 7일간 이용 매장 계산 (WAU)
      const wauSeqs = new Set();
      for (let i = 0; i < 7; i++) {
        const checkDate = new Date(currentDate);
        checkDate.setDate(currentDate.getDate() - i);
        const checkDateStr = checkDate.toISOString().split("T")[0];
        const seqs = storeOrdersByDate[checkDateStr];
        if (seqs) {
          for (const seq of seqs) {
            wauSeqs.add(seq);
          }
        }
      }

      const stat = statsMap[dateStr];
      if (stat) {
        lastCumulativeInstalled = stat.cumulative_installed || lastCumulativeInstalled;
        lastCumulativeChurned = stat.cumulative_churned || lastCumulativeChurned;
      }

      dailyUsage.push({
        date: dateStr,
        active: wauSeqs.size, // WAU (최근 7일간 이용 매장 수)
        order_count: stat ? stat.order_count : 0,
        new_installs: stat ? stat.new_installs : 0,
        new_churns: stat ? stat.new_churns : 0,
        cumulative_installed: lastCumulativeInstalled,
        cumulative_churned: lastCumulativeChurned
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
