// src/worker.ts

import { initQueues, AsyncTaskJobPayload, AppJob } from './queue.js';
import {
  doWorkSpecific as longProcDoWork,
  LongProcessParamsType,
  LongProcessResultType,
} from './tools/longProcess.tool.js';
import { TASK_QUEUE_NAME, DEAD_LETTER_QUEUE_NAME } from './utils/constants.js';
import { getErrDetails, ErrorDetails } from './utils/errorUtils.js';
import { sendWebhook } from './utils/webhookUtils.js';
import type { AuthData } from './types.js';
import type { TaskOutcome } from './utils/asyncToolHelper.js';

const Q_NAME = TASK_QUEUE_NAME;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JobProcFn<P = any, R = any> = (
  params: P,
  auth: AuthData | undefined,
  taskId: string,
  job: AppJob<P, R>
) => Promise<R>;

const processors: Record<string, JobProcFn> = {
  // Kept JobProcFn as JobProcFn<any,any> implicitly
  asynchronousTaskSimulatorEnhanced: longProcDoWork as JobProcFn<
    // Cast to satisfy the general type
    LongProcessParamsType,
    LongProcessResultType
  >,
};

import type { Logger as PinoLogger } from 'pino';
import type { Config } from './config.js';

export async function initWorker(logger: PinoLogger, config: Config) {
  const { Worker } = await import('bullmq');
  const workerLog = logger.child({ proc: 'worker', queue: Q_NAME });
  const { taskQueue, deadLetterQueue, redisConnection } = initQueues();

  const worker = new Worker<AsyncTaskJobPayload, unknown, string>(
    Q_NAME,
    async (job: AppJob<unknown, unknown>) => {
      const { toolName, params, auth, taskId, cbUrl } = job.data;
      const jobLog = workerLog.child({
        jobId: job.id,
        taskId,
        tool: toolName,
        attempt: job.attemptsMade,
      });
      jobLog.info(
        { paramsPreview: JSON.stringify(params)?.substring(0, 100) },
        `Traitement du job`
      );

      const processor = processors[toolName];
      if (!processor) {
        jobLog.error(
          `Aucun processeur pour l'outil : ${toolName}. La tâche sera marquée comme échouée.`
        );
        throw new Error(`Aucun processeur trouvé pour l'outil : ${toolName}`);
      }

      let outcome: TaskOutcome<typeof params, unknown> | undefined;
      try {
        if (cbUrl) {
          const initialProgressOutcome: TaskOutcome<typeof params, unknown> = {
            taskId,
            status: 'processing',
            msg: `La tâche ${taskId} (${toolName}) a commencé son traitement.`,
            inParams: params,
            ts: new Date().toISOString(),
            progress: { current: 0, total: 100, unit: '%' },
          };
          sendWebhook(cbUrl, initialProgressOutcome, taskId, toolName, false).catch((e) =>
            jobLog.warn(
              { err: getErrDetails(e) },
              "Échec de l'envoi du webhook de progression initiale."
            )
          );
        }

        const result = await processor(params, auth, taskId, job);
        jobLog.info(`Logique du job terminée avec succès.`);
        outcome = {
          taskId,
          status: 'completed',
          msg: `Tâche ${taskId} (${toolName}) terminée avec succès.`,
          result,
          inParams: params,
          ts: new Date().toISOString(),
          progress: { current: 100, total: 100, unit: '%' },
        };
        return result;
      } catch (error: unknown) {
        const errDetails: ErrorDetails = getErrDetails(error);
        jobLog.error({ err: errDetails }, 'Erreur de traitement du job.');
        outcome = {
          taskId,
          status: 'error',
          msg: `La tâche ${taskId} (${toolName}) a échoué : ${errDetails.message}`, // Use .message
          error: errDetails,
          inParams: params,
          ts: new Date().toISOString(),
        };
        throw error;
      } finally {
        if (cbUrl && outcome) {
          jobLog.info(`Envoi du webhook final pour ${taskId}, statut : ${outcome.status}`);
          sendWebhook(cbUrl, outcome, taskId, toolName, false).catch((e) =>
            jobLog.error({ err: getErrDetails(e) }, "Échec de l'envoi du webhook final.")
          );
        }
      }
    },
    { connection: redisConnection, concurrency: config.NODE_ENV === 'development' ? 2 : 5 }
  );

  worker.on('completed', (job: AppJob, res: unknown) => {
    workerLog.info(
      { jobId: job.id, taskId: job.data.taskId, resPreview: JSON.stringify(res)?.substring(0, 50) },
      `Job terminé.`
    );
  });
  worker.on('failed', async (job: AppJob | undefined, err: Error) => {
    const rawErrorDetails = getErrDetails(err);
    const attemptsMade = job?.attemptsMade || 0;
    const maxAttempts = job?.opts?.attempts || (taskQueue.defaultJobOptions.attempts ?? 3);
    const logPayload = {
      jobId: job?.id,
      taskId: job?.data?.taskId,
      err: rawErrorDetails,
      attemptsMade,
      maxAttempts,
    };

    if (job && attemptsMade >= maxAttempts) {
      workerLog.error(
        logPayload,
        `ÉCHEC FINAL DU JOB (après ${attemptsMade} tentatives): ${rawErrorDetails.message}. Déplacement vers la DLQ.` // Use .message
      );
      if (deadLetterQueue && job.data) {
        try {
          await deadLetterQueue.add(
            job.name,
            { ...job.data, originalJobId: job.id, failureReason: rawErrorDetails },
            {
              removeOnComplete: true,
              removeOnFail: false,
            }
          );
          workerLog.info(
            { ...logPayload, dlq: DEAD_LETTER_QUEUE_NAME },
            `Job déplacé vers la DLQ.`
          );
        } catch (dlqError: unknown) {
          workerLog.error(
            { ...logPayload, dlqError: getErrDetails(dlqError) },
            `Échec du déplacement du job vers la DLQ.`
          );
        }
      }
    } else {
      workerLog.warn(
        logPayload,
        `Job échoué (tentative ${attemptsMade}/${maxAttempts}): ${rawErrorDetails.message}. Nouvelle tentative prévue si applicable.` // Use .message
      );
    }
  });

  worker.on('error', (err: Error) => {
    const errDetails = getErrDetails(err);
    workerLog.error({ err: errDetails }, `Erreur du Worker : ${errDetails.message}`); // Use .message
  });
  async function gracefulShutdown(signal: string) {
    workerLog.warn(`Signal ${signal} reçu. Fermeture du worker...`);
    try {
      await worker.close();
      workerLog.info('Worker fermé avec succès.');
      process.exit(0);
    } catch (err: unknown) {
      workerLog.error({ err: getErrDetails(err) }, 'Erreur lors de la fermeture du worker.');
      process.exit(1);
    }
  }

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  workerLog.info(
    `Worker pour la file d'attente '${Q_NAME}' démarré avec une concurrence de ${worker.opts.concurrency}. Prêt à traiter les tâches.`
  );
  return worker;
}

// Call initWorker if not in a test environment
if (process.env.NODE_ENV !== 'test') {
  import('./logger.js').then(({ default: actualLogger }) => {
    import('./config.js').then(({ config: actualConfig }) => {
      initWorker(actualLogger, actualConfig);
    });
  });
}
