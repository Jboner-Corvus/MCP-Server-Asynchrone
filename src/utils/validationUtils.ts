// src/utils/validationUtils.ts

import logger from '../logger.js'; // Pour la journalisation interne si nécessaire

/**
 * Valide si une chaîne de caractères est une URL HTTP/HTTPS valide.
 * @param urlString La chaîne à valider.
 * @param context Un contexte optionnel pour la journalisation (ex: nom de la fonction appelante).
 * @returns `true` si l'URL est valide, `false` sinon.
 */
export function isValidHttpUrl(urlString: string | undefined | null, context?: string): boolean {
  if (!urlString) {
    return false;
  }
  try {
    const url = new URL(urlString);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      if (context) {
        logger.warn(
          { context, url: urlString, reason: 'Protocole non supporté' },
          "Tentative d'utilisation d'une URL avec un protocole non HTTP/HTTPS."
        );
      }
      return false;
    }
    return true;
  } catch (e) {
    if (context) {
      logger.warn(
        { context, url: urlString, error: (e as Error).message },
        "Format d'URL invalide détecté."
      );
    }
    return false;
  }
}
