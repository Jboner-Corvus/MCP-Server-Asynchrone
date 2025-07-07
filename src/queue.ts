// src/queue.ts
import { Queue, ConnectionOptions, Job, QueueEvents } from 'bullmq';
import {
  TASK_QUEUE_NAME,
  DEAD_LETTER_QUEUE_NAME,
  DEFAULT_BULLMQ_JOB_OPTIONS,
} from './utils/constants.js';
import type { AuthData } from './types.js';
import { config } from './config.js';
import logger from './logger.js';

const redisConnection: ConnectionOptions = {
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
  password: config.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

export const taskQueue = new Queue<AsyncTaskJobPayload, unknown, string>(TASK_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: DEFAULT_BULLMQ_JOB_OPTIONS,
});

export const deadLetterQueue = new Queue<AsyncTaskJobPayload, unknown, string>(
  DEAD_LETTER_QUEUE_NAME,
  {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: { count: 1000, age: 30 * 24 * 3600 },
      removeOnFail: false,
    },
  }
);

export const taskQueueEvents = new QueueEvents(TASK_QUEUE_NAME, {
  connection: redisConnection,
});
export const deadLetterQueueEvents = new QueueEvents(DEAD_LETTER_QUEUE_NAME, {
  connection: redisConnection,
});

taskQueueEvents.on('error', (err: Error) =>
  logger.error({ err, queue: TASK_QUEUE_NAME }, "Erreur de la file d'attente principale")
);
deadLetterQueueEvents.on('error', (err: Error) =>
  logger.error({ err, queue: DEAD_LETTER_QUEUE_NAME }, 'Erreur de la Dead Letter Queue')
);

logger.info(
  `File d'attente '${TASK_QUEUE_NAME}' initialisée pour ${config.REDIS_HOST}:${config.REDIS_PORT}`
);
logger.info(`Dead Letter Queue '${DEAD_LETTER_QUEUE_NAME}' initialisée.`);

export function initQueues() {
  logger.info("Les files d'attente sont déjà initialisées lors du chargement du module.");
  return {
    taskQueue,
    deadLetterQueue,
    redisConnection,
    taskQueueEvents,
    deadLetterQueueEvents,
  };
}

export interface AsyncTaskJobPayload<TParams = unknown> {
  params: TParams;
  auth: AuthData | undefined;
  taskId: string;
  toolName: string;
  cbUrl?: string;
  originalJobId?: string;
  failureReason?: unknown;
}

export type AppJob<P = unknown, R = unknown> = Job<AsyncTaskJobPayload<P>, R, string>;
