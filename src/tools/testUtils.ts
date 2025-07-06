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
  },
});
