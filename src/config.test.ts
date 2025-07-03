import { expect, test } from 'vitest';
import { config } from './config';

test('config is defined', () => {
  expect(config).toBeDefined();
});