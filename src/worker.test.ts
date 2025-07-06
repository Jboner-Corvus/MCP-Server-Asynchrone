// Mock dependencies

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Worker } from 'bullmq';
import * as errorUtils from './utils/errorUtils';
import logger from './logger';
import { config } from './config';

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
  },
}));
vi.mock('./logger.js', () => ({
  default: {
    child: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })),
  },
}));
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
  let queueModule: typeof import('./queue.js');
  let mockWorkerInstance: {
    on: vi.Mock;
    close: vi.Mock;
    opts: { concurrency: number };
  };
  let jobLogSpy: {
    info: vi.Mock;
    warn: vi.Mock;
    error: vi.Mock;
  };
  let sigtermHandler: (...args: unknown[]) => unknown;
  let sigintHandler: (...args: unknown[]) => unknown;

  beforeEach(async () => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Dynamically import modules to use mocks
    workerModule = await import('./worker.js');
    const queueModuleActual = await import('./queue.js');
    const webhookUtilsActual = await import('./utils/webhookUtils.js');

    queueModule = queueModuleActual;
    vi.spyOn(webhookUtilsActual, 'sendWebhook');
    vi.spyOn(errorUtils, 'getErrDetails');

    mockWorkerInstance = {
      on: vi.fn(),
      close: vi.fn().mockResolvedValue(undefined),
      opts: { concurrency: 5 },
    };
    vi.mocked(Worker).mockImplementation(() => mockWorkerInstance);

    jobLogSpy = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    vi.spyOn(logger, 'child').mockReturnValue(jobLogSpy);

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

  it('should initialize queues with the correct config and logger', () => {
    expect(queueModule.initQueues).toHaveBeenCalledWith(config, logger);
  });

  it('should create a BullMQ Worker with correct parameters', () => {
    const { redisConnection } = queueModule.initQueues(config, logger);
    expect(Worker).toHaveBeenCalledWith(config.TASK_QUEUE_NAME, expect.any(Function), {
      connection: redisConnection,
      concurrency: 5,
    });
  });

  it('should log that the worker has started', () => {
    expect(jobLogSpy.info).toHaveBeenCalledWith(
      `Worker pour la file d'attente '${config.TASK_QUEUE_NAME}' démarré avec une concurrence de 5. Prêt à traiter les tâches.`
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
