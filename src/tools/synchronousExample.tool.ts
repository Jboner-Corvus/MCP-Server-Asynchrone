// src/tools/synchronousExample.tool.ts

import { z as zod } from 'zod';
import type { Context, SerializableValue, TextContent } from 'fastmcp';
import loggerInstance from '../logger.js';
import { AuthData as AuthDataType, zodToStandardSchema } from '../types.js';

const SYNC_TOOL_NAME = 'synchronousExampleToolEnhanced';

export const synchronousExampleParams = zod.object({
  data: zod.string().min(1).describe('La donnée à transmuter.'),
  delayMs: zod.number().int().min(0).max(1000).optional().default(10),
  useClientLogger: zod.boolean().optional().default(false),
  userId: zod.string().optional(),
});
export type SyncParamsType = zod.infer<typeof synchronousExampleParams>;
type SyncResultType = TextContent;
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
  parameters: zodToStandardSchema(synchronousExampleParams),
  execute: async (
    args: unknown,
    context: Context<AuthDataType>
  ): Promise<SyncResultType> => {
    const typedArgs = args as SyncParamsType;
    // CORRIGÉ : `context.session` contient directement les données d'authentification.
    const authData = context.session;
    const clientLog = context.log;
    const serverLog = loggerInstance.child({
      tool: SYNC_TOOL_NAME,
      clientIp: authData?.clientIp,
      appAuthId: authData?.id,
      n8nSessionIdTool: typedArgs.userId,
    });

    const logFnInfo = (message: string, data?: Record<string, SerializableValue>) => {
      if (typedArgs.useClientLogger && clientLog) {
        clientLog.info(message, data);
      } else {
        serverLog.info(data, message);
      }
    };
    logFnInfo(`Requête de tâche synchrone reçue.`, { params: typedArgs });

    if (typedArgs.delayMs && typedArgs.delayMs > 0) {
      await new Promise((res) => setTimeout(res, typedArgs.delayMs));
    }

    const output: SyncOutputTypeInternal = {
      processed: `PROCESSED: ${typedArgs.data.toUpperCase()}`,
      ts: Date.now(),
      input: typedArgs,
      appAuthId: authData?.id,
      clientIp: authData?.clientIp,
      n8nSessionId: typedArgs.userId,
    };

    const result: SyncResultType = {
      type: 'text',
      text: JSON.stringify(output, null, 2),
    };

    logFnInfo(`Tâche synchrone terminée.`, { output });
    return result;
  },
};
