import { randomUUID } from 'crypto';
import { IncomingMessage } from 'http';

import { FastMCP, FastMCPSession, LoggingLevel } from 'fastmcp';

import { config } from './config.js';
import logger from './logger.js';
import { debugContextTool } from './tools/debugContext.tool.js';
import { longProcessTool } from './tools/longProcess.tool.js';
import { synchronousExampleTool } from './tools/synchronousExample.tool.js';
import { type AuthData } from './types.js';
import {
  ANSI_COLORS,
  DEFAULT_HEALTH_CHECK_OPTIONS,
  DEFAULT_PING_OPTIONS,
} from './utils/constants.js';
import { getErrDetails } from './utils/errorUtils.js';

const authHandler = async (req: IncomingMessage): Promise<AuthData> => {
  const clientIp = (
    (req.headers['x-forwarded-for'] as string) ||
    req.socket?.remoteAddress ||
    'unknown'
  )
    .split(',')[0]
    .trim();
  const authLog = logger.child({ clientIp, method: req.method, url: req.url, op: 'auth' });
  const authHeader = req.headers?.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    authLog.warn("Tentative d'accès non autorisé : En-tête 'Authorization' manquant ou malformé.");
    throw new Response(JSON.stringify({ error: 'Accès Non Autorisé' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const token = authHeader.substring(7);
  if (token !== config.AUTH_TOKEN) {
    authLog.warn("Tentative d'accès non autorisé : Jeton invalide.");
    throw new Response(JSON.stringify({ error: 'Jeton invalide' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
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

async function applicationEntryPoint() {
  logger.info(
    `Démarrage du serveur en mode ${ANSI_COLORS.YELLOW}${config.NODE_ENV}${ANSI_COLORS.RESET}...`
  );
  const server = new FastMCP<AuthData>({
    name: 'MCP-Server-Final',
    version: '1.1.0',
    authenticate: authHandler,
    instructions: `Serveur MCP pour opérations synchrones et asynchrones. Authentification Bearer requise.`,
    // CORRECTION : Utilisation des constantes importées pour supprimer les avertissements du linter.
    health: {
      enabled: DEFAULT_HEALTH_CHECK_OPTIONS.enabled,
      path: config.HEALTH_CHECK_PATH, // La variable de config est utilisée pour le chemin.
    },
    ping: {
      enabled: DEFAULT_PING_OPTIONS.enabled,
      intervalMs: DEFAULT_PING_OPTIONS.intervalMs,
      logLevel: DEFAULT_PING_OPTIONS.logLevel as LoggingLevel,
    },
    roots: {
      enabled: true,
    },
  });

  server.addTool(debugContextTool);
  server.addTool(longProcessTool);
  server.addTool(synchronousExampleTool);
  logger.info(
    { tools: [debugContextTool.name, longProcessTool.name, synchronousExampleTool.name] },
    'Outils enregistrés avec succès.'
  );

  server.on('connect', (_event: { session: FastMCPSession<AuthData> }) => {
    logger.info('Nouvelle connexion client établie.');
  });
  server.on('disconnect', (event: { session: FastMCPSession<AuthData>; reason?: string }) => {
    logger.info({ reason: event.reason }, 'Client déconnecté.');
  });

  try {
    await server.start({
      transportType: 'httpStream',
      httpStream: {
        port: config.PORT,
        endpoint: '/mcp',
      },
    });
    logger.info(
      `🚀 Serveur FastMCP (httpStream) démarré sur le port ${config.PORT} au chemin /mcp`
    );
  } catch (error) {
    logger.fatal(
      { err: getErrDetails(error), startupPhase: 'server.start' },
      'Échec critique lors du démarrage du serveur.'
    );
    process.exit(1);
  }

  const shutdown = async (signal: string) => {
    logger.warn(`Signal ${signal} reçu. Initialisation de l'arrêt propre...`);
    try {
      await server.stop();
      logger.info('Serveur FastMCP arrêté avec succès.');
    } catch (e: unknown) {
      logger.error({ err: getErrDetails(e) }, "Erreur lors de l'arrêt du serveur.");
    } finally {
      logger.info('Arrêt terminé.');
      process.exit(0);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

process.on('uncaughtException', (err, origin) => {
  logger.fatal(
    { err: getErrDetails(err), origin },
    `EXCEPTION NON CAPTURÉE. Le processus va se terminer.`
  );
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  logger.error({ reason: getErrDetails(reason) }, 'REJET DE PROMESSE NON GÉRÉ.');
});

applicationEntryPoint().catch((err) => {
  logger.fatal(
    { err: getErrDetails(err), startupPhase: 'applicationEntryPoint' },
    "Erreur fatale non interceptée lors de l'initialisation."
  );
  process.exit(1);
});
