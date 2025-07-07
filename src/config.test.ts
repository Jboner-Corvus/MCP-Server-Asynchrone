import { expect, test } from 'vitest';
import { config } from './config.js';

test('config is defined', () => {
  expect(config).toBeDefined();
});
