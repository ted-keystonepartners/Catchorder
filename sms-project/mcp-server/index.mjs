#!/usr/bin/env node

/**
 * QR TF 리포트 자동화 MCP 서버
 *
 * 기능:
 * 1. DB에서 KPI 데이터 조회
 * 2. 기존 보고내용 조회
 * 3. 보고내용 저장
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const API_BASE = 'https://l0dtib1m19.execute-api.ap-northeast-2.amazonaws.com/dev';

// 서버 생성
const server = new Server(
  { name: 'qr-tf-report', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// 도구 목록
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'get_kpi_data',
      description: 'KPI 데이터 조회 (이용매장, 설치매장, 잔존율 등)',
      inputSchema: { type: 'object', properties: {} }
    },
    {
      name: 'get_cohort_data',
      description: '월별 코호트 잔존율 데이터 조회',
      inputSchema: { type: 'object', properties: {} }
    },
    {
      name: 'get_funnel_data',
      description: '월별 퍼널 분석 데이터 조회',
      inputSchema: { type: 'object', properties: {} }
    },
    {
      name: 'get_report_contents',
      description: '현재 저장된 보고내용 조회',
      inputSchema: {
        type: 'object',
        properties: {
          month: { type: 'string', description: '조회할 월 (YYYY-MM)' }
        }
      }
    },
    {
      name: 'save_report_content',
      description: '보고내용 저장',
      inputSchema: {
        type: 'object',
        properties: {
          section_id: {
            type: 'string',
            description: '섹션 ID (kpi_summary, cohort_forecast, funnel)'
          },
          month: { type: 'string', description: '월 (YYYY-MM)' },
          content: { type: 'string', description: '보고내용' }
        },
        required: ['section_id', 'month', 'content']
      }
    },
    {
      name: 'get_key_tasks',
      description: 'Key Task 및 Action Item 조회',
      inputSchema: { type: 'object', properties: {} }
    }
  ]
}));

// 도구 실행
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'get_kpi_data': {
        const res = await fetch(`${API_BASE}/api/dashboard`);
        const data = await res.json();
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(data.overall || data, null, 2)
          }]
        };
      }

      case 'get_cohort_data': {
        const res = await fetch(`${API_BASE}/api/dashboard?view=monthly_cohort_retention&start_date=2024-09-01`);
        const data = await res.json();
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(data.cohorts || data, null, 2)
          }]
        };
      }

      case 'get_funnel_data': {
        const res = await fetch(`${API_BASE}/api/dashboard?view=monthly_cohort_retention&start_date=2024-09-01`);
        const data = await res.json();
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(data.monthlyStats || data, null, 2)
          }]
        };
      }

      case 'get_report_contents': {
        const month = args?.month || new Date().toISOString().slice(0, 7);
        const res = await fetch(`${API_BASE}/api/report-contents?month=${month}`);
        const data = await res.json();
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(data, null, 2)
          }]
        };
      }

      case 'save_report_content': {
        const { section_id, month, content } = args;
        const res = await fetch(`${API_BASE}/api/report-contents`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            section_id,
            month,
            content,
            updated_by: 'mcp-agent'
          })
        });
        const data = await res.json();
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(data, null, 2)
          }]
        };
      }

      case 'get_key_tasks': {
        const res = await fetch(`${API_BASE}/api/key-tasks`);
        const data = await res.json();
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(data, null, 2)
          }]
        };
      }

      default:
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true
        };
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true
    };
  }
});

// 서버 시작
const transport = new StdioServerTransport();
await server.connect(transport);
