// src/tools/longProcess.tool.ts

import { randomUUID } from 'crypto';
import { z } from 'zod';
import { UserError, type Context } from 'fastmcp';

import logger from '../logger.js';
import { enqueueTask } from '../utils/asyncToolHelper.js';
import { isValidHttpUrl } from '../utils/validationUtils.js';
import type { AuthData } from '../types.js';

const TOOL_NAME = 'asynchronousTaskSimulatorEnhanced';

export const longProcessParams = z.object({
  durationMs: z.number().int().min(100).max(30000),
  value1: z.number(),
  value2: z.number(),
  failTask: z.boolean().optional().default(false),
  failOnInit: z.boolean().optional().default(false),
  callbackUrl: z.string().optional(),
  streamIntervals: z.number().int().min(1).max(10).optional().default(3),
  userId: z.string().optional(),
});
export type LongProcessParamsType = z.infer<typeof longProcessParams>;
export type LongProcessResultType = {
  calcRes: number;
  details: string;
  startTime: string;
  endTime: string;
  durationTakenMs: number;
  inputUserId?: string;
};

export async function doWorkSpecific(
  params: LongProcessParamsType,
  auth: AuthData | undefined,
  taskId: string
): Promise<LongProcessResultType> {
  const log = logger.child({
    tool: TOOL_NAME,
    taskId,
    proc: 'worker-logic',
    appAuthId: auth?.id,
  });
  log.info({ params }, `Début du traitement de la tâche longue.`);
  const startTime = new Date();
  await new Promise((res) => setTimeout(res, params.durationMs));
  if (params.failTask) {
    throw new Error(`Échec simulé pour la tâche ${taskId}.`);
  }
  const result = params.value1 + params.value2;
  const endTime = new Date();
  const durationTakenMs = endTime.getTime() - startTime.getTime();
  return {
    calcRes: result,
    details: `Le résultat de ${params.value1} + ${params.value2} est calculé.`,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    durationTakenMs,
    inputUserId: params.userId,
  };
}

export const longProcessTool = {
  name: TOOL_NAME,
  description: 'Simulateur de tâche longue asynchrone.',
  parameters: longProcessParams,
  annotations: { streamingHint: true },
  execute: async (args: LongProcessParamsType, context: Context<AuthData>): Promise<string> => {
    // CORRIGÉ : `context.session` contient directement les données d'authentification.
    const authData = context.session;
    const taskId = randomUUID();
    const toolLogger = context.log;
    const serverLog = logger.child({
      clientIp: authData?.clientIp,
      appAuthId: authData?.id,
      tool: TOOL_NAME,
      taskId,
    });

    serverLog.info({ params: args }, `Requête de tâche asynchrone reçue.`);
    toolLogger?.info(`[${taskId}] Initialisation de la tâche...`, { args });

    if (!authData) {
      throw new UserError("Données d'authentification manquantes.");
    }
    if (args.failOnInit) {
      throw new UserError('Échec de validation initial simulé.');
    }
    if (args.callbackUrl && !isValidHttpUrl(args.callbackUrl, `${TOOL_NAME}-execute`)) {
      throw new UserError("Format de l'URL de rappel invalide.");
    }

    // CORRIGÉ: La vérification `if (context.streamContent && ...)` est redondante
    // car les fonctions sont définies dans le type `Context`. On peut les appeler directement.

    const jobId = await enqueueTask<LongProcessParamsType>({
      params: args,
      auth: authData,
      taskId: taskId,
      toolName: TOOL_NAME,
      cbUrl: args.callbackUrl,
    });

    let response = `Tâche "${TOOL_NAME}" (ID: ${jobId || taskId}) mise en file d'attente.`;
    if (args.callbackUrl) {
      response += ` Une notification sera envoyée à ${args.callbackUrl}.`;
    }
    return response;
  },
};
