<div align="center">
  <img src="https://placehold.co/600x200/1a202c/ffffff?text=🚀%20FastMCP%2B%2B%20Server%20🚀&font=montserrat" alt="Bannière FastMCP++ Server">
  <h1><font color="#2ECC71">FastMCP++ Server</font></h1>
  <p><strong>Un serveur modulaire et extensible pour opérations synchrones et asynchrones.</strong></p>
  <p>Propulsé par Docker, BullMQ, Redis et FastMCP.</p>
  <p>
    <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker">
    <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js">
    <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
    <img src="https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis">
    <img src="https://img.shields.io/badge/pnpm-F69220?style=for-the-badge&logo=pnpm&logoColor=white" alt="pnpm">
  </p>
</div>

---

## 📜 <font color="#3498DB">Table des Matières</font>

- [🌟 Introduction](#-introduction)
- [📋 Prérequis](#-prérequis)
- [🚀 Installation & Configuration Initiale](#-installation--configuration-initiale)
- [⚙️ Exécution et Gestion du Serveur](#️-exécution-et-gestion-du-serveur)
- [✨ Extensibilité : Ajout de Nouveaux Outils](#-extensibilité--ajout-de-nouveaux-outils)
  - [⚡ Ajout d'un Outil Asynchrone](#-ajout-dun-outil-asynchrone)
  - [💡 Ajout d'un Outil Synchrone](#-ajout-dun-outil-synchrone)
- [🛠️ Capacités du Worker Asynchrone](#️-capacités-du-worker-asynchrone)
- [🔧 Développement & Configuration Avancée](#-développement--configuration-avancée)
- [🤝 Contribution](#-contribution)

---

## 🌟 <font color="#3498DB">Introduction</font>

**FastMCP++** est une solution serveur robuste, conçue pour la performance et la modularité. Elle permet de gérer avec élégance des tâches complexes, qu'elles soient immédiates (synchrones) ou de longue durée (asynchrones), grâce à une architecture découplée s'appuyant sur :

-   **FastMCP** : Pour un traitement efficace des requêtes et une gestion de session.
-   **Docker & Docker Compose** : Pour une conteneurisation fiable et un déploiement simplifié.
-   **BullMQ & Redis** : Pour une file d'attente de tâches asynchrones robuste et performante.
-   **TypeScript** : Pour un code typé, maintenable et évolutif.

Ce document vous guidera à travers l'installation, l'exécution et l'extension du serveur FastMCP++.

---

## 📋 <font color="#3498DB">Prérequis</font>

Avant de commencer, assurez-vous que les éléments suivants sont installés et configurés sur votre système :

-   <img src="https://img.shields.io/badge/Docker_Engine- nécessaire-blue?logo=docker" alt="Docker Engine"> : Pour l'exécution des conteneurs.
-   <img src="https://img.shields.io/badge/Docker_Compose (v2+)- nécessaire-blue?logo=docker" alt="Docker Compose"> : Pour l'orchestration des services. Le script `run.sh` vérifiera sa présence.
-   <img src="https://img.shields.io/badge/pnpm-recommandé-orange?logo=pnpm" alt="pnpm"> : (Optionnel, mais recommandé pour le développement local) Pour la gestion des dépendances Node.js et l'exécution des scripts.

---

## 🚀 <font color="#3498DB">Installation & Configuration Initiale</font>

Suivez ces étapes pour mettre en place votre environnement FastMCP++ :

1.  **Clonez le Dépôt** :
    ```bash
    git clone <URL_DU_DEPOT>
    cd <NOM_DU_REPERTOIRE>
    ```

2.  **Configuration Initiale via `run.sh`** :
    Le script `run.sh` est votre console de gestion interactive pour l'environnement Docker.
    * Rendez le script exécutable :
        ```bash
        chmod +x run.sh
        ```
    * Lancez le script :
        ```bash
        ./run.sh
        ```
    * **Fichier d'Environnement (`.env`)** :
        * Si le fichier `.env` est manquant, le script proposera de le créer à partir de `src/.env.example` ou d'un modèle de base.
        * Vous serez guidé pour configurer la variable cruciale `FASTMCP_SOURCE` (choix entre `local` ou `remote`) dans `.env`.
        * ⚠️ **Action Requise** : Éditez manuellement le fichier `.env` pour définir des valeurs **fortes et uniques** pour `AUTH_TOKEN`, `REDIS_PASSWORD`, `WEBHOOK_SECRET`, et toute autre variable sensible ou spécifique à votre déploiement.
            ```dotenv
            # Exemple de variables à personnaliser dans .env
            AUTH_TOKEN="VOTRE_TOKEN_SECRET_ULTRA_ROBUSTE"
            REDIS_PASSWORD="VOTRE_MOT_DE_PASSE_REDIS_COMPLEXE"
            WEBHOOK_SECRET="VOTRE_SECRET_WEBHOOK_LONG_ET_UNIQUE"
            ```
    * **(Recommandé)** Validez votre configuration `.env` en utilisant l'option `15` ("🛡️ VALIDER Paramètres d'Environnement (.env)") dans le menu de `run.sh`.

3.  **Premier Démarrage des Services** :
    Pour le lancement initial, il est conseillé de construire les images Docker et de démarrer tous les services.
    * **Option 1 (Fortement Recommandée pour le premier lancement)** : <font color="#E74C3C">Nettoyage COMPLET</font>
        * Dans le menu de `run.sh`, choisissez l'option `1` ("☣️ Nettoyage COMPLET (Supprime tout, Reconstruit, Démarre)").
        * Cette option assure un environnement vierge : elle supprime les anciens conteneurs, volumes et images locales, reconstruit les images Docker pour l'application et le worker, puis démarre tous les services (Redis, serveur, worker).
        * Le script demandera confirmation avant toute action destructive.
    * **Alternative (Contrôle granulaire via le menu `run.sh`)** :
        1.  Option `17`: "📦 Configurer Source FastMCP (local/distante)" si vous souhaitez modifier la configuration initiale.
        2.  Option `6`: "📥 Synchroniser Images de Base (Pull)" (télécharge l'image Redis).
        3.  Option `7`: "🛠️ Construire/Reconstruire MODULES Locaux (Build)" (sélectionnez `fastmcp-server` et `worker`).
        4.  Option `4`: "🚀 Démarrer/Redémarrer des MODULES (Up)" (sélectionnez tous les services).

---

## ⚙️ <font color="#3498DB">Exécution et Gestion du Serveur</font>

Utilisez le script `run.sh` pour la majorité des opérations de gestion :

-   **Démarrer/Arrêter des modules spécifiques** : Options `2`, `3`, `4`, `5`.
-   **Visualiser les journaux (logs)** : Option `11` ou lancez `run.sh --logs`.
-   **Reconstruire des modules** : Options `7`, `8`.
-   **Accéder au terminal d'un conteneur** : Option `12`.
-   **Exécuter des scripts PNPM (lint, test, etc.) sur l'hôte** : Option `16`.

Le serveur applicatif s'exécute dans le conteneur Docker `fastmcp-server`, tandis que les tâches asynchrones sont traitées par un conteneur worker distinct, `worker`.

---

## ✨ <font color="#3498DB">Extensibilité : Ajout de Nouveaux Outils</font>

FastMCP++ est conçu pour être étendu avec des "Outils" personnalisés, définissant des fonctionnalités spécifiques accessibles via son API.

### ⚡ <font color="#F39C12">Ajout d'un Outil Asynchrone</font>

Les outils asynchrones sont parfaits pour les processus de longue durée qui ne doivent pas bloquer le thread principal du serveur. Ils s'appuient sur BullMQ pour le traitement des tâches en arrière-plan.

**Étape 1 : Création du Fichier de l'Outil**

1.  Créez un nouveau fichier TypeScript dans `src/tools/`, par exemple : `monOutilAsync.tool.ts`.
2.  **Définition des Paramètres d'Entrée** (avec `zod` pour une validation robuste) :
    ```typescript
    // src/tools/monOutilAsync.tool.ts
    import { z } from 'zod';

    export const monOutilAsyncParams = z.object({
      parametreEssentiel: z.string().min(1).describe("Un paramètre crucial pour cet outil."),
      nombreIterations: z.number().int().positive().optional().describe("Nombre d'itérations à effectuer."),
      // Ajoutez d'autres paramètres selon les besoins
    });
    export type MonOutilAsyncParamsType = z.infer<typeof monOutilAsyncParams>;
    ```
3.  **Définition du Type de Résultat du Worker** : Spécifiez la structure des données que la logique de votre worker retournera.
    ```typescript
    // src/tools/monOutilAsync.tool.ts
    export type MonOutilAsyncResultType = {
      messageDeFin: string;
      elementsTraites: number;
      donneesResultantes?: any; // Soyez plus spécifique si possible
    };
    ```
4.  **Implémentation de la Logique Métier du Worker** (`doWorkMonOutilAsync`) :
    Cette fonction `async` est le cœur de votre outil. Elle sera exécutée par le worker BullMQ.
    ```typescript
    // src/tools/monOutilAsync.tool.ts
    import type { AuthData } from '../types.js'; // Si les données d'authentification sont pertinentes
    import logger from '../logger.js'; // Pour la journalisation côté serveur dans le worker

    export async function doWorkMonOutilAsync(
      params: MonOutilAsyncParamsType,
      auth: AuthData | undefined, // Exemple: si le contexte d'authentification est nécessaire
      taskId: string
    ): Promise<MonOutilAsyncResultType> {
      const log = logger.child({ tool: "monOutilAsync", taskId, proc: 'worker-logic' });
      log.info(`Traitement démarré pour : ${params.parametreEssentiel}`);

      // ... Votre logique métier asynchrone ici ...
      // Exemple : simuler un travail de longue durée
      for (let i = 0; i < (params.nombreIterations || 1); i++) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simule une étape
        log.debug(`Itération ${i + 1} pour la tâche ${taskId} terminée.`);
      }

      return {
        messageDeFin: `Traitement asynchrone terminé pour '${params.parametreEssentiel}'.`,
        elementsTraites: params.nombreIterations || 1
      };
    }
    ```
5.  **Définition de l'Objet Outil FastMCP** : Cet objet sert d'interface entre votre outil et le serveur FastMCP.
    ```typescript
    // src/tools/monOutilAsync.tool.ts
    import { randomUUID } from 'crypto';
    import { enqueueTask } from '../utils/asyncToolHelper.js'; // Utilitaire pour la mise en file d'attente
    // import { getInitializedFastMCP } from '../fastmcpProvider.js'; // Pour UserError si nécessaire

    export const monOutilAsyncTool = {
      name: "monOutilAsync", // IMPORTANT : Doit correspondre à la clé dans `processors` du worker
      description: "Un outil asynchrone puissant pour des tâches complexes.",
      parameters: monOutilAsyncParams,
      annotations: { // Métadonnées pour l'outil
        title: "Mon Outil Asynchrone Personnalisé",
        authRequiredHint: true, // Indique si l'authentification est requise
        // ... autres annotations pertinentes
      },
      execute: async (args: MonOutilAsyncParamsType, context: any /* Ctx de longProcess.tool.ts comme exemple */): Promise<string> => {
        const authData = context.authData; // Récupération des données d'authentification du contexte
        const taskId = randomUUID(); // Génération d'un ID unique pour la tâche
        // const { UserError } = getInitializedFastMCP(); // Pour lever des erreurs orientées utilisateur

        // 1. Validation des entrées (Zod s'en charge implicitement)
        // 2. Gestion de l'authentification/autorisation si nécessaire
        if (!authData && monOutilAsyncTool.annotations.authRequiredHint) {
          // throw new UserError("Authentification requise pour cet outil.");
          throw new Error("Authentification requise pour cet outil."); // Ou une UserError de FastMCP
        }

        // 3. Mise en file d'attente de la tâche
        const jobId = await enqueueTask<MonOutilAsyncParamsType>({
          params: args,
          auth: authData,
          taskId: taskId,
          toolName: "monOutilAsync", // Doit correspondre à `tool.name` et à la clé du processeur du worker
          cbUrl: (args as any).callbackUrl // Si vos paramètres incluent une URL de callback optionnelle
        });

        return `Tâche ${taskId} (Job ID: ${jobId}) pour 'monOutilAsync' mise en file d'attente avec succès.`;
      },
    };
    ```

**Étape 2 : Mise à Jour du Worker (`src/worker.ts`)**

1.  **Importez** la logique métier de votre worker (`doWorkMonOutilAsync`) et ses types de paramètres/résultats.
    ```typescript
    // src/worker.ts
    import {
      doWorkMonOutilAsync,
      MonOutilAsyncParamsType,
      MonOutilAsyncResultType,
    } from './tools/monOutilAsync.tool.js'; // Ajustez le chemin si nécessaire
    ```
2.  **Ajoutez un Processeur** : Associez le `name` de votre outil à sa fonction `doWork...` dans l'objet `processors`.
    ```typescript
    // src/worker.ts
    const processors: Record<string, JobProcFn> = {
      // ... autres processeurs existants ...
      asynchronousTaskSimulatorEnhanced: longProcDoWork as JobProcFn</*...*/,/*...*/ >, // Exemple existant
      monOutilAsync: doWorkMonOutilAsync as JobProcFn<MonOutilAsyncParamsType, MonOutilAsyncResultType>, // Votre nouvel outil
    };
    ```
    > 🔑 La clé (`"monOutilAsync"`) doit correspondre **exactement** à la propriété `name` de votre objet outil et au `toolName` passé à `enqueueTask`.

**Étape 3 : Enregistrement de l'Outil sur le Serveur (`src/server.ts`)**

1.  **Importez** l'objet de votre outil et son schéma de paramètres Zod.
    ```typescript
    // src/server.ts
    import { monOutilAsyncTool, monOutilAsyncParams } from './tools/monOutilAsync.tool.js'; // Ajustez le chemin
    ```
2.  **Enregistrez l'Outil** en utilisant `server.addTool()` dans la fonction `applicationEntryPoint`, après l'initialisation de `server`.
    ```typescript
    // src/server.ts
    // ...
    server.addTool(monOutilAsyncTool as Tool<AuthData, typeof monOutilAsyncParams>); // Votre nouvel outil
    // ...
    ```
3.  **(Optionnel)** Mettez à jour `srvOpts.instructions` dans `src/server.ts` pour inclure votre nouvel outil dans l'auto-documentation du serveur.

---

### 💡 <font color="#F39C12">Ajout d'un Outil Synchrone</font>

Les outils synchrones exécutent leur logique directement dans le cycle requête-réponse du serveur. Ils sont adaptés aux opérations rapides.

**Étape 1 : Création du Fichier de l'Outil**

1.  Créez un nouveau fichier TypeScript dans `src/tools/`, par exemple : `monOutilSync.tool.ts`.
2.  **Définition des Paramètres d'Entrée** (avec `zod`) :
    ```typescript
    // src/tools/monOutilSync.tool.ts
    import { z } from 'zod';

    export const monOutilSyncParams = z.object({
      donneeEntree: z.string().describe("La donnée à traiter de manière synchrone."),
      optionRapide: z.boolean().optional().default(false),
    });
    export type MonOutilSyncParamsType = z.infer<typeof monOutilSyncParams>;
    ```
3.  **Définition de l'Objet Outil FastMCP** : La fonction `execute` contiendra la logique directe.
    ```typescript
    // src/tools/monOutilSync.tool.ts
    // import loggerInstance from '../logger.js'; // Pour la journalisation côté serveur
    // import type { AuthData } from '../types.js'; // Si AuthData est pertinent

    // Définissez un type pour le résultat de l'outil synchrone
    export type MonOutilSyncResultType = {
      message: string;
      valeurTraitee: string;
      timestamp: number;
    };

    export const monOutilSyncTool = {
      name: "monOutilSync",
      description: "Un outil qui effectue un travail synchrone rapide.",
      parameters: monOutilSyncParams,
      annotations: {
        title: "Mon Outil Synchrone",
        readOnlyHint: true, // Exemple d'annotation
      },
      execute: async (args: MonOutilSyncParamsType, context: any /* SyncCtx de synchronousExample.tool.ts comme exemple */): Promise<MonOutilSyncResultType> => {
        // const serverLog = loggerInstance.child({ tool: "monOutilSync" });
        // serverLog.info(`Exécution synchrone avec : ${args.donneeEntree}`);

        // ... Votre logique synchrone ici ...
        let valeurTraitee = args.donneeEntree.toUpperCase();
        if (args.optionRapide) {
          valeurTraitee = `⚡ ${valeurTraitee} ⚡`;
        }

        return {
          message: "Traitement synchrone effectué avec succès.",
          valeurTraitee: valeurTraitee,
          timestamp: Date.now()
        };
      },
    };
    ```

**Étape 2 : Enregistrement de l'Outil sur le Serveur (`src/server.ts`)**

Cette étape est identique à celle des outils asynchrones :
1.  **Importez** l'objet de votre outil (`monOutilSyncTool`) et son schéma de paramètres Zod (`monOutilSyncParams`).
    ```typescript
    // src/server.ts
    import { monOutilSyncTool, monOutilSyncParams } from './tools/monOutilSync.tool.js'; // Ajustez le chemin
    ```
2.  **Enregistrez l'Outil** en utilisant `server.addTool()` :
    ```typescript
    // src/server.ts
    // ...
    server.addTool(monOutilSyncTool as Tool<AuthData, typeof monOutilSyncParams>); // Votre nouvel outil synchrone
    // ...
    ```
3.  **(Optionnel)** Mettez à jour `srvOpts.instructions` dans `src/server.ts`.

---

## 🛠️ <font color="#3498DB">Capacités du Worker Asynchrone</font>

Le worker (`src/worker.ts`) est un composant essentiel pour la gestion des tâches asynchrones, déchargeant le serveur principal.

-   **Rôle Principal** : Écouter la file d'attente BullMQ (`async-tasks`) et traiter les jobs qui y sont soumis.
-   **Traitement des Tâches** :
    * Lorsqu'une tâche est mise en file d'attente par la méthode `execute` d'un outil (via `enqueueTask`), elle est ajoutée avec un `toolName` spécifique.
    * Le worker récupère les jobs de cette file.
    * Il utilise un objet `processors` pour trouver la fonction `doWork...` correspondante, basée sur le `job.data.toolName`. Cette fonction exécute ensuite la logique métier réelle.
-   **Concurrence** : Le worker traite plusieurs jobs simultanément (configurable, par défaut : 2 en développement, 5 en production).
-   **Gestion des Erreurs et Tentatives** :
    * Les jobs sont configurés avec des tentatives de réessai par défaut (par exemple, 3 tentatives avec un backoff exponentiel).
    * Si un job échoue à toutes ses tentatives, il est déplacé vers une **Dead Letter Queue** (`dead-letter-tasks`) pour inspection et intervention manuelle potentielle.
-   **Callbacks / Webhooks Sécurisés** :
    * Si une `cbUrl` (URL de callback) est fournie lors de la mise en file d'attente d'une tâche, le worker peut :
        * Envoyer un webhook initial lorsque le traitement de la tâche commence (statut : `processing`).
        * Envoyer un webhook final à la fin de la tâche (statut : `completed` avec les résultats) ou en cas d'échec (statut : `error` avec les détails de l'erreur).
    * Les webhooks sont signés en utilisant **HMAC SHA256** si la variable d'environnement `WEBHOOK_SECRET` est configurée, garantissant leur authenticité et intégrité. [cite:_SRC_UTILS_FILES.txt]
-   **Extensibilité pour de Nouveaux Outils Asynchrones** : Pour que le worker traite les tâches d'un nouvel outil asynchrone, vous devez :
    1.  Implémenter la logique métier spécifique de l'outil dans une fonction `doWork<NomDeVotreOutil>`.
    2.  Importer cette fonction et ses types associés dans `src/worker.ts`.
    3.  Ajouter une entrée à l'objet `processors` dans `src/worker.ts`, mappant le nom unique de l'outil (chaîne de caractères) à cette fonction `doWork`.

---

## 🔧 <font color="#3498DB">Développement & Configuration Avancée</font>

-   **Linting & Formatage** : Utilisez `pnpm run lint` et `pnpm run format`, ou les options correspondantes dans `run.sh` (Option `16`).
-   **Vérification des Types** : Exécutez `pnpm run check-types`.
-   **Configuration Clé (`.env`)** :
    * `AUTH_TOKEN`: <font color="#E74C3C">**Token secret**</font> pour l'authentification Bearer. **Doit être fort et unique.**
    * `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`: Détails de connexion pour Redis.
    * `WEBHOOK_SECRET`: <font color="#E74C3C">**Secret crucial**</font> pour la signature des webhooks sortants.
    * `FASTMCP_SOURCE`: Détermine si la bibliothèque FastMCP locale (`local`) ou une version npm (`remote`) est utilisée.
    * `LOG_LEVEL`: Définit la verbosité des logs de l'application (par exemple, `info`, `debug`, `error`).
    * Consultez `src/.env.example` et `src/config.ts` pour toutes les options disponibles.

---

## 🤝 <font color="#3498DB">Contribution</font>

Les contributions sont les bienvenues ! Veuillez consulter `CONTRIBUTING.md` (si disponible) pour les directives de contribution, ou ouvrez une *issue* pour discuter des changements que vous souhaitez apporter.

---

<div align="center">
  <p>🚀 Prêt à construire des applications puissantes avec FastMCP++ ! 🚀</p>
</div>
