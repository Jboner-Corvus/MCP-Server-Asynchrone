// src/tools/synchronousExample.tool.ts

import { z as zod } from 'zod';
import loggerInstance from '../logger.js';

import type { AuthData as AuthDataType } from '../types.js';

const SYNC_TOOL_NAME = 'synchronousExampleToolEnhanced';
interface SyncCtx {
  authData?: AuthDataType;
  frameworkSessionId?: string;
  log?: {
    info: (message: string, data?: unknown) => void; // Remplacé any par unknown
    warn: (message: string, data?: unknown) => void; // Remplacé any par unknown
    error: (message: string, data?: unknown) => void; // Remplacé any par unknown
    debug: (message: string, data?: unknown) => void; // Remplacé any par unknown
  };
}

export const synchronousExampleParams = zod.object({
  data: zod.string().min(1).describe('La donnée à transmuter par la rune.'),
  delayMs: zod
    .number()
    .int()
    .min(0)
    .max(1000)
    .optional()
    .default(10)
    .describe("Le délai simulé (en ms) pour l'incantation (max 1s)."),
  useClientLogger: zod
    .boolean()
    .optional()
    .default(false)
    .describe('Si vrai, utilise context.log pour envoyer des messages au client MCP.'),
  userId: zod
    .string()
    .optional()
    .describe(
      "L'identifiant de session provenant de l'environnement appelant (ex: n8n chat sessionId)."
    ),
});
export type SyncParamsType = zod.infer<typeof synchronousExampleParams>;
type SyncResultType = { content: Array<{ type: 'text'; text: string }> };
type SyncOutputTypeInternal = {
  processed: string;
  ts: number;
  input: SyncParamsType;
  appAuthId?: string;
  clientIp?: string;
  frameworkSessionId?: string;
  n8nSessionId?: string;
};
export const synchronousExampleTool = {
  name: SYNC_TOOL_NAME,
  description:
    "Une rune d'exemple pour une exécution synchronisée, rapide comme l'éclair, avec annotations améliorées et support de l'ID utilisateur (n8n).",
  parameters: synchronousExampleParams,
  annotations: {
    title: 'Exemple Synchronisé Amélioré',
    authRequiredHint: true,
    readOnlyHint: true,
  },
  execute: async (args: SyncParamsType, context: SyncCtx): Promise<SyncResultType> => {
    const clientLog = context.log;
    const serverLog = loggerInstance.child({
      tool: SYNC_TOOL_NAME,
      clientIp: context.authData?.clientIp,
      appAuthId: context.authData?.id,
      frameworkSessionId: context.frameworkSessionId,
      n8nSessionIdTool: args.userId,
    });
    const logFnInfo =
      args.useClientLogger && clientLog ? clientLog.info : serverLog.info.bind(serverLog);
    const logFnDebug =
      args.useClientLogger && clientLog ? clientLog.debug : serverLog.debug.bind(serverLog);
    logFnInfo(
      `⚡ Requête de tâche synchrone reçue. UserID (n8n): ${args.userId || 'N/A'}. Préparation de l'incantation...`,
      { params: args }
    );
    if (args.delayMs && args.delayMs > 0) {
      logFnDebug(`😴 Rune en pause pour ${args.delayMs}ms...`);
      await new Promise((res) => setTimeout(res, args.delayMs));
      logFnDebug(`✨ Rune réactivée !`);
    }

    const output: SyncOutputTypeInternal = {
      processed: `PROCESSED_ENHANCED: ${args.data.toUpperCase()} 🌟✨`,
      ts: Date.now(),
      input: args,
      appAuthId: context.authData?.id,
      clientIp: context.authData?.clientIp,
      frameworkSessionId: context.frameworkSessionId,
      n8nSessionId: args.userId,
    };
    const result: SyncResultType = {
      content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
    };
    logFnInfo(`✅ Tâche synchrone terminée. La transmutation est complète !`, { output });
    return result;
  },
};
