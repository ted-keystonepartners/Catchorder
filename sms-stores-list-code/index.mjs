import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-northeast-2" });
const dynamodb = DynamoDBDocumentClient.from(client);

const storesTable = "sms-stores-dev";
const historyTable = "sms-store-history-dev";

// JWT 디코딩 함수
const decodeJWT = (token) => {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(Buffer.from(payload, 'base64').toString());
  } catch (e) {
    return null;
  }
};

export const handler = async (event) => {
  try {
    // 토큰에서 사용자 정보 추출
    const token = event.headers.Authorization?.replace('Bearer ', '') || 
                  event.headers.authorization?.replace('Bearer ', '');
    const decoded = decodeJWT(token);
    
    const userRole = decoded?.role;
    const userId = decoded?.userId;

    const queryParams = event.queryStringParameters || {};
    let ownerId = queryParams.ownerId;
    const statuses = queryParams.statuses ? (Array.isArray(queryParams.statuses) ? queryParams.statuses : [queryParams.statuses]) : [];
    const lifecycles = queryParams.lifecycles ? (Array.isArray(queryParams.lifecycles) ? queryParams.lifecycles : [queryParams.lifecycles]) : [];
    const searchText = queryParams.searchText || "";
    const all = queryParams.all === 'true'; // 검색용: 전체 매장 조회

    // ⭐ GENERAL 유저는 강제로 본인 매장만 조회 (단, all=true면 전체 조회 허용)
    if (!all && userRole === 'GENERAL' && userId) {
      ownerId = userId;
    }

    let result;

    if (ownerId) {
      result = await dynamodb.send(
        new QueryCommand({
          TableName: storesTable,
          IndexName: "owner_id-created_at-index",
          KeyConditionExpression: "owner_id = :ownerId",
          ExpressionAttributeValues: { ":ownerId": ownerId },
        })
      );
    } else {
      result = await dynamodb.send(new ScanCommand({ TableName: storesTable }));
    }

    let stores = result.Items || [];

    stores = stores.filter((store) => {
      if (statuses.length > 0 && !statuses.includes(store.status)) return false;
      if (lifecycles.length > 0 && !lifecycles.includes(store.lifecycle)) return false;
      if (searchText) {
        const text = searchText.toLowerCase();
        const matchesName = store.store_name?.toLowerCase().includes(text);
        const matchesAddress = store.store_address?.toLowerCase().includes(text);
        if (!matchesName && !matchesAddress) return false;
      }
      return true;
    });

    stores.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // 각 매장의 최초 설치완료일(QR_MENU_INSTALL) 조회
    const storeIds = stores.map(s => s.store_id);

    // 병렬로 히스토리 조회 (최초 QR_MENU_INSTALL 날짜)
    const historyPromises = storeIds.map(async (storeId) => {
      try {
        const historyResult = await dynamodb.send(
          new QueryCommand({
            TableName: historyTable,
            KeyConditionExpression: "store_id = :storeId",
            FilterExpression: "new_status = :status",
            ExpressionAttributeValues: {
              ":storeId": storeId,
              ":status": "QR_MENU_INSTALL"
            },
            ScanIndexForward: true, // 오름차순 (가장 오래된 것부터)
            Limit: 1
          })
        );
        const firstInstall = historyResult.Items?.[0];
        return { storeId, firstInstallCompletedAt: firstInstall?.changed_at || null };
      } catch (e) {
        return { storeId, firstInstallCompletedAt: null };
      }
    });

    const historyResults = await Promise.all(historyPromises);
    const historyMap = {};
    for (const h of historyResults) {
      historyMap[h.storeId] = h.firstInstallCompletedAt;
    }

    // 매장 데이터에 first_install_completed_at 추가
    const storesWithInstallDate = stores.map(store => ({
      ...store,
      first_install_completed_at: historyMap[store.store_id] || null
    }));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        success: true,
        data: { stores: storesWithInstallDate, total: storesWithInstallDate.length },
      }),
    };
  } catch (error) {
    console.error("ERROR:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        success: false,
        error: { code: "INTERNAL_ERROR", message: error.message },
      }),
    };
  }
};