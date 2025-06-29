// src/utils/asyncToolHelper.ts (Corrigé)
import logger from '../logger.js';
// CORRECTION : 'AsyncTaskJobPayload' a été renommé en 'AsyncTaskPayload' pour correspondre à l'exportation de queue.ts.
import { taskQueue, AsyncTaskPayload } from '../queue.js';
import { EnqueueTaskError, getErrDetails, ErrorDetails } from './errorUtils.js';
// CORRECTION : Importation de 'SessionData' et création d'un alias 'AuthData' pour correspondre à l'usage.
import type { SessionData as AuthData } from '../types.js';

export interface EnqueueParams<TParams> {
  params: TParams;
  auth: AuthData | undefined;
  taskId: string;
  toolName: string;
  cbUrl?: string;
}

export interface TaskOutcome<TParams, TResult> {
  taskId: string;
  status: 'completed' | 'error' | 'processing';
  msg: string;
  result?: TResult;
  error?: ErrorDetails;
  inParams: TParams;
  ts: string;
  progress?: { current: number; total: number; unit?: string };
}

/**
 * Ajoute une tâche à la file d'attente BullMQ.
 */
export async function enqueueTask<TParams>(
  args: EnqueueParams<TParams>
): Promise<string | undefined> {
  const { params, auth, taskId, toolName, cbUrl } = args;
  const log = logger.child({
    clientIp: auth?.clientIp,
    tool: toolName,
    taskId,
    proc: 'task-producer',
    cbUrl: !!cbUrl,
  });
  // CORRECTION : Le type de jobData a été mis à jour vers 'AsyncTaskPayload'.
  const jobData: AsyncTaskPayload<TParams> = { params, auth, taskId, toolName, cbUrl };
  try {
    const job = await taskQueue.add(toolName, jobData, { jobId: taskId });
    log.info({ jobId: job.id, queue: taskQueue.name }, `Tâche ajoutée à la file d'attente.`);
    return job.id;
  } catch (error: unknown) {
    const errDetails = getErrDetails(error);
    log.error(
      { err: errDetails, toolName, taskId },
      "Échec de l'ajout de la tâche à la file d'attente."
    );
    throw new EnqueueTaskError(
      `L'ajout de la tâche ${taskId} pour ${toolName} à la file d'attente a échoué : ${errDetails.message}`,
      { originalError: errDetails, toolName, taskId }
    );
  }
}