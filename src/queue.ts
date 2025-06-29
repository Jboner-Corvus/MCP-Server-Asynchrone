// src/queue.ts (Corrigé)

import { Queue, ConnectionOptions } from 'bullmq';
import { config } from './config.js';
import logger from './logger.js';
import type { SessionData } from './types.js';

export const TASK_QUEUE_NAME = 'async-tasks';

export const redisConnection: ConnectionOptions = {
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
  password: config.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
};

// CORRECTION : Ajout des propriétés 'toolName' et 'cbUrl' pour correspondre
// à l'objet 'jobData' créé dans 'asyncToolHelper.ts'.
export interface AsyncTaskPayload<TParams = unknown> {
  params: TParams;
  auth: SessionData | undefined;
  taskId: string;
  toolName: string;
  cbUrl?: string;
}

export const taskQueue = new Queue<AsyncTaskPayload>(TASK_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  },
});

taskQueue.on('error', (err) => logger.error({ err }, "Erreur de la file d'attente BullMQ"));

logger.info(
  `File d'attente '${TASK_QUEUE_NAME}' initialisée pour ${config.REDIS_HOST}:${config.REDIS_PORT}`
);
