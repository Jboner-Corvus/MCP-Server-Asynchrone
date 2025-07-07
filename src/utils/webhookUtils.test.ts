import { expect, test, vi } from 'vitest';
import crypto from 'crypto';
import { sendWebhook, verifyWebhookSignature } from './webhookUtils.js';
import { config } from '../config.js';

vi.mock('../config.js');

// Mock fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    text: () => Promise.resolve('ok'),
  } as Response)
);

test('sendWebhook should send a webhook', async () => {
  const payload = {
    taskId: '123',
    status: 'completed' as 'completed' | 'error' | 'processing',
    msg: 'done',
    inParams: {},
    ts: new Date().toISOString(),
  };
  await sendWebhook('http://example.com', payload, '123', 'test-tool');
  expect(fetch).toHaveBeenCalled();
});

test('verifyWebhookSignature should verify a real signature', () => {
  const payload = { data: 'test' };
  const secret = config.WEBHOOK_SECRET;

  // Generate a real signature
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  const signature = hmac.digest('hex');

  // Now, verify the signature
  expect(verifyWebhookSignature(JSON.stringify(payload), signature, secret)).toBe(true);
});

test('verifyWebhookSignature should fail with an invalid signature', () => {
  const payload = JSON.stringify({ data: 'test' });
  // Use a hex string of the correct length (64 chars for SHA256) but incorrect value.
  const signature = '0'.repeat(64);
  const secret = config.WEBHOOK_SECRET;
  expect(verifyWebhookSignature(payload, signature, secret)).toBe(false);
});
