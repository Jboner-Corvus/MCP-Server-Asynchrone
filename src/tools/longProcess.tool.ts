// src/tools/longProcess.tool.ts

import { randomUUID } from 'crypto';
import { z } from 'zod';

import { getInitializedFastMCP } from '../fastmcpProvider.js';
import logger from '../logger.js';
import { enqueueTask } from '../utils/asyncToolHelper.js';
import { getErrDetails } from '../utils/errorUtils.js';
import { isValidHttpUrl } from '../utils/validationUtils.js';
import type { AuthData } from '../types.js';
const TOOL_NAME = 'asynchronousTaskSimulatorEnhanced';

interface Ctx {
  authData?: AuthData;
  frameworkSessionId?: string;
  log?: {
    info: (message: string, data?: unknown) => void;
    warn: (message: string, data?: unknown) => void;
    error: (message: string, data?: unknown) => void;
    debug: (message: string, data?: unknown) => void;
  };
  reportProgress?: (progress: {
    progress: number;
    total: number;
    message?: string;
  }) => Promise<void>;
  streamContent?: (content: {
    type: 'text' | 'image' | 'audio';
    text?: string;
    data?: string;
    mimeType?: string;
    url?: string;
    path?: string;
    buffer?: Buffer;
  }) => Promise<void>;
}

export const longProcessParams = z.object({
  durationMs: z
    .number()
    .int()
    .min(100)
    .max(30000)
    .describe('La durée (en ms) de cette simulation de quête (min 100ms, max 30s).'),
  value1: z.number().describe("La première valeur numérique pour l'opération."),
  value2: z.number().describe("La seconde valeur numérique pour l'opération."),
  failTask: z
    .boolean()
    .optional()
    .default(false)
    .describe('Si vrai, simule un échec de la tâche dans le worker.'),
  failOnInit: z
    .boolean()
    .optional()
    .default(false)
    .describe("Si vrai, simule un échec lors de la validation initiale dans l'outil."),
  callbackUrl: z
    .string()
    // .url() // Removed .url() from Zod schema
    .optional()
    .describe(
      "L'URL de rappel optionnelle pour notifier la fin de la tâche. Doit être une URL HTTP/HTTPS valide (validé séparément par la fonction isValidHttpUrl)." // Updated description
    ),
  streamIntervals: z
    .number()
    .int()
    .min(1)
    .max(10)
    .optional()
    .default(3)
    .describe('Nombre de messages à streamer pendant la tâche.'),
  userId: 
z
    .string()
    .optional()
    .describe(
      "L'identifiant de session provenant de l'environnement appelant (ex: n8n chat sessionId)."
    ),
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
    n8nSessionIdWorker: params.userId,
  });
  log.info(
    { paramsPreview: JSON.stringify(params).substring(0, 100) },
    `⚒️ Le Forgeron débute son œuvre pour la tâche ${taskId}. UserID (n8n): ${params.userId || 'N/A'}. Durée estimée : ${params.durationMs}ms.`
  );
  const startTime = new Date();

  // Validation of callbackUrl format is done here [cite: 147]
  if (params.callbackUrl && !isValidHttpUrl(params.callbackUrl, `${TOOL_NAME}-worker`)) {
    log.warn(
      { url: params.callbackUrl },
      "⚠️ Format d'URL de rappel invalide dans le worker. Le rapport pourrait ne pas parvenir."
    );
  }

  await new Promise((res) => setTimeout(res, params.durationMs));
  if (params.failTask) {
    log.warn(
      `🔥 Simulation d'un échec catastrophique de la tâche ${taskId}. Le dragon s'est réveillé en colère ! 💀`
    );
    throw new Error(`Échec simulé pour la tâche ${taskId} dans le worker. Le destin est cruel.`);
  }

  const result = params.value1 + params.value2;
  const endTime = new Date();
  const durationTakenMs = endTime.getTime() - startTime.getTime();
  log.info(
    { calcRes: result, durationTakenMs },
    "✅ L'œuvre du Forgeron est achevée. Le résultat est forgé !"
  );
  return {
    calcRes: result,
    details: `Les valeurs ${params.value1} et ${params.value2} ont été unies par le destin après un travail de ${durationTakenMs}ms.
UserID (n8n): ${params.userId || 'N/A'}.`,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    durationTakenMs,
    inputUserId: params.userId,
  };
}

export const longProcessTool = {
  name: TOOL_NAME,
  description:
    "Un simulateur amélioré de longue quête asynchrone via BullMQ. Peut streamer des mises à jour, rapporter la progression, et utilise UserError pour les erreurs client. Retourne un message de confirmation et l'ID utilisateur (n8n) si fourni.",
  parameters: longProcessParams,
  annotations: {
    title: 'Simulateur de Quête Asynchrone (Confirmation Améliorée)',
    authRequiredHint: true,
    readOnlyHint: false,
    openWorldHint: true,
    streamingHint: true,
    idempotentHint: false,
  },
  execute: async (
    args: LongProcessParamsType,
    context: Ctx
  ): Promise<string | { content: Array<{ type: string; text: string }> }> => {
    const { UserError } = getInitializedFastMCP();
    const authData: AuthData | undefined = context.authData;
    const taskId = randomUUID();
    const toolLogger = context.log;
    const serverLog = logger.child({
      clientIp: authData?.clientIp,
      appAuthId: authData?.id,
      frameworkSessionId: context.frameworkSessionId,
      n8nSessionIdTool: args.userId,
      tool: TOOL_NAME,
      taskId,
    });
    serverLog.info(
      { params: args },
      `🗺️ Requête de quête asynchrone reçue. UserID (n8n): ${args.userId || 'N/A'}. Initialisation de la tâche ${taskId}...`
    );
    toolLogger?.info(
      `[${taskId}] Initialisation de la quête asynchrone... (UserID n8n: ${args.userId || 'N/A'})`,
      args
    );
    if (!authData) {
      serverLog.error("🚨 Sceau d'Authentification (AuthData) manquant. Accès refusé ! 🛑");
      toolLogger?.error(`[${taskId}] Authentification manquante. Impossible de lancer la quête.`);
      throw new UserError(
        "Données d'authentification (AuthData) manquantes. La quête ne peut être lancée."
      );
    }

    if (args.failOnInit) {
      serverLog.warn(`[${taskId}] Simulation d'un échec de validation initial.`);
      toolLogger?.error(
        `[${taskId}] Échec de la validation des paramètres : condition 'failOnInit' activée.`
      );
      throw new UserError(
        'Échec de la validation initiale des paramètres de la quête (failOnInit).'
      );
    }

    // Validation of callbackUrl format is done here [cite: 166]
    if (args.callbackUrl && !isValidHttpUrl(args.callbackUrl, `${TOOL_NAME}-execute`)) {
      serverLog.error(
        { callbackUrl: args.callbackUrl },
        "❌ URL de rappel invalide fournie à l'outil."
      );
      toolLogger?.error(
        `[${taskId}] L'URL de rappel fournie ('${args.callbackUrl}') n'est pas une URL HTTP/HTTPS valide.`
      );
      throw new UserError(
        "Format de l'URL de rappel invalide. La quête ne peut être lancée avec ce rappel."
      );
    }

    if (context.streamContent && context.reportProgress) {
      await context.streamContent({
        type: 'text',
        text: `[${taskId}] Préparation de la quête '${TOOL_NAME}' (UserID n8n: ${args.userId || 'N/A'})...\n`,
      });
      const streamIntervals = args.streamIntervals || 3;
      const initialDelay = Math.min(args.durationMs / (streamIntervals + 1), 500);
      for (let i = 0; i < streamIntervals; i++) {
        await new Promise((resolve) => setTimeout(resolve, initialDelay / streamIntervals));
        const progress = Math.round(((i + 1) / (streamIntervals + 1)) * 100);
        await context.reportProgress({
          progress,
          total: 100,
          message: `Pré-traitement étape ${i + 1}/${streamIntervals}`,
        });
        await context.streamContent({
          type: 'text',
          text: `[${taskId}] Étape de pré-traitement ${i + 1}/${streamIntervals} terminée.\n`,
        });
        toolLogger?.debug(`[${taskId}] Streamed pre-processing step ${i + 1}`);
      }
      await context.streamContent({
        type: 'text',
        text: `[${taskId}] Tous les pré-traitements sont terminés. Mise en file d'attente de la tâche principale...\n`,
      });
      toolLogger?.info(`[${taskId}] Pré-traitement et streaming initiaux terminés.`);
    }

    try {
      const jobId = await enqueueTask<LongProcessParamsType>({
        params: args,
        auth: authData,
        taskId: taskId,
        toolName: TOOL_NAME,
        cbUrl: args.callbackUrl,
      });
      let server_log_message = `[${taskId}] La quête (Job ID: ${jobId || taskId}, UserID n8n: ${args.userId || 'N/A'}) a été enfilée avec succès.
Durée de traitement estimée dans le worker : ${args.durationMs}ms.`;
      if (args.callbackUrl) {
        server_log_message += ` Un messager sera envoyé à ${args.callbackUrl} à la fin.`;
      }
      serverLog.info(server_log_message);
      toolLogger?.info(
        `[${taskId}] Quête enfilée ! Job ID: ${jobId}. UserID n8n: ${args.userId || 'N/A'}. Attente du résultat...`
      );
      let client_response_message = `[${taskId}] Tâche "${TOOL_NAME}" (Job ID: ${jobId || taskId}, UserID n8n: ${args.userId || 'N/A'}) mise en file d'attente avec succès.\n`;
      client_response_message += `Statut: En cours. Durée de traitement estimée: ${args.durationMs}ms.`;
      if (args.callbackUrl) {
        client_response_message += ` Une notification sera envoyée à ${args.callbackUrl} lorsque la tâche sera terminée.`;
      } else {
        client_response_message += ` Veuillez vérifier le statut de la tâche ultérieurement.`;
      }

      return client_response_message;
    } catch (error: unknown) {
      const errDetails = getErrDetails(error);
      serverLog.error(
        { err: errDetails },
        "💀 Échec critique de l'enfilement de la quête asynchrone."
      );
      toolLogger?.error(
        `[${taskId}] Erreur critique lors de la mise en file d'attente : ${errDetails.message}`
      );
      const displayError =
        error instanceof UserError
          ? error
          : new UserError(
              `L'enfilement de la quête a échoué pour ${TOOL_NAME} : ${errDetails.message || 'Erreur inconnue'}`
            );
      throw displayError;
    }
  },
};