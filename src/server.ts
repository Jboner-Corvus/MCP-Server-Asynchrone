// src/server.ts (Version Corrigée - Erreurs de Type)

import { FastMCP } from 'fastmcp';
import type { SessionData } from './types.js';
import { debugContextTool } from './tools/debugContext.tool.js';
import { longProcessTool } from './tools/longProcess.tool.js';
import { synchronousExampleTool } from './tools/synchronousExample.tool.js';

const server = new FastMCP<SessionData>({
  name: 'MCP-Serveur',
  version: '1.0.0',
  instructions: 'Serveur modulaire pour opérations synchrones et asynchrones.',

  authenticate: async (request): Promise<SessionData> => {
    console.log("===== Tentative d'authentification =====", {
      headers: request.headers,
    });
    const apiKey = request.headers['x-api-key'];

    if (apiKey === 'user_key' || apiKey === 'admin_key') {
      const isAdmin = apiKey === 'admin_key';
      console.log(`Authentification réussie pour : ${apiKey}`);
      return {
        id: `session_${Date.now()}`,
        userId: apiKey,
        permissions: isAdmin ? ['read', 'write'] : ['read'],
        clientIp: request.headers['x-forwarded-for']?.toString() || 'unknown',
        authenticatedAt: Date.now(),
      };
    }

    console.warn("Échec de l'authentification, création d'une session non authentifiée.");
    throw new Error('Unauthorized');
  },
  health: { enabled: true },
});

// Enregistrement de tous les outils disponibles pour le serveur
console.log('Enregistrement des outils...');
server.addTool(debugContextTool);
server.addTool(longProcessTool);
server.addTool(synchronousExampleTool);
console.log('Outils enregistrés.');

// Démarrage du serveur
const transportType = process.argv.includes('--http-stream') ? 'httpStream' : 'stdio';
server.start({
  transportType: transportType,
  httpStream: {
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : 8080,
    endpoint: '/mcp',
  },
});

console.log(`Serveur MCP démarré en mode ${transportType} sur le port ${process.env.PORT || 8080}`);
