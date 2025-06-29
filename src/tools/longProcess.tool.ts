// src/tools/longProcess.tool.ts (Corrigé)

import { randomUUID } from 'crypto';
import { z } from 'zod';
import { UserError, type Context } from 'fastmcp';
import logger from '../logger.js';
import { enqueueTask } from '../utils/asyncToolHelper.js';
import { isValidHttpUrl } from '../utils/validationUtils.js';
import type { SessionData } from '../types.js';

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

// CORRECTION : Ajout d'une implémentation pour la fonction.
// Cela corrige les erreurs de "paramètre non utilisé" et de "valeur de retour manquante".
export async function doWorkSpecific(
  params: LongProcessParamsType,
  auth: SessionData | undefined,
  taskId: string
): Promise<LongProcessResultType> {
  const startTime = new Date();
  logger.info({ taskId, authId: auth?.id }, `Début du travail pour la tâche ${taskId}`);

  if (params.failTask) {
    throw new Error('Échec simulé dans le worker.');
  }

  await new Promise(resolve => setTimeout(resolve, params.durationMs));

  const endTime = new Date();
  const result: LongProcessResultType = {
    calcRes: params.value1 + params.value2,
    details: 'Calcul terminé avec succès.',
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    durationTakenMs: endTime.getTime() - startTime.getTime(),
    inputUserId: params.userId,
  };
  
  logger.info({ taskId }, `Travail terminé pour la tâche ${taskId}`);
  return result;
}

export const longProcessTool = {
  name: TOOL_NAME,
  description: 'Simulateur de tâche longue asynchrone qui peut streamer sa progression.',
  parameters: longProcessParams,
  annotations: { streamingHint: true },
  execute: async (args: LongProcessParamsType, context: Context<SessionData>): Promise<string> => {
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
    toolLogger?.info(`[${taskId}] Initialisation de la tâche...`);
    if (!authData) {
      throw new UserError("Données d'authentification manquantes.");
    }
    if (args.failOnInit) {
      throw new UserError('Échec de validation initial simulé.');
    }
    if (args.callbackUrl && !isValidHttpUrl(args.callbackUrl, `${TOOL_NAME}-execute`)) {
      throw new UserError("Format de l'URL de rappel invalide.");
    }
    
    // CORRECTION : Le type de contenu a été changé en 'text' pour être valide.
    // L'information a été placée dans la propriété 'text'.
    context.streamContent?.({
      type: 'text',
      text: `[task_started] La tâche a été acceptée (ID: ${taskId}) et mise en file d'attente.`,
    });

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