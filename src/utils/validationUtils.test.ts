import { expect, test } from 'vitest';
import { isValidHttpUrl } from './validationUtils.js';

test('isValidHttpUrl should return true for valid http URL', () => {
  expect(isValidHttpUrl('http://example.com')).toBe(true);
});

test('isValidHttpUrl should return true for valid https URL', () => {
  expect(isValidHttpUrl('https://example.com')).toBe(true);
});

test('isValidHttpUrl should return false for invalid URL', () => {
  expect(isValidHttpUrl('invalid-url')).toBe(false);
});

test('isValidHttpUrl should return false for non-http/https protocol', () => {
  expect(isValidHttpUrl('ftp://example.com')).toBe(false);
});
