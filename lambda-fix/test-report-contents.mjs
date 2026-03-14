import { handler } from './index.mjs';

// Test 1: PUT - Save report content
async function testPutReportContent() {
  console.log('\n=== Test 1: PUT - Save report content ===');
  const event = {
    path: '/api/report-contents',
    httpMethod: 'PUT',
    body: JSON.stringify({
      section_id: 'kpi_summary',
      month: '2026-03',
      content: '3월 KPI 요약: 매출 증가 추세',
      updated_by: 'test@example.com'
    }),
    headers: {},
    queryStringParameters: null
  };

  try {
    const response = await handler(event);
    console.log('Status:', response.statusCode);
    console.log('Body:', JSON.parse(response.body));
  } catch (error) {
    console.error('Error:', error);
  }
}

// Test 2: GET - Retrieve specific section
async function testGetSpecificSection() {
  console.log('\n=== Test 2: GET - Retrieve specific section ===');
  const event = {
    path: '/api/report-contents',
    httpMethod: 'GET',
    queryStringParameters: {
      section_id: 'kpi_summary',
      month: '2026-03'
    },
    headers: {}
  };

  try {
    const response = await handler(event);
    console.log('Status:', response.statusCode);
    console.log('Body:', JSON.parse(response.body));
  } catch (error) {
    console.error('Error:', error);
  }
}

// Test 3: PUT - Update with history
async function testUpdateWithHistory() {
  console.log('\n=== Test 3: PUT - Update with history ===');
  const event = {
    path: '/api/report-contents',
    httpMethod: 'PUT',
    body: JSON.stringify({
      section_id: 'kpi_summary',
      month: '2026-03',
      content: '3월 KPI 요약: 매출 증가 추세 (수정본)',
      updated_by: 'editor@example.com'
    }),
    headers: {},
    queryStringParameters: null
  };

  try {
    const response = await handler(event);
    console.log('Status:', response.statusCode);
    const body = JSON.parse(response.body);
    console.log('Updated content:', body.data?.content);
    console.log('History count:', body.data?.history?.length || 0);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run all tests
async function runTests() {
  await testPutReportContent();
  await new Promise(resolve => setTimeout(resolve, 1000));

  await testGetSpecificSection();
  await new Promise(resolve => setTimeout(resolve, 1000));

  await testUpdateWithHistory();
  await new Promise(resolve => setTimeout(resolve, 1000));

  await testGetSpecificSection(); // Check history
}

runTests();
