// src/server.ts (Version Finale Définitive)

import { FastMCP } from 'fastmcp';
import type { IncomingMessage } from 'http';
import { randomUUID } from 'crypto';

import logger from './logger.js';
import { config } from './config.js';
import type { SessionData } from './types.js';
import { debugContextTool } from './tools/debugContext.tool.js';
import { longProcessTool } from './tools/longProcess.tool.js';
import { synchronousExampleTool } from './tools/synchronousExample.tool.js';

// Cette fonction est appelée pour chaque nouvelle connexion et garantit
// qu'une session (authentifiée ou invitée) est toujours créée.
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

const server = new FastMCP<SessionData>({
  name: 'MCP-Serveur',
  version: '1.0.0',
  authenticate: authenticate,
});

logger.info('Registering tools...');
server.addTool(debugContextTool);
server.addTool(longProcessTool);
server.addTool(synchronousExampleTool);
logger.info('Tools registered.');

const port = 8080;

server.start({
  transportType: 'httpStream',
  httpStream: {
    port: port,
    endpoint: '/mcp',
  },
});

logger.info(`Server started in httpStream mode on port ${port}`);
