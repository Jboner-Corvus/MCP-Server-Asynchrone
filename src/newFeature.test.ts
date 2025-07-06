import { expect, test } from 'vitest';
import { newFeature } from './newFeature';

test('newFeature should return a string', () => {
  expect(typeof newFeature()).toBe('string');
});
