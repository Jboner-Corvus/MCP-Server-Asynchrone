// src/queue.ts

import { Queue, ConnectionOptions, Job } from 'bullmq'; // Ajout de Job pour le typage
import { config } from './config.js';
import logger from './logger.js';
import {
  TASK_QUEUE_NAME,
  DEAD_LETTER_QUEUE_NAME,
  DEFAULT_BULLMQ_JOB_OPTIONS,
} from './utils/constants.js';
import type { AuthData } from './types.js';

export function initQueues(config: any, logger: any) {
  const redisConnection: ConnectionOptions = {
    host: config.REDIS_HOST,
    port: config.REDIS_PORT,
    password: config.REDIS_PASSWORD,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
  // File d'attente principale pour les tâches asynchrones
  const taskQueue = new Queue<AsyncTaskJobPayload, unknown, string>(TASK_QUEUE_NAME, {
    // Remplacé any par AsyncTaskJobPayload et unknown
    connection: redisConnection,
    defaultJobOptions: DEFAULT_BULLMQ_JOB_OPTIONS,
  });
  // File d'attente pour les tâches qui ont échoué de manière répétée (Dead Letter Queue)
  const deadLetterQueue = new Queue<AsyncTaskJobPayload, unknown, string>(
    DEAD_LETTER_QUEUE_NAME,
    {
      // Remplacé any par AsyncTaskJobPayload et unknown
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: { count: 1000, age: 30 * 24 * 3600 },
        removeOnFail: false,
      },
    }
  );
  // Gestionnaires d'événements pour la journalisation
  taskQueue.events.on('error', (err) =>
    logger.error({ err, queue: TASK_QUEUE_NAME }, "Erreur de la file d'attente principale")
  );
  deadLetterQueue.events.on('error', (err) =>
    logger.error({ err, queue: DEAD_LETTER_QUEUE_NAME }, 'Erreur de la Dead Letter Queue')
  );
  logger.info(
    `File d'attente '${TASK_QUEUE_NAME}' initialisée pour ${config.REDIS_HOST}:${config.REDIS_PORT}`
  );
  logger.info(`Dead Letter Queue '${DEAD_LETTER_QUEUE_NAME}' initialisée.`);
  return { taskQueue, deadLetterQueue, redisConnection };
}

// Interface pour le payload des jobs dans la file d'attente
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface AsyncTaskJobPayload<TParams = any> {
  // Conservé any ici car TParams est générique par nature
  params: TParams;
  auth: AuthData | undefined;
  taskId: string;
  toolName: string;
  cbUrl?: string;
  originalJobId?: string; // Ajout pour l'exemple de DLQ
  failureReason?: unknown; // Ajout pour l'exemple de DLQ
}

// Ajout d'un type pour Job pour plus de clarté, si utilisé directement.
export type AppJob<P = unknown, R = unknown> = Job<AsyncTaskJobPayload<P>, R, string>;
