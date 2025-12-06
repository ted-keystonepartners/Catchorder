/**
 * AWS Lambda Handler for Express app
 */
import serverlessExpress from '@codegenie/serverless-express';
import app from './src/server.js';

// Lambda 환경에서 Express 앱 래핑
export const handler = serverlessExpress({ app });