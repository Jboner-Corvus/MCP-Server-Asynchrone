/**
 * @file Point d'entrée principal du serveur MCP-Serveur.
 * Ce fichier est responsable de l'initialisation du serveur FastMCP, de la configuration
 * de l'authentification, de l'enregistrement des outils disponibles et du démarrage
 * du transport HTTP Stream.
 * @version 1.1.0
 */

// --- Imports ---
import { FastMCP } from 'fastmcp';
import type { IncomingMessage } from 'http';
import { randomUUID } from 'crypto';

import logger from './logger.js';
import { config } from './config.js';
import type { SessionData } from './types.js';

import { debugContextTool } from './tools/debugContext.tool.js';
import { longProcessTool } from './tools/longProcess.tool.js';
import { synchronousExampleTool } from './tools/synchronousExample.tool.js';

/**
 * Gère l'authentification pour chaque nouvelle connexion au serveur.
 * Valide le Bearer Token et crée une session authentifiée ou une session invité.
 * @param {IncomingMessage} request - L'objet de la requête HTTP entrante.
 * @returns {Promise<SessionData>} Une promesse qui se résout avec les données de session de l'utilisateur.
 */
const authenticate = async (request: IncomingMessage): Promise<SessionData> => {
  const clientIp = String(
    request.headers['x-forwarded-for'] || request.socket.remoteAddress || 'unknown'
  );

  const authorizationHeader = request.headers.authorization;
  const token = authorizationHeader?.startsWith('Bearer ')
    ? authorizationHeader.substring(7)
    : null;

  if (token && token === config.AUTH_TOKEN) {
    logger.info({ clientIp }, 'Authentication successful, creating authenticated session.');
    return {
      id: randomUUID(),
      clientIp,
      authenticatedAt: Date.now(),
      permissions: ['read', 'write'],
      isAuthenticated: true,
    };
  }

  if (token) {
    logger.warn({ clientIp }, 'Invalid token provided, creating guest session.');
  } else {
    logger.info({ clientIp }, 'No token provided, creating guest session.');
  }

  return {
    id: randomUUID(),
    clientIp,
    authenticatedAt: Date.now(),
    permissions: ['read'],
    isAuthenticated: false,
  };
};

// --- Initialisation du Serveur ---
logger.info('Initializing FastMCP server...');

/**
 * Instance principale du serveur FastMCP.
 * Note: La gestion du CORS est déléguée au reverse proxy Nginx.
 */
const server = new FastMCP<SessionData>({
  name: 'MCP-Serveur',
  version: '1.0.0',
  authenticate: authenticate,
});

// --- Enregistrement des Outils ---
logger.info('Registering tools...');
server.addTool(debugContextTool);
server.addTool(longProcessTool);
server.addTool(synchronousExampleTool);
logger.info('Tools registered.');

// --- Démarrage du Serveur ---
const port = config.PORT;

server.start({
  transportType: 'httpStream',
  httpStream: {
    port: port,
    endpoint: '/mcp',
  },
});

logger.info(`Server started in httpStream mode on port ${port}`);
