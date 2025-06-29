// src/queue.ts (Corrigé)

import { Queue, ConnectionOptions, Job } from 'bullmq';
import { config } from './config.js';
import logger from './logger.js';
import type { SessionData } from './types.js'; // Le type SessionData est bien utilisé ici

export const TASK_QUEUE_NAME = 'async-tasks';
export const DEAD_LETTER_QUEUE_NAME = 'dead-letter-tasks'; // Ajout pour le worker

export const redisConnection: ConnectionOptions = {
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
  password: config.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
};

// CORRECTION : Renommé en AsyncTaskJobPayload pour la cohérence et exporté
export interface AsyncTaskJobPayload<TParams = unknown> {
  params: TParams;
  auth: SessionData | undefined; // Utilise SessionData
  taskId: string;
  toolName: string;
  cbUrl?: string;
}

// CORRECTION : Exportation du type de Job personnalisé pour le worker
export type AppJob<T = unknown, R = unknown> = Job<AsyncTaskJobPayload<T>, R, string>;

export const taskQueue = new Queue<AsyncTaskJobPayload>(TASK_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  },
});

// CORRECTION : Ajout de la 'dead-letter-queue' pour les échecs permanents
export const deadLetterQueue = new Queue(DEAD_LETTER_QUEUE_NAME, {
  connection: redisConnection,
});

taskQueue.on('error', (err) => logger.error({ err }, "Erreur de la file d'attente BullMQ"));
logger.info(
  `File d'attente '${TASK_QUEUE_NAME}' initialisée pour ${config.REDIS_HOST}:${config.REDIS_PORT}`
);
