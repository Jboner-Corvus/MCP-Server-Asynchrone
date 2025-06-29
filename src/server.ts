// src/server.ts

import http from "http";
import { randomUUID } from "crypto";
import { FastMCP, UserError, type Context } from "fastmcp";
import { z } from "zod";

import { config } from "./config.js";
import logger from "./logger.js";
import { taskQueue, type AsyncTaskPayload } from "./queue.js"; // Correction du nom du type
import { synchronousExampleTool } from "./tools/synchronousExample.tool.js"; // Correction du chemin
import { longProcessTool, type LongProcessParamsType } from "./tools/longProcess.tool.js"; // Correction du chemin
import type { SessionData } from "./types.js"; // Import depuis le nouveau fichier

const authenticate = async (req: http.IncomingMessage): Promise<SessionData> => {
    const authHeader = req.headers["authorization"];
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;

    if (token !== config.AUTH_TOKEN) {
        throw new Response("Unauthorized", { status: 401 });
    }

    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';

    return {
        userId: `user-${randomUUID()}`,
        clientIp,
        authenticatedAt: new Date(),
    };
};

const server = new FastMCP<SessionData>({
    name: "MCP-Server-Architecture-Complete",
    version: "2.0.0",
    authenticate,
});

server.addTool(synchronousExampleTool);

server.addTool({
    ...longProcessTool,
    execute: async (args: LongProcessParamsType, context: Context<SessionData>) => {
        if (!context.session) {
            throw new UserError("Session d'authentification invalide.");
        }
        const taskId = randomUUID();
        const jobPayload: AsyncTaskPayload<LongProcessParamsType> = {
            params: args,
            auth: context.session,
            taskId,
        };
        await taskQueue.add("long-process", jobPayload, { jobId: taskId });
        return `La tâche longue a été mise en file d'attente avec l'ID: ${taskId}.`;
    },
});

server.on("connect", ({ session }) => {
    // Correction : Accéder aux données de la session que NOUS avons définies.
    logger.info({ userId: session.auth?.userId, clientIp: session.auth?.clientIp }, "Client connecté.");
});

server.on("disconnect", ({ session }) => {
    logger.info({ userId: session.auth?.userId }, "Client déconnecté.");
});

await server.start({
    transportType: "httpStream",
    // Correction : Utilisation de la configuration plate.
    httpStream: { port: config.PORT, endpoint: "/mcp" },
});

logger.info(`🚀 Serveur démarré et écoute sur http://localhost:${config.PORT}/mcp`);