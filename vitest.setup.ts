import { vi } from 'vitest';

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.AUTH_TOKEN = 'test-auth-token-that-is-long-enough';
process.env.WEBHOOK_SECRET = 'test-webhook-secret-that-is-long-enough-to-pass-validation';

// Global mock for process.on and process.exit
const mockProcessOnHandlers: Record<string, Function> = {};
vi.spyOn(process, 'on').mockImplementation((event, handler) => {
  mockProcessOnHandlers[event as string] = handler;
  return process; // Return process to allow chaining
});
vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error("process.exit"); });

// Export the handlers for testing purposes
export { mockProcessOnHandlers };
