import { expect, test } from 'vitest';
import * as constants from './constants.js';

test('constants are defined', () => {
  expect(constants.ANSI_COLORS).toBeDefined();
  expect(constants.WEBHOOK_SIGNATURE_HEADER).toBeDefined();
  expect(constants.WEBHOOK_SECRET_ENV_VAR).toBeDefined();
  expect(constants.ERROR_STACK_TRACE_MAX_LENGTH).toBeDefined();
  expect(constants.DEFAULT_BULLMQ_JOB_OPTIONS).toBeDefined();
  expect(constants.TASK_QUEUE_NAME).toBeDefined();
  expect(constants.DEAD_LETTER_QUEUE_NAME).toBeDefined();
  expect(constants.DEFAULT_PING_OPTIONS).toBeDefined();
  expect(constants.DEFAULT_HEALTH_CHECK_OPTIONS).toBeDefined();
});
