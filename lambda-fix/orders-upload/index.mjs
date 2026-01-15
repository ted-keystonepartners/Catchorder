import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, BatchWriteCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-northeast-2" });
const docClient = DynamoDBDocumentClient.from(client);

const ordersTable = "sms-orders-dev";
const statsTable = "sms-order-stats-dev";  // seq별 집계 테이블
const dailyStatsTable = "sms-daily-order-stats-dev";  // 일별 집계 테이블
const storeDailyOrdersTable = "sms-store-daily-orders-dev";  // 매장별 일별 주문 테이블

// 날짜 형식 정규화
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
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "POST,OPTIONS"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    const { orders } = JSON.parse(event.body);

    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, message: "주문 데이터가 없습니다." })
      };
    }

    const now = new Date().toISOString();
    const newOrders = [];
    const updatedOrders = [];
    let duplicateCount = 0;

    // 중복 체크: order_id + order_time + payment_amount 조합
    for (const order of orders) {
      const itemId = `${order.order_id}_${order.order_time}_${order.payment_amount}`;

      // 해당 item_id가 이미 존재하는지 확인
      const existingQuery = await docClient.send(new QueryCommand({
        TableName: ordersTable,
        IndexName: "order_id-index",
        KeyConditionExpression: "order_id = :oid",
        FilterExpression: "order_time = :ot AND payment_amount = :pa",
        ExpressionAttributeValues: {
          ":oid": order.order_id,
          ":ot": order.order_time,
          ":pa": order.payment_amount || 0
        }
      }));

      if (existingQuery.Items && existingQuery.Items.length > 0) {
        const existing = existingQuery.Items[0];
        // 기존 seq가 UNMAPPED이고 새 seq가 있으면 → 업데이트
        if (existing.seq === "UNMAPPED" && order.seq && order.seq !== "UNMAPPED") {
          updatedOrders.push({
            item_id: existing.item_id,
            seq: order.seq,
            order_id: order.order_id  // 집계용
          });
        } else {
          duplicateCount++;
        }
      } else {
        newOrders.push({
          ...order,
          item_id: `${order.order_id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        });
      }
    }

    let savedCount = 0;
    let updatedCount = 0;

    // seq별 집계 (집계 테이블 업데이트용)
    const statsUpdates = {};
    // 일별 집계 (일별 집계 테이블 업데이트용)
    const dailyUpdates = {};
    // 매장별 일별 주문 집계 (히트맵용)
    const storeDailyUpdates = {};  // { "seq#date": count }

    // 신규 저장 (BatchWrite - 25개씩)
    for (let i = 0; i < newOrders.length; i += 25) {
      const batch = newOrders.slice(i, i + 25);

      const putRequests = batch.map(order => ({
        PutRequest: {
          Item: {
            item_id: order.item_id,
            order_id: order.order_id,
            seq: order.seq || "UNMAPPED",
            store_name_csv: order.store_name_csv,
            order_time: order.order_time,
            order_date: order.order_time.split(" ")[0],
            payment_status: order.payment_status,
            coupon_discount: order.coupon_discount || 0,
            payment_amount: order.payment_amount || 0,
            payment_time: order.payment_time,
            created_at: now
          }
        }
      }));

      await docClient.send(new BatchWriteCommand({
        RequestItems: { [ordersTable]: putRequests }
      }));

      // 집계용 데이터 수집 (UNMAPPED 제외)
      for (const order of batch) {
        const seq = order.seq || "UNMAPPED";
        const orderDate = normalizeDate(order.order_time?.split(" ")[0]);

        if (seq && seq !== "UNMAPPED") {
          // seq별 집계
          if (!statsUpdates[seq]) {
            statsUpdates[seq] = { orderCount: 0, customerIds: new Set() };
          }
          statsUpdates[seq].orderCount++;
          if (order.order_id) {
            statsUpdates[seq].customerIds.add(order.order_id);
          }

          // 일별 집계
          if (orderDate) {
            if (!dailyUpdates[orderDate]) {
              dailyUpdates[orderDate] = { orderCount: 0, storeSeqs: new Set() };
            }
            dailyUpdates[orderDate].orderCount++;
            dailyUpdates[orderDate].storeSeqs.add(seq);

            // 매장별 일별 주문 집계 (히트맵용)
            const storeDailyKey = `${seq}#${orderDate}`;
            storeDailyUpdates[storeDailyKey] = (storeDailyUpdates[storeDailyKey] || 0) + 1;
          }
        }
      }

      savedCount += batch.length;
    }

    // seq 업데이트 (UNMAPPED → 실제 seq)
    for (const order of updatedOrders) {
      await docClient.send(new UpdateCommand({
        TableName: ordersTable,
        Key: { item_id: order.item_id },
        UpdateExpression: "SET seq = :seq, updated_at = :updated_at",
        ExpressionAttributeValues: {
          ":seq": order.seq,
          ":updated_at": now
        }
      }));

      // 집계용 데이터 수집 (업데이트된 주문도 포함)
      if (!statsUpdates[order.seq]) {
        statsUpdates[order.seq] = { orderCount: 0, customerIds: new Set() };
      }
      statsUpdates[order.seq].orderCount++;
      if (order.order_id) {
        statsUpdates[order.seq].customerIds.add(order.order_id);
      }

      updatedCount++;
    }

    // seq별 집계 테이블 업데이트
    for (const [seq, stats] of Object.entries(statsUpdates)) {
      await docClient.send(new UpdateCommand({
        TableName: statsTable,
        Key: { seq: seq },
        UpdateExpression: "SET order_count = if_not_exists(order_count, :zero) + :orderInc, customer_count = if_not_exists(customer_count, :zero) + :customerInc, last_order_date = :lastDate, updated_at = :updatedAt",
        ExpressionAttributeValues: {
          ":zero": 0,
          ":orderInc": stats.orderCount,
          ":customerInc": stats.customerIds.size,
          ":lastDate": now.split("T")[0],
          ":updatedAt": now
        }
      }));
    }

    // 일별 집계 테이블 업데이트 (order_count만 - active_store_count는 정확한 계산 필요)
    for (const [orderDate, stats] of Object.entries(dailyUpdates)) {
      // store_seqs를 StringSet으로 저장하여 유니크 매장 추적
      await docClient.send(new UpdateCommand({
        TableName: dailyStatsTable,
        Key: { order_date: orderDate },
        UpdateExpression: "SET order_count = if_not_exists(order_count, :zero) + :orderInc, updated_at = :updatedAt ADD store_seqs :seqs",
        ExpressionAttributeValues: {
          ":zero": 0,
          ":orderInc": stats.orderCount,
          ":seqs": new Set([...stats.storeSeqs]),
          ":updatedAt": now
        }
      }));
    }

    // 매장별 일별 주문 테이블 업데이트 (히트맵용)
    for (const [key, orderCount] of Object.entries(storeDailyUpdates)) {
      const [seq, orderDate] = key.split('#');
      await docClient.send(new UpdateCommand({
        TableName: storeDailyOrdersTable,
        Key: { seq, order_date: orderDate },
        UpdateExpression: "SET order_count = if_not_exists(order_count, :zero) + :orderInc, updated_at = :updatedAt",
        ExpressionAttributeValues: {
          ":zero": 0,
          ":orderInc": orderCount,
          ":updatedAt": now
        }
      }));
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `${savedCount}건 저장, ${updatedCount}건 업데이트, ${duplicateCount}건 중복`,
        saved: savedCount,
        updated: updatedCount,
        duplicates: duplicateCount,
        stats_updated: Object.keys(statsUpdates).length  // 집계 업데이트된 seq 수
      })
    };

  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, message: error.message })
    };
  }
};
