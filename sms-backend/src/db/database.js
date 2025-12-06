/**
 * 데이터베이스 추상화 레이어
 * 실제 DB와 Mock DB 선택 가능
 */
import dotenv from 'dotenv';
import { mockDatabase } from './mockDatabase.js';

dotenv.config();

const USE_MOCK_DB = process.env.USE_MOCK_DB === 'true';

let database;

if (USE_MOCK_DB) {
  console.log('🔧 Using Mock Database for development');
  database = mockDatabase;
} else {
  console.log('🗄️ Using PostgreSQL Database');
  // 실제 DB 연동은 나중에 구현
  // import { realDatabase } from './realDatabase.js';
  // database = realDatabase;
  throw new Error('PostgreSQL database not implemented yet. Use USE_MOCK_DB=true');
}

export const db = database;