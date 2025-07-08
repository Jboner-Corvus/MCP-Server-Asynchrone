import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Worker } from 'bullmq';
import * as errorUtils from './utils/errorUtils.js';
import logger from './logger.js';
import { config } from './config.js';
import type { MockInstance } from 'vitest';

// Mock dependencies
vi.mock('worker_threads', () => ({ isMainThread: false }));
vi.mock('bullmq');
vi.mock('./config.js', () => ({
  config: {
    TASK_QUEUE_NAME: 'async-tasks',
    REDIS_HOST: 'localhost',
    REDIS_PORT: 6379,
    REDIS_PASSWORD: '',
    NODE_ENV: 'test',
    LOG_LEVEL: 'info',
    AUTH_TOKEN: 'test-token',
    HTTP_STREAM_ENDPOINT: '/stream',
    HEALTH_CHECK_PATH: '/health',
    PORT: 3000,
  },
}));
vi.mock('./logger.js', () => {
  const mockLogFn: import('pino').LogFn = vi.fn(
    (_obj: unknown, _msg?: string, ..._args: unknown[]) => {}
  );
  const mockChildLogger = {
    info: mockLogFn,
    warn: mockLogFn,
    error: mockLogFn,
    fatal: mockLogFn,
    debug: mockLogFn,
    trace: mockLogFn,
    silent: mockLogFn,
    level: 'info',
  };
  return {
    default: {
      ...mockChildLogger,
      child: vi.fn(() => mockChildLogger),
    } as unknown as typeof import('pino').pino,
  };
});
vi.mock('./queue.js', () => ({
  initQueues: vi.fn(() => ({
    taskQueue: {
      events: { on: vi.fn() },
      defaultJobOptions: { attempts: 3 },
    },
    deadLetterQueue: { add: vi.fn() },
    redisConnection: {},
  })),
}));
vi.mock('./utils/asyncToolHelper.js', () => ({
  enqueueTask: vi.fn().mockResolvedValue('mock-job-id'),
}));

vi.mock('./tools/toolProcessors', () => ({
  toolProcessors: {
    asynchronousTaskSimulatorEnhanced: vi.fn(),
  },
}));

describe('Worker Initialization', () => {
  let workerModule: typeof import('./worker.js');
  let mockWorkerInstance: {
    on: MockInstance;
    close: MockInstance;
    opts: { concurrency: number };
  };
  let jobLogSpy: {
    info: MockInstance;
    warn: MockInstance;
    error: MockInstance;
    fatal: MockInstance;
    debug: MockInstance;
    trace: MockInstance;
    silent: MockInstance;
    level: string;
  };
  let sigtermHandler: (...args: unknown[]) => unknown;
  let sigintHandler: (...args: unknown[]) => unknown;

  beforeEach(async () => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Dynamically import modules to use mocks
    workerModule = await import('./worker.js');
    const webhookUtilsActual = await import('./utils/webhookUtils.js');

    vi.spyOn(webhookUtilsActual, 'sendWebhook');
    vi.spyOn(errorUtils, 'getErrDetails');

    mockWorkerInstance = {
      on: vi.fn(),
      close: vi.fn().mockResolvedValue(undefined),
      opts: { concurrency: 5 },
    } as unknown as {
      on: MockInstance;
      close: MockInstance;
      opts: { concurrency: number };
    };
    vi.mocked(Worker).mockImplementation(() => mockWorkerInstance as unknown as Worker);

    jobLogSpy = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      fatal: vi.fn(),
      debug: vi.fn(),
      trace: vi.fn(),
      silent: vi.fn(),
      level: 'info',
    } as unknown as {
      info: MockInstance;
      warn: MockInstance;
      error: MockInstance;
      fatal: MockInstance;
      debug: MockInstance;
      trace: MockInstance;
      silent: MockInstance;
      level: string;
    };
    vi.spyOn(logger, 'child').mockReturnValue(
      jobLogSpy as unknown as ReturnType<typeof logger.child>
    );

    vi.spyOn(process, 'on').mockImplementation((event, handler) => {
      if (event === 'SIGTERM') sigtermHandler = handler as (...args: unknown[]) => unknown;
      if (event === 'SIGINT') sigintHandler = handler as (...args: unknown[]) => unknown;
      return process;
    });

    await workerModule.initWorker(logger, config);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create a BullMQ Worker with correct parameters', () => {
    expect(Worker).toHaveBeenCalledWith('async-tasks', expect.any(Function), {
      connection: {},
      concurrency: 5,
    });
  });

  it('should log that the worker has started', () => {
    expect(jobLogSpy.info).toHaveBeenCalledWith(
      `Worker pour la file d'attente 'async-tasks' démarré avec une concurrence de 5. Prêt à traiter les tâches.`
    );
  });

  it('should register all event listeners on the worker', () => {
    expect(mockWorkerInstance.on).toHaveBeenCalledWith('completed', expect.any(Function));
    expect(mockWorkerInstance.on).toHaveBeenCalledWith('failed', expect.any(Function));
    expect(mockWorkerInstance.on).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('should register graceful shutdown listeners', () => {
    expect(sigtermHandler).toBeDefined();
    expect(sigintHandler).toBeDefined();
  });
});
