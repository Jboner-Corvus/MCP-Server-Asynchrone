import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Worker } from 'bullmq';
import { initWorker } from './worker';
import { config } from './config';
import logger from './logger';
import * as queueModule from './queue'; // Import the entire module
import * as webhookUtils from './utils/webhookUtils';
import * as errorUtils from './utils/errorUtils';
import * as longProcessTool from './tools/longProcess.tool'; // Import the actual module

// Mock dependencies
vi.mock('worker_threads', () => ({ isMainThread: false }));
vi.mock('bullmq');
vi.mock('./config.js');
vi.mock('./logger.js');
vi.mock('./queue.js', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    initQueues: vi.fn(), // Mock initQueues specifically
  };
});
vi.mock('./utils/webhookUtils.js');
vi.mock('./utils/errorUtils.js');
vi.mock('./tools/longProcess.tool.js'); // Mock the longProcess.tool module

// Mock initWorker to prevent its execution during tests
vi.mock('./worker.js', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    initWorker: vi.fn(),
  };
});

describe('initWorker', () => {
  let mockLoggerChild: any;
  let mockWorkerInstance: any;
  let mockSendWebhook: any;
  let mockGetErrDetails: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock implementations
    vi.mocked(queueModule.initQueues).mockReturnValue({
      taskQueue: { name: 'mock-task-queue', defaultJobOptions: { attempts: 3 } } as any,
      deadLetterQueue: { name: 'mock-dead-letter-queue' } as any,
      redisConnection: { host: 'mock-redis', port: 1234 } as any,
    });

    mockWorkerInstance = {
      on: vi.fn(),
      close: vi.fn(),
      run: vi.fn(),
      opts: { 
        concurrency: 5, 
      }, // Mock opts for workerLog.info
    };
    vi.mocked(Worker).mockReturnValue(mockWorkerInstance as any);

    // Mock logger.child to return an object with info, warn, error methods
    mockLoggerChild = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn(() => ({
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      })), // Add a child method to mockLoggerChild
    };
    vi.mocked(logger).child.mockReturnValue(mockLoggerChild);
    vi.mocked(logger).info.mockImplementation(mockLoggerChild.info);
    vi.mocked(logger).error.mockImplementation(mockLoggerChild.error);

    // Mock config.TASK_QUEUE_NAME
    vi.mocked(config).TASK_QUEUE_NAME = 'async-tasks';

    // Mock webhookUtils
    mockSendWebhook = vi.mocked(webhookUtils).sendWebhook;
    mockGetErrDetails = vi.mocked(errorUtils).getErrDetails;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize queues with the correct config and logger', async () => {
    // We are testing the actual initWorker function, so we need to unmock it for this test
    vi.doMock('./worker.js', async (importOriginal) => {
      const original = await importOriginal();
      return {
        ...original,
        initWorker: original.initWorker, // Use the actual initWorker
      };
    });
    const { initWorker: actualInitWorker } = await import('./worker.js');

    await actualInitWorker(logger, config);
    expect(queueModule.initQueues).toHaveBeenCalledWith(config, logger);
  });

  it('should create a BullMQ Worker with correct parameters', async () => {
    // We are testing the actual initWorker function, so we need to unmock it for this test
    vi.doMock('./worker.js', async (importOriginal) => {
      const original = await importOriginal();
      return {
        ...original,
        initWorker: original.initWorker, // Use the actual initWorker
      };
    });
    const { initWorker: actualInitWorker } = await import('./worker.js');

    const { redisConnection } = queueModule.initQueues(config, logger);
    await actualInitWorker(logger, config);
    expect(Worker).toHaveBeenCalledWith(
      config.TASK_QUEUE_NAME,
      expect.any(Function),
      {
        connection: redisConnection,
        concurrency: 5,
      }
    );
  });

  it('should log that the worker has started', async () => {
    // We are testing the actual initWorker function, so we need to unmock it for this test
    vi.doMock('./worker.js', async (importOriginal) => {
      const original = await importOriginal();
      return {
        ...original,
        initWorker: original.initWorker, // Use the actual initWorker
      };
    });
    const { initWorker: actualInitWorker } = await import('./worker.js');

    await actualInitWorker(logger, config);
    const mockWorkerLog = vi.mocked(logger).child.mock.results[0].value; // Get the mockWorkerLog instance
    expect(mockWorkerLog.info).toHaveBeenCalledWith(
      expect.stringContaining("Worker pour la file d'attente 'async-tasks' démarré")
    );
  });

  it('should register all event listeners on the worker', async () => {
    // We are testing the actual initWorker function, so we need to unmock it for this test
    vi.doMock('./worker.js', async (importOriginal) => {
      const original = await importOriginal();
      return {
        ...original,
        initWorker: original.initWorker, // Use the actual initWorker
      };
    });
    const { initWorker: actualInitWorker } = await import('./worker.js');

    const { on } = vi.mocked(Worker).getMockImplementation()!();
    await actualInitWorker(logger, config);
    expect(on).toHaveBeenCalledWith('completed', expect.any(Function));
    expect(on).toHaveBeenCalledWith('failed', expect.any(Function));
    expect(on).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('should register graceful shutdown listeners', async () => {
    // We are testing the actual initWorker function, so we need to unmock it for this test
    vi.doMock('./worker.js', async (importOriginal) => {
      const original = await importOriginal();
      return {
        ...original,
        initWorker: original.initWorker, // Use the actual initWorker
      };
    });
    const { initWorker: actualInitWorker } = await import('./worker.js');

    const processOnSpy = vi.spyOn(process, 'on').mockReturnValue({} as any);
    await actualInitWorker(logger, config);
    expect(processOnSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
    expect(processOnSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
  });

  // New tests for job processing logic
  describe('job processing', () => {
    let actualInitWorker: typeof initWorker;
    let workerProcessor: Function;

    beforeEach(async () => {
      // Unmock initWorker for these tests
      vi.doMock('./worker.js', async (importOriginal) => {
        const original = await importOriginal();
        return {
          ...original,
          initWorker: original.initWorker,
        };
      });
      ({ initWorker: actualInitWorker } = await import('./worker.js'));

      await actualInitWorker(logger, config);
      // Extract the job processing function passed to the Worker constructor
      workerProcessor = vi.mocked(Worker).mock.calls[0][1];
    });

    it('should successfully process a job and send webhooks', async () => {
      const mockJob = {
        id: 'job-123',
        data: {
          toolName: 'asynchronousTaskSimulatorEnhanced',
          params: { some: 'data' },
          auth: { userId: 'user-1' },
          taskId: 'task-456',
          cbUrl: 'http://callback.url',
        },
        attemptsMade: 1,
      };

      // Mock the internal processor for 'asynchronousTaskSimulatorEnhanced'
      const mockProcessorResult = { processed: true };
      vi.mocked(longProcessTool.doWorkSpecific).mockResolvedValue(mockProcessorResult);

      await workerProcessor(mockJob);

      expect(mockLoggerChild.child).toHaveBeenCalledWith(expect.objectContaining({ jobId: 'job-123', taskId: 'task-456' }));
      expect(mockLoggerChild.child().info).toHaveBeenCalledWith(
        expect.objectContaining({ paramsPreview: JSON.stringify(mockJob.data.params)?.substring(0, 100) }),
        'Traitement du job'
      );
      expect(mockSendWebhook).toHaveBeenCalledTimes(2);
      expect(mockSendWebhook).toHaveBeenCalledWith(
        'http://callback.url',
        expect.objectContaining({ status: 'processing' }),
        'task-456',
        'asynchronousTaskSimulatorEnhanced',
        false
      );
      expect(mockSendWebhook).toHaveBeenCalledWith(
        'http://callback.url',
        expect.objectContaining({ status: 'completed', result: mockProcessorResult }),
        'task-456',
        'asynchronousTaskSimulatorEnhanced',
        false
      );
      expect(mockLoggerChild.child().info).toHaveBeenCalledWith('Logique du job terminée avec succès.');
    });

    it('should handle job processing for an unknown tool', async () => {
      const mockJob = {
        id: 'job-456',
        data: {
          toolName: 'unknownTool',
          params: { some: 'data' },
          auth: { userId: 'user-1' },
          taskId: 'task-789',
        },
        attemptsMade: 1,
      };

      await expect(workerProcessor(mockJob)).rejects.toThrow(
        'Aucun processeur trouvé pour l\'outil : unknownTool'
      );

      expect(mockLoggerChild.child).toHaveBeenCalledWith(expect.objectContaining({ jobId: 'job-456', taskId: 'task-789' }));
      expect(mockLoggerChild.child().error).toHaveBeenCalledWith(
        expect.stringContaining('Aucun processeur pour l\'outil : unknownTool')
      );
      expect(mockSendWebhook).not.toHaveBeenCalled();
    });

    it('should handle job processing errors and send error webhook', async () => {
      const mockJob = {
        id: 'job-789',
        data: {
          toolName: 'asynchronousTaskSimulatorEnhanced',
          params: { some: 'data' },
          auth: { userId: 'user-1' },
          taskId: 'task-abc',
          cbUrl: 'http://callback.url',
        },
        attemptsMade: 1,
      };

      const mockError = new Error('Processing failed');
      vi.mocked(longProcessTool.doWorkSpecific).mockRejectedValue(mockError);
      vi.mocked(errorUtils.getErrDetails).mockReturnValue({ message: 'Processing failed', stack: 'mock stack' });

      await expect(workerProcessor(mockJob)).rejects.toThrow('Processing failed');

      expect(mockLoggerChild.child().error).toHaveBeenCalledWith(
        expect.objectContaining({ err: { message: 'Processing failed', stack: 'mock stack' } }),
        'Erreur de traitement du job.'
      );
      expect(mockSendWebhook).toHaveBeenCalledTimes(2); // Initial and final webhook
      expect(mockSendWebhook).toHaveBeenCalledWith(
        'http://callback.url',
        expect.objectContaining({ status: 'error', error: { message: 'Processing failed', stack: 'mock stack' } }),
        'task-abc',
        'asynchronousTaskSimulatorEnhanced',
        false
      );
    });

    it('should handle completed worker event', async () => {
      const mockJob = {
        id: 'job-completed',
        data: { taskId: 'task-completed' },
      };
      const mockResult = { status: 'success' };

      // Simulate the 'completed' event
      mockWorkerInstance.on.mock.calls.find(call => call[0] === 'completed')[1](mockJob, mockResult);

      expect(mockLoggerChild.info).toHaveBeenCalledWith(
        expect.objectContaining({ jobId: 'job-completed', taskId: 'task-completed', resPreview: JSON.stringify(mockResult)?.substring(0, 50) }),
        'Job terminé.'
      );
    });

    it('should handle failed worker event and move to DLQ if max attempts reached', async () => {
      const mockJob = {
        id: 'job-failed-dlq',
        name: 'job-name',
        data: { taskId: 'task-failed-dlq' },
        attemptsMade: 3,
        opts: { attempts: 3 },
      };
      const mockError = new Error('Job failed permanently');
      vi.mocked(errorUtils.getErrDetails).mockReturnValue({ message: 'Job failed permanently', stack: 'mock stack' });
      vi.mocked(queueModule.initQueues).mockReturnValue({
        taskQueue: { name: 'mock-task-queue', defaultJobOptions: { attempts: 3 } } as any,
        deadLetterQueue: { name: 'mock-dead-letter-queue', add: vi.fn() } as any,
        redisConnection: { host: 'mock-redis', port: 1234 } as any,
      });

      // Re-initialize worker to get the updated queue mocks
      await actualInitWorker(logger, config);

      // Simulate the 'failed' event
      await mockWorkerInstance.on.mock.calls.find(call => call[0] === 'failed')[1](mockJob, mockError);

      expect(mockLoggerChild.error).toHaveBeenCalledWith(
        expect.objectContaining({ jobId: 'job-failed-dlq', taskId: 'task-failed-dlq', err: { message: 'Job failed permanently', stack: 'mock stack' }, attemptsMade: 3, maxAttempts: 3 }),
        expect.stringContaining('ÉCHEC FINAL DU JOB (après 3 tentatives): Job failed permanently. Déplacement vers la DLQ.')
      );
      expect(queueModule.initQueues().deadLetterQueue.add).toHaveBeenCalledWith(
        'job-name',
        expect.objectContaining({ originalJobId: 'job-failed-dlq', failureReason: { message: 'Job failed permanently', stack: 'mock stack' } }),
        expect.objectContaining({ removeOnComplete: true, removeOnFail: false })
      );
      expect(mockLoggerChild.info).toHaveBeenCalledWith(
        expect.objectContaining({ jobId: 'job-failed-dlq', dlq: 'mock-dlq-name' }),
        'Job déplacé vers la DLQ.'
      );
    });

    it('should handle failed worker event and not move to DLQ if max attempts not reached', async () => {
      const mockJob = {
        id: 'job-failed-retry',
        name: 'job-name',
        data: { taskId: 'task-failed-retry' },
        attemptsMade: 1,
        opts: { attempts: 3 },
      };
      const mockError = new Error('Job failed temporarily');
      vi.mocked(errorUtils.getErrDetails).mockReturnValue({ message: 'Job failed temporarily', stack: 'mock stack' });

      // Simulate the 'failed' event
      await mockWorkerInstance.on.mock.calls.find(call => call[0] === 'failed')[1](mockJob, mockError);

      expect(mockLoggerChild.warn).toHaveBeenCalledWith(
        expect.objectContaining({ jobId: 'job-failed-retry', taskId: 'task-failed-retry', err: { message: 'Job failed temporarily', stack: 'mock stack' }, attemptsMade: 1, maxAttempts: 3 }),
        expect.stringContaining('Job échoué (tentative 1/3): Job failed temporarily. Nouvelle tentative prévue si applicable.')
      );
      expect(queueModule.initQueues().deadLetterQueue.add).not.toHaveBeenCalled();
    });

    it('should handle worker error event', async () => {
      const mockError = new Error('Worker internal error');
      vi.mocked(errorUtils.getErrDetails).mockReturnValue({ message: 'Worker internal error', stack: 'mock stack' });

      // Simulate the 'error' event
      mockWorkerInstance.on.mock.calls.find(call => call[0] === 'error')[1](mockError);

      expect(mockLoggerChild.error).toHaveBeenCalledWith(
        expect.objectContaining({ err: { message: 'Worker internal error', stack: 'mock stack' } }),
        'Erreur du Worker : Worker internal error'
      );
    });

    it('should handle graceful shutdown (SIGTERM)', async () => {
      const processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error("process.exit"); });
      const mockClose = vi.fn().mockResolvedValue(undefined);
      mockWorkerInstance.close = mockClose;

      // Simulate SIGTERM
      const sigtermHandler = vi.spyOn(process, 'on').mock.calls.find(call => call[0] === 'SIGTERM')[1];
      await expect(sigtermHandler()).rejects.toThrow("process.exit");

      expect(mockLoggerChild.warn).toHaveBeenCalledWith('Signal SIGTERM reçu. Fermeture du worker...');
      expect(mockClose).toHaveBeenCalled();
      expect(mockLoggerChild.info).toHaveBeenCalledWith('Worker fermé avec succès.');
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('should handle graceful shutdown (SIGINT)', async () => {
      const processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error("process.exit"); });
      const mockClose = vi.fn().mockResolvedValue(undefined);
      mockWorkerInstance.close = mockClose;

      // Simulate SIGINT
      const sigintHandler = vi.spyOn(process, 'on').mock.calls.find(call => call[0] === 'SIGINT')[1];
      await expect(sigintHandler()).rejects.toThrow("process.exit");

      expect(mockLoggerChild.warn).toHaveBeenCalledWith('Signal SIGINT reçu. Fermeture du worker...');
      expect(mockClose).toHaveBeenCalled();
      expect(mockLoggerChild.info).toHaveBeenCalledWith('Worker fermé avec succès.');
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('should handle graceful shutdown errors', async () => {
      const processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error("process.exit"); });
      const mockError = new Error('Close failed');
      const mockClose = vi.fn().mockRejectedValue(mockError);
      mockWorkerInstance.close = mockClose;
      vi.mocked(errorUtils.getErrDetails).mockReturnValue({ message: 'Close failed', stack: 'mock stack' });

      // Simulate SIGTERM with error
      const sigtermHandler = vi.spyOn(process, 'on').mock.calls.find(call => call[0] === 'SIGTERM')[1];
      await expect(sigtermHandler()).rejects.toThrow("process.exit");

      expect(mockLoggerChild.warn).toHaveBeenCalledWith('Signal SIGTERM reçu. Fermeture du worker...');
      expect(mockClose).toHaveBeenCalled();
      expect(mockLoggerChild.error).toHaveBeenCalledWith(
        expect.objectContaining({ err: { message: 'Close failed', stack: 'mock stack' } }),
        'Erreur lors de la fermeture du worker.'
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });
});