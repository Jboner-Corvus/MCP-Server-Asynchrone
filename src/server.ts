// src/server.ts (Version originale et correcte)

import { FastMCP } from 'fastmcp';
import type { IncomingMessage } from 'http';
import { randomUUID } from 'crypto';

import logger from './logger.js';
import { config } from './config.js';
import type { SessionData } from './types.js';

import { debugContextTool } from './tools/debugContext.tool.js';
import { longProcessTool } from './tools/longProcess.tool.js';
import { synchronousExampleTool } from './tools/synchronousExample.tool.js';

const authenticate = async (request: IncomingMessage): Promise<SessionData> => {
  const clientIp = String(request.headers['x-forwarded-for'] || request.socket.remoteAddress || 'unknown');
  const authorizationHeader = request.headers.authorization;
  const token = authorizationHeader?.startsWith('Bearer ') ? authorizationHeader.substring(7) : null;

  if (token && token === config.AUTH_TOKEN) {
    logger.info({ clientIp }, 'Authentication successful, creating authenticated session.');
    return { id: randomUUID(), clientIp, authenticatedAt: Date.now(), permissions: ['read', 'write'], isAuthenticated: true };
  }

  logger.info({ clientIp }, 'No or invalid token provided, creating guest session.');
  return { id: randomUUID(), clientIp, authenticatedAt: Date.now(), permissions: ['read'], isAuthenticated: false };
};

const server = new FastMCP<SessionData>({
  name: 'MCP-Serveur',
  version: '1.0.0',
  authenticate: authenticate,
});

server.addTool(debugContextTool);
server.addTool(longProcessTool);
server.addTool(synchronousExampleTool);

const port = config.PORT;

server.start({
  transportType: 'httpStream',
  httpStream: { port: port, endpoint: '/mcp' },
});

logger.info(`Server started in httpStream mode on port ${port}`);