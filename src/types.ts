// --- src/types.ts (Corrigé et Isolé) ---
import { IncomingMessage } from 'http';
import { FastMCPSession as BaseFastMCPSession } from 'fastmcp';

/**
 * Données d'authentification personnalisées.
 */
export interface AuthData {
  id: string;
  type: string;
  authenticatedAt: number;
  clientIp: string;
  [key: string]: unknown; // Remplacé any par unknown
}

/**
 * Représente l'objet de session complet de FastMCP, potentiellement enrichi avec notre AuthData.
 */
export interface AppRuntimeSession extends BaseFastMCPSession<AuthData> {
  frameworkSessionId: string;
  request: IncomingMessage;
  sendEvent: (event: string, data: unknown, id?: string) => void; // Remplacé any par unknown
  closeConnection: (reason?: string) => void;
  auth?: AuthData;
}

/**
 * Type guard pour vérifier si un objet est une instance valide de AppRuntimeSession.
 */
export function isAppRuntimeSession(session: unknown): session is AppRuntimeSession {
  // Remplacé any par unknown
  if (!session || typeof session !== 'object') return false; // Vérification supplémentaire
  const s = session as Record<string, unknown>; // Cast pour accès sécurisé

  const hasCoreProperties =
    typeof s.frameworkSessionId === 'string' &&
    s.request instanceof IncomingMessage &&
    typeof s.sendEvent === 'function' &&
    typeof s.closeConnection === 'function';
  if (!hasCoreProperties) return false;

  if (s.auth !== undefined) {
    if (s.auth === null || typeof s.auth !== 'object') return false;
    const auth = s.auth as Record<string, unknown>; // Cast pour accès sécurisé
    return (
      typeof auth.id === 'string' &&
      typeof auth.type === 'string' &&
      typeof auth.authenticatedAt === 'number' &&
      typeof auth.clientIp === 'string'
    );
  }
  return true;
}
