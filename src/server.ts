// src/server.ts - Aligné sur le design original de FastMCP

import { randomUUID } from 'crypto';
import { IncomingMessage } from 'http';

// Importations directes depuis fastmcp.
import { FastMCP, UserError } from 'fastmcp';
import type { FastMCPSession, ServerOptions, Tool, LoggingLevel } from 'fastmcp';

import { config } from './config.js';
import logger from './logger.js';
import { debugContextParams, debugContextTool } from './tools/debugContext.tool.js';
import { longProcessParams, longProcessTool } from './tools/longProcess.tool.js';
import {
  synchronousExampleParams,
  synchronousExampleTool,
} from './tools/synchronousExample.tool.js';
import { AppRuntimeSession, AuthData, isAppRuntimeSession } from './types.js';
import {
  ANSI_COLORS,
  DEFAULT_PING_OPTIONS,
  DEFAULT_HEALTH_CHECK_OPTIONS,
} from './utils/constants.js';
import { getErrDetails } from './utils/errorUtils.js';

// Le gestionnaire d'authentification reste spécifique à votre application
const authHandler = async (req: IncomingMessage): Promise<AuthData> => {
  const authHdr = req.headers?.authorization;
  const ip =
    ((req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress || 'unknown_ip')
      .split(',')[0]
      .trim();
  const authLog = logger.child({ clientIp: ip, method: req.method, url: req.url });

  if (!authHdr || !authHdr.startsWith('Bearer ')) {
    authLog.warn("⚠️ Sceau d'Autorisation manquant ou malformé. Accès refusé !");
    throw new Response(JSON.stringify({ error: 'Accès Non Autorisé' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const token = authHdr.substring(7);
  if (token !== config.AUTH_TOKEN) {
    authLog.warn('❌ Jeton invalide fourni. Intrusion détectée !');
    throw new Response(JSON.stringify({ error: 'Jeton invalide' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const applicationAuthId = randomUUID();
  const authData: AuthData = {
    id: applicationAuthId,
    type: 'Bearer',
    authenticatedAt: Date.now(),
    clientIp: ip,
  };
  authLog.info({ appAuthId: applicationAuthId }, '✅ Authentification réussie.');
  return authData;
};

async function applicationEntryPoint() {
  logger.info(
    `🔥 Démarrage du Grimoire du Serveur dans le mode ${ANSI_COLORS.YELLOW}${config.NODE_ENV}${ANSI_COLORS.RESET} de l'Ère Draconique...`
  );

  // Création de l'instance FastMCP avec les options, y compris l'authentification
  const server = new FastMCP<AuthData>({
    name: 'FastMCP-Server-V3-Aligned',
    version: '3.0.0',
    authenticate: authHandler, // Le gestionnaire d'authentification est passé ici
    instructions: `Portail Draconique Asynchrone Aligné.
Authentification Bearer requise.
Outils disponibles : ${longProcessTool.name}, ${debugContextTool.name}, ${synchronousExampleTool.name}.`,
    health: {
      enabled: DEFAULT_HEALTH_CHECK_OPTIONS.enabled,
      path: config.HEALTH_CHECK_PATH,
    },
    ping: {
      enabled: DEFAULT_PING_OPTIONS.enabled,
      intervalMs: DEFAULT_PING_OPTIONS.intervalMs,
      logLevel: DEFAULT_PING_OPTIONS.logLevel as LoggingLevel,
    },
    roots: {
      enabled: false, // Désactivé pour la simplicité et éviter les erreurs de timeout
    },
  });

  // Ajout des outils directement à l'instance
  server.addTool(debugContextTool as Tool<AuthData, typeof debugContextParams>);
  server.addTool(longProcessTool as Tool<AuthData, typeof longProcessParams>);
  server.addTool(synchronousExampleTool as Tool<AuthData, typeof synchronousExampleParams>);
  logger.info('✅ Les Outils Anciens sont enregistrés dans le grimoire.');

  // Gestion des événements de connexion et de déconnexion
  server.on('connect', (event) => {
    // CORRECTION : La propriété `auth` n'est pas publique sur la session.
    // On logue donc un message générique. L'ID de session sera disponible
    // dans les logs des appels d'outils spécifiques.
    logger.info(`🚪 Une nouvelle âme s'est connectée au Nexus.`);
  });

  server.on('disconnect', (event) => {
    // CORRECTION : Idem pour la déconnexion.
    logger.info(`💔 Une âme a quitté le Nexus.`);
  });

  // Démarrage du serveur avec le transport HTTP
  try {
    await server.start({
      transportType: 'httpStream',
      httpStream: {
        port: config.PORT,
      },
    });
    logger.info(
      `🚀 Gardien FastMCP éveillé. Le portail est ouvert sur le port ${config.PORT}.`
    );
  } catch (error) {
    const errorDetails = getErrDetails(error);
    logger.fatal(
      { err: errorDetails, startupPhase: 'applicationEntryPoint' },
      `💀 Échec critique au démarrage du Royaume.`
    );
    process.exit(1);
  }

  // Gestionnaires pour un arrêt propre et la robustesse
  const shutdown = async (signal: string) => {
    logger.warn(`🌙 Reçu signal ${signal}. Initiation du Rituel du Crépuscule...`);
    try {
      await server.stop();
      logger.info("✅ Le Gardien du Serveur FastMCP s'est arrêté.");
    } catch (e: unknown) {
      logger.error({ err: getErrDetails(e) }, "❌ Erreur lors de l'arrêt du Gardien FastMCP.");
    } finally {
      logger.info('🌌 Rituel du Crépuscule terminé.');
      process.exit(0);
    }
  };

  ['SIGINT', 'SIGTERM'].forEach((s) => process.on(s, () => shutdown(s)));

  process.on('uncaughtException', (err, origin) => {
    logger.fatal(
      { err: getErrDetails(err), origin },
      `🚨 EXCEPTION NON CAPTURÉE. Forçage du Rituel du Crépuscule !`
    );
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.error(
      { reason: getErrDetails(reason) },
      '💔 REJET DE PROMESSE NON GÉRÉ.'
    );
  });
}

// Lancement de l'application
applicationEntryPoint().catch((err) => {
  logger.fatal({ err: getErrDetails(err) }, '💀 Erreur fatale non interceptée.');
  process.exit(1);
});
