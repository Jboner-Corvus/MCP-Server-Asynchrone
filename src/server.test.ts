/// <reference types="vitest/globals" />

/// <reference types="vitest/globals" />

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { IncomingMessage } from 'http';

// Mock logger at the very top
vi.mock('./logger.js');

import { FastMCP } from 'fastmcp';
// CORRECTION : Ajout de l'extension .js
import { config } from './config.js';
import { applicationEntryPoint, authHandler } from './server.js';
import logger from './logger.js';
import type { AuthData } from './types.js';

const loggerMock = vi.mocked(logger, true);

// Mock other dependencies
vi.mock('fastmcp');
// CORRECTION : Ajout de l'extension .js
vi.mock('./config.js');
vi.mock('./tools/debugContext.tool.js');
vi.mock('./tools/longProcess.tool.js');
vi.mock('./tools/synchronousExample.tool.js');
vi.mock('./queue.js', () => ({
  initQueues: vi.fn(() => ({
    taskQueue: { name: 'mock-task-queue' },
    deadLetterQueue: { name: 'mock-dead-letter-queue' },
    redisConnection: { host: 'mock-redis' },
  })),
}));

vi.mock('crypto', async (importOriginal) => {
  const actual = (await importOriginal()) as object;
  return {
    ...actual,
    randomUUID: vi.fn(() => 'mock-uuid'),
  };
});

describe('Server Tests', () => {
  let mockFastMCPInstance: {
    on: ReturnType<typeof vi.fn>;
    addTool: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
  };
  let sigtermHandler: (() => Promise<void>) | undefined;

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(process, 'on').mockImplementation(
      (event: string | symbol, handler: (...args: unknown[]) => void): NodeJS.Process => {
        if (event === 'SIGTERM') {
          sigtermHandler = handler as () => Promise<void>;
        }
        return process;
      }
    );

    vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as (code?: string | number | null | undefined) => never);

    const mockChildLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      fatal: vi.fn(),
      child: vi.fn(),
    };
    loggerMock.child.mockReturnValue(mockChildLogger as unknown as ReturnType<typeof logger.child>);
    loggerMock.info.mockImplementation(mockChildLogger.info);
    loggerMock.warn.mockImplementation(mockChildLogger.warn);
    loggerMock.fatal.mockImplementation(mockChildLogger.fatal);

    sigtermHandler = undefined;

    mockFastMCPInstance = {
      on: vi.fn(),
      addTool: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };

    vi.mocked(FastMCP).mockImplementation(
      () => mockFastMCPInstance as unknown as FastMCP<AuthData>
    );

    vi.mocked(config).AUTH_TOKEN = 'test-token';
    vi.mocked(config).PORT = 3000;
    vi.mocked(config).HEALTH_CHECK_PATH = '/health';
    vi.mocked(config).NODE_ENV = 'test';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  describe('authHandler', () => {
    it('should authenticate successfully', async () => {
      const req = {
        headers: { authorization: 'Bearer test-token' },
        socket: { remoteAddress: '127.0.0.1' },
      };
      const authData = await authHandler(req as IncomingMessage);
      expect(authData).toBeDefined();

      expect(loggerMock.child({}).info).toHaveBeenCalledWith(
        { authId: 'mock-uuid' },
        'Authentification réussie.'
      );
    });

    it('should fail for missing auth header', async () => {
      const req = { headers: {}, socket: { remoteAddress: '127.0.0.1' } };
      await expect(authHandler(req as IncomingMessage)).rejects.toThrow('Accès non autorisé');

      expect(loggerMock.child({}).warn).toHaveBeenCalledWith(
        { clientIp: '127.0.0.1' },
        "Tentative d'accès non autorisé: en-tête 'Authorization' manquant ou invalide."
      );
    });
  });

  describe('applicationEntryPoint', () => {
    it('should start the server', async () => {
      await applicationEntryPoint();
      expect(mockFastMCPInstance.start).toHaveBeenCalled();
    });

    it('should handle startup failure', async () => {
      mockFastMCPInstance.start.mockRejectedValue(new Error('Startup failed'));
      await expect(applicationEntryPoint()).rejects.toThrow('process.exit called');
      expect(loggerMock.fatal).toHaveBeenCalled();
    });

    it('should handle SIGTERM', async () => {
      await applicationEntryPoint();

      expect(sigtermHandler).toBeDefined();
      if (!sigtermHandler) throw new Error('sigtermHandler not defined');

      mockFastMCPInstance.stop.mockResolvedValue(undefined);

      await expect(sigtermHandler()).rejects.toThrow('process.exit called');

      expect(mockFastMCPInstance.stop).toHaveBeenCalled();
    });
  });
});
