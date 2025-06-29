// src/tools/debugContext.tool.ts (Version Corrigée - Erreurs de Type)

import { z } from 'zod';
import type { Context, SerializableValue } from 'fastmcp';
// CORRECTION : Le chemin d'importation pointe maintenant vers le répertoire parent (src/)
import logger from '../logger.js';
import type { SessionData as AuthData } from '../types.js';

const TOOL_NAME = 'debugContext';

export const debugContextParams = z.object({
  message: z.string().optional(),
  useClientLogger: z.boolean().optional().default(false),
  userId: z.string().optional(),
});
export type ParamsType = z.infer<typeof debugContextParams>;

// CORRECTION : Ajout du mot-clé 'export' pour rendre le tool importable
export const debugContextTool = {
  name: TOOL_NAME,
  description: "Affiche le contexte d'authentification et de session. Utile pour le débogage.",
  parameters: debugContextParams,
  requiresAuth: false,

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

    let resultMessage = `--- Rapport de l'Outil de Débogage ---\n`;
    resultMessage += `Message du client: ${args.message || 'Aucun'}\n`;
    resultMessage += `UserID (passé en argument): ${args.userId || 'Non Fourni'}\n\n`;
    resultMessage += `--- Contexte de Session (context.session) ---\n`;

    if (authData) {
      resultMessage += `Statut: Authentifié\n`;
      resultMessage += `  ID de Session: ${authData.id}\n`;
      resultMessage += `  ID Utilisateur: ${authData.userId || 'Non défini dans la session'}\n`;
      resultMessage += `  Permissions: ${authData.permissions?.join(', ') || 'Non définies'}\n`;
      resultMessage += `  IP Client: ${authData.clientIp}\n`;
      resultMessage += `  Timestamp: ${new Date(authData.authenticatedAt).toISOString()}\n`;

      // CORRECTION : Assurez-vous que toutes les propriétés sont sérialisables.
      // La propriété 'userId' est de type 'unknown' et doit être convertie en chaîne.
      const loggableAuthData = {
        id: authData.id,
        userId: String(authData.userId ?? 'N/A'), // Conversion explicite en chaîne
        permissions: authData.permissions,
        clientIp: authData.clientIp,
        authenticatedAt: authData.authenticatedAt,
      };
      logFn('Session authentifiée trouvée.', { authData: loggableAuthData });
    } else {
      resultMessage += `Statut: Non Authentifié\n`;
      resultMessage += `  Le contexte de session est vide. C'est normal pour un nouvel utilisateur.\n`;
      serverLog.warn("Exécution de l'outil de débogage avec une session non authentifiée.");
    }

    logFn('Exécution de debugContext terminée.');
    return resultMessage;
  },
};
