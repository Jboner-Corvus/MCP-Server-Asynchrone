// src/fastmcpProvider.ts
import path from 'path';
import { fileURLToPath } from 'url';

import { config } from './config.js';
import logger from './logger.js';
import { getErrDetails } from './utils/errorUtils.js';

import type { FastMCP as FastMCPClassType, UserError as UserErrorClassType } from 'fastmcp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface FastMCPModuleType {
  FastMCP: typeof FastMCPClassType;
  UserError: typeof UserErrorClassType;
}

let loadedModule: FastMCPModuleType;

export async function initializeFastMCP(): Promise<FastMCPModuleType> {
  if (loadedModule) {
    logger.debug("[FastMCP Provider] Module FastMCP déjà chargé. Retour de l'instance existante.");
    return loadedModule;
  }

  const source = config.FASTMCP_SOURCE;
  let modulePathOrName: string;
  let sourceDescription: string;

  if (source === 'local') {
    // Correction: Pointer vers FastMCP.js au lieu de index.js
    modulePathOrName = path.resolve(__dirname, '../libs/fastmcp-local/dist/FastMCP.js');
    sourceDescription = `LOCALE depuis ${modulePathOrName}`;
  } else {
    modulePathOrName = 'fastmcp'; // Nom du package npm
    sourceDescription = `DISTANTE (npm: ${modulePathOrName}@${config.FASTMCP_REMOTE_VERSION || 'latest'})`; // Utiliser une version de config ou 'latest'
  }

  logger.info(
    `[FastMCP Provider] Initialisation de FastMCP. Source configurée : ${sourceDescription}`
  );

  try {
    // Pour les chemins locaux, s'assurer qu'ils sont correctement formatés pour l'importation dynamique.
    // Les modules ESM locaux nécessitent le préfixe 'file://'.
    const moduleToImport = source === 'local' ? `file://${modulePathOrName}` : modulePathOrName;

    logger.info(`[FastMCP Provider] Tentative d'importation du module depuis : ${moduleToImport}`);
    const importedModule: unknown = await import(moduleToImport);
    logger.info(
      `[FastMCP Provider] Module FastMCP chargé avec succès depuis la source ${sourceDescription}.`
    );
    loadedModule = importedModule as FastMCPModuleType;

    // Vérification que les exportations attendues sont présentes
    if (
      !loadedModule ||
      typeof loadedModule.FastMCP !== 'function' ||
      typeof loadedModule.UserError !== 'function'
    ) {
      const missingComponents: string[] = [];
      if (!loadedModule) missingComponents.push('le module lui-même');
      if (!(loadedModule && typeof loadedModule.FastMCP === 'function'))
        missingComponents.push("l'exportation FastMCP (constructeur)");
      if (!(loadedModule && typeof loadedModule.UserError === 'function'))
        missingComponents.push("l'exportation UserError (classe)");

      const errorMessageText = `[FastMCP Provider] Des exportations critiques sont manquantes ou mal typées dans le module FastMCP chargé depuis ${sourceDescription} : ${missingComponents.join(', ')}.`;
      logger.error(errorMessageText);
      throw new Error(errorMessageText);
    }
    logger.info(
      `[FastMCP Provider] Les exportations FastMCP et UserError ont été validées pour la source ${sourceDescription}.`
    );
    return loadedModule;
  } catch (err: unknown) {
    const errorDetails = getErrDetails(err);
    logger.error(
      {
        err: errorDetails,
        source,
        pathAttempt: modulePathOrName, // Chemin résolu avant l'ajout de file://
        importAttempt: source === 'local' ? `file://${modulePathOrName}` : modulePathOrName,
      },
      `[FastMCP Provider] Échec critique du chargement du module FastMCP depuis ${sourceDescription}.`
    );
    // Relancer l'erreur pour arrêter le processus si le module est indispensable
    throw new Error(
      `[FastMCP Provider] Échec du chargement du module FastMCP depuis ${sourceDescription} (tentative: ${modulePathOrName}): ${errorDetails.message}`
    );
  }
}

export function getInitializedFastMCP(): FastMCPModuleType {
  if (!loadedModule) {
    const criticalErrorMsg =
      "[FastMCP Provider] Le module FastMCP n'a pas été initialisé. Appelez initializeFastMCP() au démarrage de l'application.";
    logger.fatal(criticalErrorMsg);
    // Cette erreur est critique, donc on lance une exception pour arrêter l'application.
    throw new Error(criticalErrorMsg);
  }
  return loadedModule;
}
