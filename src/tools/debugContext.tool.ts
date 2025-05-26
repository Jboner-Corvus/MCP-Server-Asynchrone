// src/tools/debugContext.tool.ts

import { z } from 'zod';
import logger from '../logger.js';
import { type AuthData } from '../types.js';

const TOOL_NAME = 'correctDebugContextTool';
// Interface de contexte pour les outils FastMCP
interface Ctx {
  authData?: AuthData | Record<string, unknown>; // Remplacé any par Record<string, unknown>
  frameworkSessionId?: string;
  reportProgress?: (progress: {
    progress: number;
    total: number;
    message?: string;
  }) => Promise<void>;
  streamContent?: (content: unknown) => Promise<void>; // Remplacé any par unknown
  log?: {
    info: (message: string, data?: unknown) => void; // Remplacé any par unknown
    warn: (message: string, data?: unknown) => void; // Remplacé any par unknown
    error: (message: string, data?: unknown) => void; // Remplacé any par unknown
    debug: (message: string, data?: unknown) => void; // Remplacé any par unknown
  };
}

export const debugContextParams = z.object({
  message: z
    .string()
    .optional()
    .describe('Message optionnel à inclure dans le journal de débogage.'),
  useClientLogger: z
    .boolean()
    .optional()
    .default(false)
    .describe('Si vrai, utilise context.log pour envoyer des messages au client MCP.'),
  userId: z
    .string()
    .optional()
    .describe(
      "L'identifiant de session provenant de l'environnement appelant (ex: n8n chat sessionId)."
    ),
});
export type ParamsType = z.infer<typeof debugContextParams>;
export const debugContextTool = {
  name: TOOL_NAME,
  description:
    "Débogueur de contexte. Affiche AuthData, l'ID de session du framework FastMCP, et l'ID utilisateur (n8n) si fourni.",
  parameters: debugContextParams,
  annotations: {
    title: 'Débogueur de Contexte & Session',
    authRequiredHint: true,
    readOnlyHint: true,
    description:
      "Diagnostique context.authData, context.frameworkSessionId, et l'ID utilisateur (n8n) passé en argument.",
  },
  execute: async (args: ParamsType, context: Ctx): Promise<string> => {
    const clientLog = context.log;
    const serverLog = logger.child({
      tool: TOOL_NAME,
      clientIp: context?.authData?.clientIp,
      appAuthId: context?.authData?.id,
      frameworkSessionId: context?.frameworkSessionId,
      n8nSessionIdTool: args.userId,
    });
    const logFn =
      args.useClientLogger && clientLog ? clientLog.info : serverLog.info.bind(serverLog);
    const warnFn =
      args.useClientLogger && clientLog ? clientLog.warn : serverLog.warn.bind(serverLog);
    logFn(`${TOOL_NAME} exécution appelée. UserID (n8n): ${args.userId || 'N/A'}`, {
      userMsg: args.message,
    });
    let resultMessage = `Rapport de l'Outil de Débogage de Contexte:\n`;
    resultMessage += `Message Utilisateur: ${args.message || 'N/A'}\n`;
    resultMessage += `UserID (n8n, depuis argument 'userId'): ${args.userId || 'Non Fourni'}\n`;
    resultMessage += `\n--- ID de Session du Framework FastMCP (context.frameworkSessionId) ---\n`;
    if (context?.frameworkSessionId) {
      resultMessage += `ID de Session du Framework FastMCP trouvé: ${context.frameworkSessionId}\n`;
      logFn('ID de Session du Framework FastMCP présent.', {
        frameworkSessionId: context.frameworkSessionId,
      });
    } else {
      resultMessage += `ID de Session du Framework FastMCP NON trouvé (context.frameworkSessionId est indéfini ou nul).\n`;
      warnFn('context.frameworkSessionId est indéfini ou nul.');
    }

    resultMessage += `\n--- Analyse de context.authData (Données d'Authentification de l'Application) ---\n`;
    if (context?.authData) {
      const authDataObject = context.authData as AuthData; // Cast pour accès aux propriétés
      resultMessage += `Objet context.authData présent.\n`;
      logFn('Objet context.authData présent.', {
        authDataKeys: Object.keys(authDataObject),
        authDataContent: authDataObject,
      });
      const authDataType = typeof authDataObject;
      const constructorName = authDataObject?.constructor?.name;
      resultMessage += `Type de context.authData: ${authDataType}\n`;
      resultMessage += `Nom du constructeur de context.authData: ${constructorName || 'N/A'}\n`;

      const actualAuthDataKeys = Object.keys(authDataObject);
      resultMessage += `Clés trouvées sur context.authData: [${actualAuthDataKeys.join(', ')}]\n`;

      resultMessage += `\n--- Vérification des Propriétés Attendues dans context.authData ---\n`;
      const authDataChecks: Record<string, { exists: boolean; type: string; value: unknown }> = {}; // Remplacé any par unknown
      const authDataExpectedKeys: (keyof AuthData)[] = [
        'id',
        'type',
        'authenticatedAt',
        'clientIp',
      ];
      authDataExpectedKeys.forEach((key) => {
        authDataChecks[key] = {
          exists: key in authDataObject,
          type: typeof authDataObject[key],
          value: authDataObject[key],
        };
      });
      logFn('Vérifications des propriétés attendues dans context.authData.', { authDataChecks });

      if (authDataChecks.id?.exists) {
        resultMessage += `ID Applicatif (context.authData.id) trouvé: ${authDataChecks.id.value}\n`;
      } else {
        resultMessage += `ID Applicatif (context.authData.id) NON trouvé.\n`;
      }
      resultMessage += `Type d'authentification (context.authData.type): ${authDataChecks.type?.value ?? 'Non Trouvé'}\n`;
      resultMessage += `Timestamp d'authentification (context.authData.authenticatedAt): ${authDataChecks.authenticatedAt?.value ? new Date(authDataChecks.authenticatedAt.value as number).toISOString() : 'Non Trouvé'}\n`; // Cast value as number
      resultMessage += `IP Client (context.authData.clientIp): ${
        authDataChecks.clientIp?.value ?? 'Non Trouvé'
      }\n`;

      if (authDataExpectedKeys.every((key) => authDataChecks[key]?.exists)) {
        resultMessage += `Toutes les clés attendues pour AuthData sont présentes sur context.authData.\n`;
      } else {
        resultMessage += `AVERTISSEMENT: Certaines clés attendues pour AuthData sont manquantes sur context.authData.\n`;
        warnFn('Certaines clés attendues pour AuthData sont manquantes.', {
          authDataExpectedKeys,
          foundKeys: actualAuthDataKeys,
        });
      }
    } else {
      resultMessage += `context.authData est INDÉFINI ou NUL.\n`;
      warnFn('context.authData est indéfini ou nul.');
    }

    resultMessage += `\n--- Vérifications des Autres Fonctions Utilitaires du Contexte ('context.*') ---\n`;
    const contextFunctionChecks: Record<string, { exists: boolean; isFunction: boolean }> = {
      // Remplacé any par boolean
      reportProgress: {
        exists: 'reportProgress' in context,
        isFunction: typeof context.reportProgress === 'function',
      },
      streamContent: {
        exists: 'streamContent' in context,
        isFunction: typeof context.streamContent === 'function',
      },
      log: {
        exists: 'log' in context,
        isFunction:
          typeof context.log === 'object' &&
          context.log !== null &&
          typeof context.log.info === 'function',
      },
    };
    logFn("Vérifications des fonctions utilitaires sur 'context'.", { contextFunctionChecks });
    resultMessage += `Méthode context.reportProgress: ${contextFunctionChecks.reportProgress.isFunction ? 'Existe' : 'Non Trouvé'}\n`;
    resultMessage += `Méthode context.streamContent: ${contextFunctionChecks.streamContent.isFunction ? 'Existe' : 'Non Trouvé'}\n`;
    resultMessage += `Objet context.log (pour le client): ${
      contextFunctionChecks.log.isFunction ? 'Existe' : 'Non Trouvé'
    }\n`;

    logFn('Exécution de CorrectDebugContextTool terminée.');
    return resultMessage;
  },
};
