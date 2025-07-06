import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Queue } from 'bullmq';
import { initQueues } from './queue';
import { config } from './config';
import logger from './logger';
import * as constants from './utils/constants';

// Mock dependencies
vi.mock('bullmq', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    Queue: vi.fn(),
    QueueEvents: vi.fn(() => ({
      on: vi.fn(),
    })),
  };
});
vi.mock('./config.js');
vi.mock('./logger.js');
vi.mock('./utils/constants.js', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    TASK_QUEUE_NAME: 'mock-task-queue-name',
    DEAD_LETTER_QUEUE_NAME: 'mock-dlq-name',
    DEFAULT_BULLMQ_JOB_OPTIONS: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    },
  };
});

describe('initQueues', () => {
  let mockLoggerChild: {
    info: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock logger.child to return an object with info, warn, error methods
    mockLoggerChild = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    vi.mocked(logger).child.mockReturnValue(mockLoggerChild);
    vi.mocked(logger).info.mockImplementation(mockLoggerChild.info);
    vi.mocked(logger).error.mockImplementation(mockLoggerChild.error);

    // Mock config values
    vi.mocked(config).REDIS_HOST = 'mock-redis-host';
    vi.mocked(config).REDIS_PORT = 6379;
    vi.mocked(config).REDIS_PASSWORD = 'mock-redis-password';

    // Mock BullMQ Queue constructor
    vi.mocked(Queue).mockImplementation((name, opts) => {
      return {
        name,
        opts,
        events: { on: vi.fn() },
      };
    });
  });

  it('should initialize task and dead letter queues with correct parameters', () => {
    const { redisConnection } = initQueues(config, logger);

    expect(Queue).toHaveBeenCalledTimes(2);
    expect(Queue).toHaveBeenCalledWith(
      constants.TASK_QUEUE_NAME,
      expect.objectContaining({
        connection: expect.objectContaining({
          host: 'mock-redis-host',
          port: 6379,
          password: 'mock-redis-password',
        }),
        defaultJobOptions: constants.DEFAULT_BULLMQ_JOB_OPTIONS,
      })
    );
    expect(Queue).toHaveBeenCalledWith(
      constants.DEAD_LETTER_QUEUE_NAME,
      expect.objectContaining({
        connection: expect.objectContaining({
          host: 'mock-redis-host',
          port: 6379,
          password: 'mock-redis-password',
        }),
        defaultJobOptions: expect.objectContaining({
          attempts: 1,
          removeOnComplete: { count: 1000, age: 30 * 24 * 3600 },
          removeOnFail: false,
        }),
      })
    );

    expect(redisConnection).toEqual({
      host: 'mock-redis-host',
      port: 6379,
      password: 'mock-redis-password',
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  });

  it('should register error event listeners for both queues', () => {
    const { taskQueueEvents, deadLetterQueueEvents } = initQueues(config, logger);

    expect(taskQueueEvents.on).toHaveBeenCalledWith('error', expect.any(Function));
    expect(deadLetterQueueEvents.on).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('should log initialization messages', () => {
    initQueues(config, logger);

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining(
        "File d'attente 'mock-task-queue-name' initialisée pour mock-redis-host:6379"
      )
    );
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining("Dead Letter Queue 'mock-dlq-name' initialisée.")
    );
  });
});
