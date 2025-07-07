import { TASK_QUEUE_NAME, DEAD_LETTER_QUEUE_NAME } from '../utils/constants.js';

export const config = {
  NODE_ENV: 'test',
  LOG_LEVEL: 'silent',
  PORT: 8082,
  HTTP_STREAM_ENDPOINT: '/test-stream',
  AUTH_TOKEN: 'test-auth-token',
  REDIS_HOST: 'localhost',
  REDIS_PORT: 6379,
  REDIS_PASSWORD: undefined,
  HEALTH_CHECK_PATH: '/healthz',
  WEBHOOK_SECRET_ENV_VAR: 'test-webhook-secret',
  WEBHOOK_SECRET: 'test-secret',
  TASK_QUEUE_NAME: TASK_QUEUE_NAME,
  DEAD_LETTER_QUEUE_NAME: DEAD_LETTER_QUEUE_NAME,
};
