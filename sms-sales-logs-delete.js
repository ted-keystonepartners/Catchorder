import { DynamoDBDocumentClient, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({ region: 'ap-northeast-2' });
const dynamodb = DynamoDBDocumentClient.from(client);
const TABLE_NAME = 'sms-sales-logs-dev';

// CORS 헤더 정의
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Credentials': 'true'
};

export const handler = async (event) => {
  console.log('=== sms-sales-logs-delete 시작 ===');
  console.log('Method:', event.httpMethod);
  console.log('Path parameters:', event.pathParameters);
  
  // OPTIONS 요청 처리 (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'CORS preflight successful' })
    };
  }
  
  try {
    // 1. Authorization 헤더 확인
    const authHeader = event.headers?.Authorization || event.headers?.authorization || '';
    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      return {
        statusCode: 401,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: false, error: 'No token' })
      };
    }

    // 2. Path parameters에서 storeId와 logId 추출
    const { storeId, logId } = event.pathParameters || {};

    if (!storeId || !logId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: false, error: 'Missing storeId or logId' })
      };
    }

    console.log('삭제할 storeId:', storeId);
    console.log('삭제할 logId:', logId);

    // 3. DynamoDB에서 삭제
    const params = {
      TableName: TABLE_NAME,
      Key: {
        log_id: logId
      }
    };

    console.log('DynamoDB 삭제 시작');
    await dynamodb.send(new DeleteCommand(params));
    console.log('DynamoDB 삭제 완료');

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        message: 'Sales log deleted successfully'
      })
    };

  } catch (err) {
    console.error('Error:', err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: false, error: err.message })
    };
  }
};