// src/types.ts (Corrigé)

/**
 * Définit la structure des données de session personnalisées.
 * C'est cet objet que votre fonction `authenticate` doit retourner.
 * Il sera ensuite accessible dans le contexte de vos outils via `context.session`.
 */
export interface SessionData {
  id: string; // ID unique pour l'utilisateur ou la session
  clientIp: string;
  authenticatedAt: number;
  permissions: Array<"read" | "write">;
  
  // CORRECTION : Ajout d'une signature d'index pour satisfaire la contrainte 'Record<string, unknown>'
  // de la bibliothèque FastMCP. Cela indique que l'objet peut avoir d'autres propriétés.
  [key: string]: unknown;
}