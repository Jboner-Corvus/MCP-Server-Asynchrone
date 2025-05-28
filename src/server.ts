// src/server.ts

import { randomUUID } from 'crypto';
import { IncomingMessage } from 'http';

import type { FastMCPSession, ServerOptions, Tool, LoggingLevel } from 'fastmcp';

import { config } from './config.js';
import { initializeFastMCP, getInitializedFastMCP } from './fastmcpProvider.js';
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

const authHandler = async (req: IncomingMessage): Promise<AuthData> => {
  const authHdr = req.headers?.authorization;
  const ip = (
    (req.headers?.['x-forwarded-for'] as string) ||
    req.socket?.remoteAddress ||
    'unknown_ip'
  )
    .split(',')[0]
    .trim();
  const authLog = logger.child({ clientIp: ip, method: req.method, url: req.url });
  if (!authHdr || !authHdr.startsWith('Bearer ')) {
    authLog.warn("⚠️ Sceau d'Autorisation manquant ou malformé. Accès refusé !");
    throw new Response(
      JSON.stringify({
        error: 'Accès Non Autorisé',
        message: 'Sceau du Porteur (Bearer token) manquant ou malformé.',
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const token = authHdr.substring(7);
  if (token !== config.AUTH_TOKEN) {
    authLog.warn('❌ Jeton invalide fourni. Intrusion détectée !');
    throw new Response(
      JSON.stringify({ error: 'Accès Non Autorisé', message: 'Jeton invalide.' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const applicationAuthId = randomUUID();
  const authData: AuthData = {
    id: applicationAuthId,
    type: 'Bearer',
    authenticatedAt: Date.now(),
    clientIp: ip,
  };
  authLog.info(
    { appAuthId: applicationAuthId },
    "✅ Authentification réussie. Les données d'accès (AuthData) sont prêtes."
  );
  return authData;
};

function getSessLog(sessionParam?: AppRuntimeSession | FastMCPSession<AuthData> | null) {
  if (!sessionParam) {
    return {
      fmcpsSessId: 'N/A_pas_de_session_fournie',
      appAuthId: 'N/A',
      ip: 'N/A',
      authType: 'N/A',
      authAt: 0,
      isAppRuntimeValid: false,
      rawSessionKeys: [],
    };
  }

  let idToLog: string;
  if ('frameworkSessionId' in sessionParam && typeof sessionParam.frameworkSessionId === 'string') {
    idToLog = sessionParam.frameworkSessionId;
  } else if ('id' in sessionParam && typeof sessionParam.id === 'string') {
    idToLog = sessionParam.id;
  } else {
    idToLog = 'N/A_id_manquant';
  }

  let authDataFromSession: AuthData | undefined = undefined;
  if ('auth' in sessionParam && sessionParam.auth) {
    authDataFromSession = sessionParam.auth as AuthData;
  }

  const keys = Object.keys(sessionParam);
  return {
    fmcpsSessId: idToLog,
    appAuthId: authDataFromSession?.id || 'N/A_app_auth_id_non_dispo_sur_session',
    ip: authDataFromSession?.clientIp || 'N/A_ip_non_dispo_sur_session',
    authType: authDataFromSession?.type || 'N/A_auth_type_non_dispo_sur_session',
    authAt: authDataFromSession?.authenticatedAt || 0,
    isAppRuntimeValid: isAppRuntimeSession(sessionParam),
    rawSessionKeys: keys,
  };
}

async function applicationEntryPoint() {
  try {
    await initializeFastMCP();
    const { FastMCP } = getInitializedFastMCP();
    logger.info(
      `🔥 Démarrage du Grimoire du Serveur dans le mode ${ANSI_COLORS.YELLOW}${config.NODE_ENV}${ANSI_COLORS.RESET} de l'Ère Draconique... (FastMCP Source: ${config.FASTMCP_SOURCE})`
    );
    const srvOpts: ServerOptions<AuthData> = {
      name: 'FastMCP-Server-V2-Draconique-Ameliore',
      version: '2.0.0',
      instructions: `Portail Draconique Asynchrone Amélioré.
Authentification Bearer requise.
🛠️ Outils disponibles : ${longProcessTool.name}, ${debugContextTool.name}, ${synchronousExampleTool.name}.
Flux Éthéré HTTP sur ${config.HTTP_STREAM_ENDPOINT}.
Port ${config.PORT}.
(FastMCP Source: ${config.FASTMCP_SOURCE})`,
      authenticate: authHandler,
      health: {
        enabled: DEFAULT_HEALTH_CHECK_OPTIONS.enabled,
        path: config.HEALTH_CHECK_PATH,
        message: DEFAULT_HEALTH_CHECK_OPTIONS.message,
        status: DEFAULT_HEALTH_CHECK_OPTIONS.status,
      },
      ping: {
        enabled: DEFAULT_PING_OPTIONS.enabled,
        intervalMs: DEFAULT_PING_OPTIONS.intervalMs,
        logLevel: DEFAULT_PING_OPTIONS.logLevel as LoggingLevel,
      },
      roots: {
        enabled: false,
      },
    };
    const server = new FastMCP<AuthData>(srvOpts);
    logger.info('✅ Instance du serveur FastMCP créée.');

    server.addTool(debugContextTool as Tool<AuthData, typeof debugContextParams>);
    server.addTool(longProcessTool as Tool<AuthData, typeof longProcessParams>);
    server.addTool(synchronousExampleTool as Tool<AuthData, typeof synchronousExampleParams>);
    logger.info('✅ Les Outils Anciens améliorés sont enregistrés.');
    server.on('connect', (ev: { session: FastMCPSession<AuthData> }) => {
      const details = getSessLog(ev.session as AppRuntimeSession);
      logger.info(
        {
          ev: 'connect',
          fmcpsSessId: details.fmcpsSessId,
          appAuthId: details.appAuthId,
          clientIp: details.ip,
        },
        `🚪 Une nouvelle âme s'est connectée. FastMCPSession ID: ${ANSI_COLORS.GREEN}${details.fmcpsSessId}${ANSI_COLORS.RESET}, AppAuthID (si dispo sur session): ${ANSI_COLORS.GREEN}${details.appAuthId}${ANSI_COLORS.RESET}.`
      );
      if (!details.isAppRuntimeValid && 'auth' in ev.session && ev.session.auth) {
        logger.warn(
          {
            ev: 'connect_session_structure_check',
            fmcpsSessId: details.fmcpsSessId,
            keys: Object.keys(ev.session),
            hasAuthProperty: 'auth' in ev.session && !!ev.session.auth,
          },
          "⚠️ La session connectée a une propriété 'auth', mais n'est pas identifiée comme AppRuntimeSession par isAppRuntimeSession. Vérifiez les types/runtime."
        );
      }
    });

    server.on('disconnect', (ev: { session?: FastMCPSession<AuthData>; reason?: string }) => {
      const details = getSessLog(ev.session as AppRuntimeSession | undefined);
      logger.info(
        {
          ev: 'disconnect',
          fmcpsSessId: details.fmcpsSessId,
          appAuthId: details.appAuthId,
          clientIp: details.ip,
          reason: ev.reason || 'Raison Inconnue',
        },
        `💔 Une âme a quitté le Nexus. FastMCPSession ID: ${ANSI_COLORS.YELLOW}${details.fmcpsSessId}${ANSI_COLORS.RESET}, AppAuthID (si dispo sur session): ${ANSI_COLORS.YELLOW}${details.appAuthId}${ANSI_COLORS.RESET}.`
      );
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    server.on('error' as any, (ev: { error: Error; context?: unknown }) => {
      let sessionDetailsLog: ReturnType<typeof getSessLog> | object = {
        note: 'Contexte non-session ou non identifiable',
      };
      if (ev.context && typeof ev.context === 'object') {
        if (isAppRuntimeSession(ev.context)) {
          sessionDetailsLog = getSessLog(ev.context);
        } else if (
          'id' in ev.context &&
          typeof (ev.context as { id: string }).id === 'string' &&
          'request' in ev.context &&
          !('frameworkSessionId' in ev.context)
        ) {
          sessionDetailsLog = getSessLog(ev.context as unknown as FastMCPSession<AuthData>);
        } else {
          sessionDetailsLog = {
            contextType: (ev.context as object).constructor?.name || typeof ev.context,
            contextKeys: Object.keys(ev.context).join(', '),
            contextIdAttempt:
              ('id' in ev.context ? (ev.context as { id: unknown }).id : undefined) ||
              ('frameworkSessionId' in ev.context
                ? (ev.context as { frameworkSessionId: unknown }).frameworkSessionId
                : undefined) ||
              'N/A',
          };
        }
      }

      logger.error(
        {
          evName: 'fastmcp_error',
          err: getErrDetails(ev.error),
          sessionContext: sessionDetailsLog,
          rawContextProvided: ev.context !== undefined,
        },
        `🚨 Une faille critique a été détectée dans la Forteresse FastMCP ! ${ANSI_COLORS.RED}💀${ANSI_COLORS.RESET}`
      );
    });

    server.on(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      'toolError' as any,
      (ev: { error: Error; toolName: string; session: FastMCPSession<AuthData> }) => {
        const details = getSessLog(ev.session as AppRuntimeSession);
        const { UserError: InitializedUserError } = getInitializedFastMCP();
        if (ev.error instanceof InitializedUserError) {
          logger.warn(
            {
              evName: 'tool_user_error',
              tool: ev.toolName,
              err: getErrDetails(ev.error),
              fmcpsSessId: details.fmcpsSessId,
              appAuthId: details.appAuthId,
              clientIp: details.ip,
            },
            `🚧 Erreur utilisateur attendue de l'Outil Ancien '${ANSI_COLORS.MAGENTA}${ev.toolName}${ANSI_COLORS.RESET}': ${ev.error.message}`
          );
        } else {
          logger.error(
            {
              evName: 'tool_error',
              tool: ev.toolName,
              err: getErrDetails(ev.error),
              fmcpsSessId: details.fmcpsSessId,
              appAuthId: details.appAuthId,
              clientIp: details.ip,
            },
            `🚧 L'exécution de l'Outil Ancien '${ANSI_COLORS.MAGENTA}${ev.toolName}${ANSI_COLORS.RESET}' a échoué.`
          );
        }
      }
    );

    let shuttingDown = false;
    const shutdown = async (signal: string) => {
      if (shuttingDown) {
        logger.warn(`⚠️ Rituel du Crépuscule déjà en cours suite à ${signal}.`);
        return;
      }
      shuttingDown = true;
      logger.warn(`🌙 Reçu signal ${signal}. Initiation du Rituel du Crépuscule...`);
      try {
        await server.stop();
        logger.info("✅ Le Gardien du Serveur FastMCP s'est arrêté.");
      } catch (e: unknown) {
        logger.error({ err: getErrDetails(e) }, "❌ Erreur lors de l'arrêt du Gardien FastMCP.");
      } finally {
        logger.info("🌌 Rituel du Crépuscule terminé. Le Royaume s'endort.");
        process.exit(process.exitCode || 0);
      }
    };

    ['SIGINT', 'SIGTERM'].forEach((s) => process.on(s, () => shutdown(s)));
    process.on('uncaughtException', (err, origin) => {
      logger.fatal(
        { err: getErrDetails(err), origin },
        `🚨 EXCEPTION NON CAPTURÉE. Forçage du Rituel du Crépuscule !`
      );
      process.exitCode = 1;
      if (!shuttingDown) shutdown('uncaughtException').finally(() => process.exit(1));
      else process.exit(1);
    });
    process.on('unhandledRejection', (reason, promise) => {
      logger.error(
        { reason: getErrDetails(reason), promiseDetails: String(promise).substring(0, 100) },
        '💔 REJET DE PROMESSE NON GÉRÉ.'
      );
    });
    await server.start({
      transportType: 'httpStream',
      httpStream: {
        port: config.PORT,
      },
    });
    logger.info(
      `🚀 Gardien FastMCP éveillé. Flux HTTP probable sur port ${config.PORT}. Health Check: ${ANSI_COLORS.CYAN}http://localhost:${config.PORT}${config.HEALTH_CHECK_PATH}${ANSI_COLORS.RESET}. (FastMCP Source: ${config.FASTMCP_SOURCE})`
    );
  } catch (error: unknown) {
    const errorDetails = getErrDetails(error);
    logger.fatal(
      { err: errorDetails, startupPhase: 'applicationEntryPoint' },
      `💀 Échec critique au démarrage du Royaume.`
    );
    if (
      errorDetails.details &&
      typeof errorDetails.details === 'object' &&
      'code' in errorDetails.details &&
      errorDetails.details.code === 'EADDRINUSE'
    ) {
      logger.fatal(`❌ Le Portail ${config.PORT} est déjà occupé.`);
    }
    process.exitCode = 1;
    process.exit(1);
  }
}

applicationEntryPoint().catch((err: unknown) => {
  logger.fatal(
    { err: getErrDetails(err), startupPhase: 'applicationEntryPoint_outerCatch' },
    '💀 Erreur fatale non interceptée lors de applicationEntryPoint().'
  );
  process.exitCode = 1;
  process.exit(1);
});
