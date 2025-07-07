import { vi } from 'vitest';

const logger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  fatal: vi.fn(),
  child: vi.fn(() => logger), // Return the mock itself
};

export default logger;
