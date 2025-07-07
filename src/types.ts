// --- src/types.ts (Corrigé et Isolé) ---
import { IncomingMessage } from 'http';
import { Socket } from 'net';
import {
  FastMCPSession as BaseFastMCPSession,
  Context as ToolContext,
  Tool as FastMCPTool,
} from 'fastmcp';
import { z } from 'zod';

export interface FastMCPSessionAuth extends Record<string, unknown> {
  '~standard'?: unknown;
}

/**
 * Données d'authentification personnalisées.
 */
export interface AuthData extends FastMCPSessionAuth {
  id: string;
  type: string;
  authenticatedAt: number;
  clientIp: string;
}

/**
 * Représente l'objet de session complet de FastMCP, potentiellement enrichi avec notre AuthData.
 */
export interface AppRuntimeSession extends BaseFastMCPSession<AuthData> {
  frameworkSessionId: string;
  request: IncomingMessage;
  sendEvent: (event: string, data: unknown, id?: string) => void;
  closeConnection: (reason?: string) => void;
  auth?: AuthData;
}

/**
 * Type guard pour vérifier si un objet est une instance valide de AppRuntimeSession.
 */
export function isAppRuntimeSession(session: unknown): session is AppRuntimeSession {
  if (!session || typeof session !== 'object') return false;
  const s = session as Record<string, unknown>;

  const hasCoreProperties =
    typeof s.frameworkSessionId === 'string' &&
    s.request instanceof IncomingMessage &&
    typeof s.sendEvent === 'function' &&
    typeof s.closeConnection === 'function' &&
    (s.request.socket === null ||
      s.request.socket === undefined ||
      (typeof Socket !== 'undefined' && s.request.socket instanceof Socket));
  if (!hasCoreProperties) return false;

  if (s.auth !== undefined) {
    if (s.auth === null || typeof s.auth !== 'object') return false;
    const auth = s.auth as Record<string, unknown>;
    return (
      typeof auth.id === 'string' &&
      typeof auth.type === 'string' &&
      typeof auth.authenticatedAt === 'number' &&
      typeof auth.clientIp === 'string'
    );
  }
  return true;
}

// Define the generic types for Tool
export type Tool<T extends FastMCPSessionAuth, Params extends z.ZodTypeAny> = FastMCPTool<
  T,
  Params
>;

export type { ToolContext };

export function zodToStandardSchema<T extends z.ZodTypeAny>(
  zodSchema: T
): {
  '~standard': {
    version: 1;
    vendor: string;
    validate: (
      value: unknown
    ) => { value: z.infer<T>; issues?: undefined } | { issues: { message: string }[] };
    types: { input: z.infer<T>; output: z.infer<T> };
  };
} {
  return {
    '~standard': {
      version: 1,
      vendor: 'zod',
      validate: (value: unknown) => {
        const result = zodSchema.safeParse(value);
        if (result.success) {
          return { value: result.data };
        } else {
          return { issues: result.error.issues.map((issue) => ({ message: issue.message })) };
        }
      },
      types: {
        input: {} as z.infer<T>,
        output: {} as z.infer<T>,
      },
    },
  };
}
