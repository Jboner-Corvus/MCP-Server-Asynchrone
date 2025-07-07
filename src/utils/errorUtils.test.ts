import { expect, test } from 'vitest';
import { getErrDetails, AppErrorBase, EnqueueTaskError, WebhookError } from './errorUtils.js';

test('getErrDetails should handle AppErrorBase', () => {
  const error = new AppErrorBase('test message', 'TestError', { detail: 'some detail' });
  const details = getErrDetails(error);
  expect(details.message).toBe('test message');
  expect(details.name).toBe('AppErrorBase');
  expect(details.type).toBe('TestError');
  expect(details.details).toEqual({ detail: 'some detail' });
});

test('getErrDetails should handle EnqueueTaskError', () => {
  const error = new EnqueueTaskError('enqueue failed', { taskId: '123' });
  const details = getErrDetails(error);
  expect(details.message).toBe('enqueue failed');
  expect(details.name).toBe('EnqueueTaskError');
  expect(details.type).toBe('EnqueueTaskError');
  expect(details.details).toEqual({ taskId: '123' });
});

test('getErrDetails should handle WebhookError', () => {
  const error = new WebhookError('webhook failed', 'WebhookError', 500, 'Internal Server Error', {
    url: 'http://example.com',
  });
  const details = getErrDetails(error);
  expect(details.message).toBe('webhook failed');
  expect(details.name).toBe('WebhookError');
  expect(details.type).toBe('WebhookError');
  expect((details.details as { url: string }).url).toBe('http://example.com');
});

test('getErrDetails should handle generic Error', () => {
  const error = new Error('generic error');
  const details = getErrDetails(error);
  expect(details.message).toBe('generic error');
  expect(details.name).toBe('Error');
  expect(details.type).toBe('GenericError');
});

test('getErrDetails should handle unknown error', () => {
  const error = { some: 'object' };
  const details = getErrDetails(error);
  expect(details.message).toBe('{"some":"object"}');
  expect(details.name).toBe('UnknownError');
  expect(details.type).toBe('UnknownErrorType');
});
