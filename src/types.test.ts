import { expect, test } from 'vitest';
import { isAppRuntimeSession } from './types';
import { IncomingMessage } from 'http';

test('isAppRuntimeSession returns true for valid session object', () => {
  const validSession = {
    frameworkSessionId: 'test-id',
    request: new IncomingMessage(null),
    sendEvent: () => {},
    closeConnection: () => {},
    auth: {
      id: 'auth-id',
      type: 'Bearer',
      authenticatedAt: Date.now(),
      clientIp: '127.0.0.1',
    },
  };
  expect(isAppRuntimeSession(validSession)).toBe(true);
});

test('isAppRuntimeSession returns false for invalid session object', () => {
  const invalidSession = {
    frameworkSessionId: 'test-id',
    request: new IncomingMessage(null),
    sendEvent: () => {},
    // closeConnection is missing
  };
  expect(isAppRuntimeSession(invalidSession)).toBe(false);
});
