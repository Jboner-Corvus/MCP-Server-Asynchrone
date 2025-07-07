import { describe, it, expect, vi } from 'vitest';
import { taskQueue, deadLetterQueue, taskQueueEvents, deadLetterQueueEvents } from './queue.js';

vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation((name) => ({
    name,
    on: vi.fn(),
  })),
  QueueEvents: vi.fn().mockImplementation((name) => ({
    name,
    on: vi.fn(),
  })),
}));

describe('Queue Module', () => {
  it('should export taskQueue', () => {
    expect(taskQueue).toBeDefined();
  });

  it('should export deadLetterQueue', () => {
    expect(deadLetterQueue).toBeDefined();
  });

  it('should export taskQueueEvents', () => {
    expect(taskQueueEvents).toBeDefined();
  });

  it('should export deadLetterQueueEvents', () => {
    expect(deadLetterQueueEvents).toBeDefined();
  });
});
