/**
 * @file src/server.ts
 * @description Point d'entrée principal du serveur FastMCP.
 * Ce fichier initialise le serveur, configure l'authentification, enregistre les outils,
 * et démarre le transport HTTP Stream en suivant les meilleures pratiques.
 */

import { randomUUID } from 'crypto';
import type { IncomingMessage } from 'http';

import { FastMCP } from 'fastmcp';
import type { FastMCPSession, LoggingLevel } from 'fastmcp';

// Imports locaux
import { config } from './config.js';
import logger from './logger.js';
import { debugContextTool } from './tools/debugContext.tool.js';
import { longProcessTool } from './tools/longProcess.tool.js';
import { synchronousExampleTool } from './tools/synchronousExample.tool.js';
import type { AuthData } from './types.js';
import { ANSI_COLORS } from './utils/constants.js';
import { getErrDetails } from './utils/errorUtils.js';

// =============================================================================
// GESTIONNAIRE D'AUTHENTIFICATION
// =============================================================================

export const authHandler = async (req: IncomingMessage): Promise<AuthData> => {
  const clientIp =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown';

  const authLog = logger.child({
    clientIp,
    op: 'auth',
  });

  const authHeader = req.headers?.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    authLog.warn(
      { clientIp },
      "Tentative d'accès non autorisé: en-tête 'Authorization' manquant ou invalide."
    );
    throw new Error('Accès non autorisé');
  }

  const token = authHeader.substring(7);
  if (token !== config.AUTH_TOKEN) {
    authLog.warn("Tentative d'accès non autorisé: Jeton invalide.");
    throw new Error('Jeton invalide');
  }

  const sessionAuthData: AuthData = {
    id: randomUUID(),
    type: 'Bearer',
    authenticatedAt: Date.now(),
    clientIp,
  };

  authLog.info({ authId: sessionAuthData.id }, 'Authentification réussie.');
  return sessionAuthData;
};

// =============================================================================
// POINT D'ENTRÉE PRINCIPAL DE L'APPLICATION
// =============================================================================
export async function applicationEntryPoint() {
  logger.info(
    `Démarrage du serveur en mode ${ANSI_COLORS.YELLOW}${config.NODE_ENV}${ANSI_COLORS.RESET}...`
  );

  const server = new FastMCP<AuthData>({
    name: 'MCP-Server-Production',
    version: '2.0.0',
    authenticate: authHandler,
    instructions:
      "Serveur MCP pour opérations synchrones et asynchrones. Le transport est HTTP Stream. L'authentification Bearer est requise.",

    health: {
      enabled: true,
      path: config.HEALTH_CHECK_PATH,
      message: 'Server is healthy and ready.',
    },

    ping: {
      enabled: true,
      intervalMs: 15000,
      logLevel: (config.LOG_LEVEL as LoggingLevel) || 'info',
    },

    roots: {
      enabled: false,
    },
  });

  const toolsToRegister: any[] = [debugContextTool, longProcessTool, synchronousExampleTool];

  // Enregistrement des outils
  toolsToRegister.forEach((tool) => server.addTool(tool));

  logger.info({ tools: toolsToRegister.map((t) => t.name) }, 'Outils enregistrés avec succès.');

  server.on('connect', (_event: { session: FastMCPSession<AuthData> }) => {
    logger.info('Nouvelle session client établie.');
  });

  server.on('disconnect', (event: { session: FastMCPSession<AuthData>; reason?: string }) => {
    logger.warn({ reason: event.reason || 'Non spécifiée' }, 'Session client déconnectée.');
  });

  try {
    await server.start({
      transportType: 'httpStream',
      httpStream: {
        port: config.PORT,
        endpoint: '/mcp', // Maintenir le endpoint standard
      },
    });
    logger.info(`🚀 Serveur FastMCP démarré et à l'écoute sur http://localhost:${config.PORT}/mcp`);
  } catch (error) {
    logger.fatal({ err: getErrDetails(error) }, 'Échec critique lors du démarrage du serveur.');
    process.exit(1);
  }

  // Gestion de l'arrêt propre (Graceful Shutdown)
  const shutdown = async (signal: string) => {
    logger.warn(`Signal ${signal} reçu. Arrêt propre du serveur...`);
    try {
      await server.stop();
      logger.info('Serveur FastMCP arrêté avec succès.');
    } catch (e) {
      logger.error({ err: getErrDetails(e) }, "Erreur lors de l'arrêt du serveur.");
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// =============================================================================
// GESTION DES ERREURS GLOBALES ET LANCEMENT
// =============================================================================
process.on('uncaughtException', (err, origin) => {
  logger.fatal({ err: getErrDetails(err), origin }, `EXCEPTION NON CAPTURÉE. Arrêt forcé.`);
  if (config.NODE_ENV !== 'test') {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason) => {
  logger.error({ reason: getErrDetails(reason) }, 'REJET DE PROMESSE NON GÉRÉ.');
});

// Lancement de l'application
