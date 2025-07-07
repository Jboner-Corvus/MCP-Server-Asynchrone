import { vi } from 'vitest';

export const createMockContext = () => ({
  session: {
    id: 'test-session-id',
    type: 'Bearer',
    authenticatedAt: Date.now(),
    clientIp: '127.0.0.1',
  },
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
    trace: vi.fn(),
    silent: vi.fn(),
    level: 'info',
  },
  reportProgress: vi.fn(),
  streamContent: vi.fn(),
});
