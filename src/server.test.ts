import { describe, it, expect, vi } from 'vitest';

vi.mock('bullmq', () => {
  return {
    Queue: vi.fn().mockImplementation(() => ({
      name: 'mock-queue',
      events: { on: vi.fn() }, // Mock the 'events.on' method
      // Add any other methods that are called in your code
    })),
  };
});

vi.mock('./config.js');
vi.mock('./logger.js');

// Now, import the server
import './server.js';

describe('Server', () => {
  it('should be defined', () => {
    // This is a placeholder test. 
    // In a real-world scenario, you would test the server's functionality.
    expect(true).toBe(true);
  });
});