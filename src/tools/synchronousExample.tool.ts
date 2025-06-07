// src/tools/synchronousExample.tool.ts

import { z as zod } from 'zod';
import loggerInstance from '../logger.js';
import type { AuthData as AuthDataType } from '../types.js';

const SYNC_TOOL_NAME = 'synchronousExampleToolEnhanced';

interface SyncCtx {
  session?: AuthDataType;
  log?: {
    info: (message: string, data?: unknown) => void;
    warn: (message: string, data?: unknown) => void;
    error: (message: string, data?: unknown) => void;
    debug: (message: string, data?: unknown) => void;
  };
}

export const synchronousExampleParams = zod.object({
  data: zod.string().min(1).describe('La donnée à transmuter.'),
  delayMs: zod.number().int().min(0).max(1000).optional().default(10),
  useClientLogger: zod.boolean().optional().default(false),
  userId: zod.string().optional(),
});
export type SyncParamsType = zod.infer<typeof synchronousExampleParams>;
type SyncResultType = { content: Array<{ type: 'text'; text: string }> };
type SyncOutputTypeInternal = {
  processed: string;
  ts: number;
  input: SyncParamsType;
  appAuthId?: string;
  clientIp?: string;
  n8nSessionId?: string;
};

export const synchronousExampleTool = {
  name: SYNC_TOOL_NAME,
  description: "Exemple d'outil synchrone.",
  parameters: synchronousExampleParams,
  execute: async (args: SyncParamsType, context: SyncCtx): Promise<SyncResultType> => {
    // CORRECTION : Utiliser context.session pour récupérer les données d'authentification
    const authData = context.session;
    const clientLog = context.log;
    const serverLog = loggerInstance.child({
      tool: SYNC_TOOL_NAME,
      clientIp: authData?.clientIp,
      appAuthId: authData?.id,
      n8nSessionIdTool: args.userId,
    });
    
    const logFnInfo = args.useClientLogger && clientLog ? clientLog.info : serverLog.info.bind(serverLog);
    logFnInfo(`Requête de tâche synchrone reçue.`, { params: args });
    
    if (args.delayMs && args.delayMs > 0) {
      await new Promise((res) => setTimeout(res, args.delayMs));
    }

    const output: SyncOutputTypeInternal = {
      processed: `PROCESSED: ${args.data.toUpperCase()}`,
      ts: Date.now(),
      input: args,
      appAuthId: authData?.id,
      clientIp: authData?.clientIp,
      n8nSessionId: args.userId,
    };

    const result: SyncResultType = {
      content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
    };
    logFnInfo(`Tâche synchrone terminée.`, { output });
    return result;
  },
};
