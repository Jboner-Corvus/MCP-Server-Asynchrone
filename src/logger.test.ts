import { expect, test, vi } from 'vitest';
import logger from './logger.js';

vi.mock('./config.js');

test('logger is defined', () => {
  expect(logger).toBeDefined();
});
