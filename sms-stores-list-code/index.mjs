import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-northeast-2" });
const dynamodb = DynamoDBDocumentClient.from(client);

const storesTable = "sms-stores-dev";

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

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        success: true,
        data: { stores, total: stores.length },
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