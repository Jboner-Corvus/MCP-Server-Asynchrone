import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FastMCP } from 'fastmcp';
import { config } from './config';
import logger from './logger';
import { debugContextTool } from './tools/debugContext.tool';
import { longProcessTool } from './tools/longProcess.tool';
import { synchronousExampleTool } from './tools/synchronousExample.tool';
import { applicationEntryPoint, authHandler } from './server'; // Import both
import { initQueues } from './queue'; // Import initQueues directly
import { mockProcessOnHandlers } from '../vitest.setup'; // Import from global setup

// Mock external and internal dependencies
vi.mock('fastmcp');
vi.mock('./config.js');
vi.mock('./logger.js');
vi.mock('./tools/debugContext.tool.js');
vi.mock('./tools/longProcess.tool.js');
vi.mock('./tools/synchronousExample.tool.js');

// Declare queueModule at the top level
let queueModule: any; 

// Mock queue.js at the top level
vi.mock('./queue.js', async (importOriginal) => {
  queueModule = await importOriginal();
  return {
    ...queueModule,
    initQueues: vi.fn(() => ({
      taskQueue: { name: 'mock-task-queue', defaultJobOptions: { attempts: 3 } } as any,
      deadLetterQueue: { name: 'mock-dead-letter-queue', add: vi.fn() } as any,
      redisConnection: { host: 'mock-redis', port: 1234 } as any,
    })), // Mock initQueues specifically
  };
});

// Mock crypto.randomUUID
vi.mock('crypto', () => ({
  randomUUID: vi.fn(() => 'mock-uuid'),
}));

describe('Server Initialization and Auth', () => {
  let mockLoggerChild: any;
  let mockFastMCPInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock implementations
    vi.mocked(initQueues).mockReturnValue({
      taskQueue: { name: 'mock-task-queue', defaultJobOptions: { attempts: 3 } } as any,
      deadLetterQueue: { name: 'mock-dead-letter-queue', add: vi.fn() } as any,
      redisConnection: { host: 'mock-redis', port: 1234 } as any,
    });

    mockFastMCPInstance = {
      on: vi.fn(),
      addTool: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
    vi.mocked(FastMCP).mockImplementation(() => mockFastMCPInstance);

    // Mock logger.child to return an object with info, warn, error methods
    mockLoggerChild = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      fatal: vi.fn(),
      child: vi.fn(() => ({
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        fatal: vi.fn(),
      })),
    };
    vi.mocked(logger).child.mockReturnValue(mockLoggerChild);
    vi.mocked(logger).info.mockImplementation(mockLoggerChild.info);
    vi.mocked(logger).warn.mockImplementation(mockLoggerChild.warn);
    vi.mocked(logger).error.mockImplementation(mockLoggerChild.error);
    vi.mocked(logger).fatal.mockImplementation(mockLoggerChild.fatal);

    // Mock config values
    vi.mocked(config).AUTH_TOKEN = 'test-token';
    vi.mocked(config).PORT = 3000;
    vi.mocked(config).HEALTH_CHECK_PATH = '/health';
    vi.mocked(config).NODE_ENV = 'test';

    // Mock tools
    vi.mocked(debugContextTool).name = 'debugContextTool';
    vi.mocked(longProcessTool).name = 'longProcessTool';
    vi.mocked(synchronousExampleTool).name = 'synchronousExampleTool';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules(); // Reset modules to ensure fresh imports for each test
  });

  describe('authHandler', () => {
    const mockRequest = (authHeader?: string, remoteAddress?: string) => ({
      headers: { authorization: authHeader },
      socket: { remoteAddress },
    });

    it('should authenticate successfully with a valid token', async () => {
      await applicationEntryPoint(); // Call applicationEntryPoint to ensure authHandler is initialized

      const req = mockRequest('Bearer test-token', '127.0.0.1');
      // Manually call the authHandler that was passed to FastMCP
      const authData = await authHandler(req as any);

      expect(authData).toEqual({
        id: 'mock-uuid',
        type: 'Bearer',
        authenticatedAt: expect.any(Number),
        clientIp: '127.0.0.1',
      });
      expect(mockLoggerChild.child).toHaveBeenCalledWith(expect.objectContaining({ clientIp: '127.0.0.1', op: 'auth' }));
      expect(mockLoggerChild.child().info).toHaveBeenCalledWith(expect.objectContaining({ authId: 'mock-uuid' }), 'Authentification réussie.');
    });

    it('should throw 401 for missing Authorization header', async () => {
      await applicationEntryPoint();

      const req = mockRequest(undefined, '127.0.0.1');

      await expect(authHandler(req as any)).rejects.toThrow('Accès non autorisé');
      expect(mockLoggerChild.child().warn).toHaveBeenCalledWith("Tentative d'accès non autorisé: en-tête 'Authorization' manquant ou invalide.");
    });

    it('should throw 401 for invalid token', async () => {
      await applicationEntryPoint();

      const req = mockRequest('Bearer wrong-token', '127.0.0.1');

      await expect(authHandler(req as any)).rejects.toThrow('Jeton invalide');
      expect(mockLoggerChild.child().warn).toHaveBeenCalledWith("Tentative d'accès non autorisé: Jeton invalide.");
    });
  });

  describe('applicationEntryPoint', () => {
    it('should start the FastMCP server successfully', async () => {
      await applicationEntryPoint();

      expect(FastMCP).toHaveBeenCalledWith(expect.objectContaining({
        name: 'MCP-Server-Production',
        version: '2.0.0',
        authenticate: expect.any(Function),
        instructions: expect.any(String),
        health: { enabled: true, path: '/health', message: 'Server is healthy and ready.' },
        ping: { enabled: true, intervalMs: 15000, logLevel: 'info' },
        roots: { enabled: false },
      }));
      expect(mockFastMCPInstance.addTool).toHaveBeenCalledTimes(3);
      expect(mockFastMCPInstance.addTool).toHaveBeenCalledWith(debugContextTool);
      expect(mockFastMCPInstance.addTool).toHaveBeenCalledWith(longProcessTool);
      expect(mockFastMCPInstance.addTool).toHaveBeenCalledWith(synchronousExampleTool);
      expect(mockFastMCPInstance.start).toHaveBeenCalledWith(expect.objectContaining({
        transportType: 'httpStream',
        httpStream: { port: 3000, endpoint: '/mcp' },
      }));
      expect(mockLoggerChild.info).toHaveBeenCalledWith(expect.stringContaining('Démarrage du serveur en mode'));
      expect(mockLoggerChild.info).toHaveBeenCalledWith(expect.objectContaining({ tools: ['debugContextTool', 'longProcessTool', 'synchronousExampleTool'] }), 'Outils enregistrés avec succès.');
      expect(mockLoggerChild.info).toHaveBeenCalledWith(expect.stringContaining('🚀 Serveur FastMCP démarré et à l\'écoute sur http://localhost:3000/mcp'));
    });

    it('should handle server startup failure', async () => {
      const mockError = new Error('Port in use');
      mockFastMCPInstance.start.mockRejectedValue(mockError);

      await expect(applicationEntryPoint()).rejects.toThrow("process.exit");
      expect(mockLoggerChild.fatal).toHaveBeenCalledWith(expect.objectContaining({ err: expect.any(Object) }), 'Échec critique lors du démarrage du serveur.');
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should handle connect and disconnect events', async () => {
      await applicationEntryPoint();

      const connectHandler = mockFastMCPInstance.on.mock.calls.find((call: any) => call[0] === 'connect')[1];
      const disconnectHandler = mockFastMCPInstance.on.mock.calls.find((call: any) => call[0] === 'disconnect')[1];

      // Simulate connect event
      connectHandler({ session: { id: 'session-123' } });
      expect(mockLoggerChild.info).toHaveBeenCalledWith('Nouvelle session client établie.');

      // Simulate disconnect event
      disconnectHandler({ session: { id: 'session-123' }, reason: 'client closed' });
      expect(mockLoggerChild.warn).toHaveBeenCalledWith(expect.objectContaining({ reason: 'client closed' }), 'Session client déconnectée.');
    });

    it('should handle graceful shutdown (SIGTERM)', async () => {
      await applicationEntryPoint();

      mockFastMCPInstance.stop.mockResolvedValue(undefined);

      const sigtermHandler = mockProcessOnHandlers['SIGTERM'];
      await expect(sigtermHandler()).rejects.toThrow("process.exit");

      expect(mockLoggerChild.warn).toHaveBeenCalledWith('Signal SIGTERM reçu. Arrêt propre du serveur...');
      expect(mockFastMCPInstance.stop).toHaveBeenCalled();
      expect(mockLoggerChild.info).toHaveBeenCalledWith('Serveur FastMCP arrêté avec succès.');
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('should handle graceful shutdown (SIGINT)', async () => {
      await applicationEntryPoint();

      mockFastMCPInstance.stop.mockResolvedValue(undefined);

      const sigintHandler = mockProcessOnHandlers['SIGINT'];
      await expect(sigintHandler()).rejects.toThrow("process.exit");

      expect(mockLoggerChild.warn).toHaveBeenCalledWith('Signal SIGINT reçu. Arrêt propre du serveur...');
      expect(mockFastMCPInstance.stop).toHaveBeenCalled();
      expect(mockLoggerChild.info).toHaveBeenCalledWith('Serveur FastMCP arrêté avec succès.');
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('should handle graceful shutdown errors', async () => {
      await applicationEntryPoint();

      const mockError = new Error('Stop failed');
      mockFastMCPInstance.stop.mockRejectedValue(mockError);

      const sigtermHandler = mockProcessOnHandlers['SIGTERM'];
      await expect(sigtermHandler()).rejects.toThrow("process.exit");

      expect(mockLoggerChild.warn).toHaveBeenCalledWith('Signal SIGTERM reçu. Arrêt propre du serveur...');
      expect(mockFastMCPInstance.stop).toHaveBeenCalled();
      expect(mockLoggerChild.error).toHaveBeenCalledWith(expect.objectContaining({ err: expect.any(Object) }), "Erreur lors de l'arrêt du serveur.");
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('should handle uncaught exceptions', async () => {
      await applicationEntryPoint();

      const mockError = new Error('Uncaught exception');
      
      // Simulate uncaughtException
      mockProcessOnHandlers['uncaughtException'](mockError, 'uncaughtException');

      expect(mockLoggerChild.fatal).toHaveBeenCalledWith(expect.objectContaining({ err: expect.any(Object), origin: 'uncaughtException' }), 'EXCEPTION NON CAPTURÉE. Arrêt forcé.');
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should handle unhandled rejections', async () => {
      await applicationEntryPoint();

      const mockReason = new Error('Unhandled rejection');
      
      // Simulate unhandledRejection
      mockProcessOnHandlers['unhandledRejection'](mockReason, Promise.resolve());

      expect(mockLoggerChild.error).toHaveBeenCalledWith(expect.objectContaining({ reason: expect.any(Object) }), 'REJET DE PROMESSE NON GÉRÉ.');
    });
  });
});