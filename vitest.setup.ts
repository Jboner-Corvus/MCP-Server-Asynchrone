import { vi } from 'vitest';

// Global mock for process.on and process.exit
const mockProcessOnHandlers: Record<string, Function> = {};
vi.spyOn(process, 'on').mockImplementation((event, handler) => {
  mockProcessOnHandlers[event as string] = handler;
  return process; // Return process to allow chaining
});
vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error("process.exit"); });

// Export the handlers for testing purposes
export { mockProcessOnHandlers };
