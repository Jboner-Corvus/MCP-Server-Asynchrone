// src/tools/debugContext.tool.ts

import { z } from 'zod';
import type { Context, SerializableValue } from 'fastmcp';
import logger from '../logger.js';
import { type AuthData } from '../types.js';

const TOOL_NAME = 'correctDebugContextTool';

export const debugContextParams = z.object({
  message: z.string().optional(),
  useClientLogger: z.boolean().optional().default(false),
  userId: z.string().optional(),
});

export type ParamsType = z.infer<typeof debugContextParams>;

export const debugContextTool = {
  name: TOOL_NAME,
  description: "Affiche le contexte d'authentification et de session.",
  parameters: debugContextParams,
  execute: async (args: ParamsType, context: Context<AuthData>): Promise<string> => {
    const authData = context.session;
    const clientLog = context.log;

    const serverLog = logger.child({
      tool: TOOL_NAME,
      clientIp: authData?.clientIp,
      appAuthId: authData?.id,
    });

    const logFn = (message: string, data?: Record<string, SerializableValue>) => {
      if (args.useClientLogger && clientLog) {
        clientLog.info(message, data);
      } else {
        serverLog.info(data, message);
      }
    };

    let resultMessage = `Rapport de l'Outil de Débogage de Contexte:\n`;
    resultMessage += `UserID (n8n, depuis argument): ${args.userId || 'Non Fourni'}\n`;

    resultMessage += `\n--- Données d'Authentification (context.session) ---\n`;
    if (authData) {
      resultMessage += `Objet context.session présent.\n`;
      resultMessage += `  ID Applicatif: ${authData.id}\n`;
      resultMessage += `  Type d'Auth: ${authData.type}\n`;
      resultMessage += `  IP Client: ${authData.clientIp}\n`;
      resultMessage += `  Timestamp: ${new Date(authData.authenticatedAt).toISOString()}\n`;

      // CORRECTION: Créer un objet plat et explicitement sérialisable pour le logging
      // afin de satisfaire le type `SerializableValue`.
      const loggableAuthData = {
        id: authData.id,
        type: authData.type,
        authenticatedAt: authData.authenticatedAt,
        clientIp: authData.clientIp,
      };
      logFn('Données de session trouvées.', { authData: loggableAuthData });
    } else {
      resultMessage += `context.session est INDÉFINI ou NUL.\n`;
      serverLog.warn('context.session est indéfini ou nul.');
    }

    logFn('Exécution de CorrectDebugContextTool terminée.');
    return resultMessage;
  },
};
