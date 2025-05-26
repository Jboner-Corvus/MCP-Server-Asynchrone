# 🚀 Comment Ajouter un Nouvel Outil Asynchrone au Serveur FastMCP 🚀

Ce guide **ULTIME** décrit les étapes pour intégrer un nouvel outil asynchrone à votre projet FastMCP. Le serveur est conçu pour être **EXTRÊMEMENT MODULAIRE**, facilitant l'extension avec de nouvelles fonctionnalités capables d'effectuer des traitements longs et complexes en **arrière-plan**.

---

## 🌟 Étapes Clés pour l'Intégration d'un Nouvel Outil 🌟

Suivez ces **TROIS ÉTAPES FONDAMENTALES** pour ajouter votre outil :

### 🛠️ Étape 1 : Création du Fichier de l'Outil

Votre nouvel outil prendra vie dans le répertoire `src/tools/`.

- **Créez un Nouveau Fichier TypeScript** :
  Par exemple, `monSuperOutil.tool.ts`.

- **Définir les Paramètres d'Entrée (`zod`)** :

  - Utilisez la puissance de `zod` pour définir un schéma **ROBUSTE** pour les paramètres que votre outil acceptera.
  - _Exemple_ :
    ```typescript
    export const monSuperOutilParams = z.object({
      // ...vos paramètres ULTRA-spécifiques...
    });
    ```

- **Définir le Type de Résultat du Worker** :

  - Spécifiez la structure **PRÉCISE** des données que la logique de votre worker retournera après son labeur.
  - _Exemple_ :
    ```typescript
    export type MonSuperOutilResultType = {
      // ...structure du résultat MAGIQUE...
    };
    ```

- **Implémenter la Logique Métier (`doWorkMonSuperOutil`)** :

  - Cette fonction `async` sera le **CŒUR BATTANT** ❤️ de votre outil.
  - Elle prendra typiquement en arguments les paramètres validés, les données d'authentification (`AuthData`), et un identifiant de tâche (`taskId`).
  - Cette fonction sera exécutée par le processus worker BullMQ, **totalement découplée** du thread principal du serveur.

- **Définir l'Objet Outil FastMCP (`monSuperOutilTool`)** :
  - C'est l'interface principale que FastMCP utilisera pour communiquer avec votre création.
  - **Propriétés Essentielles** :
    - `name: string`: Un nom **UNIQUE ET MÉMORABLE** pour votre outil (ex: `"monSuperOutil"`). Ce nom est **CRUCIAL** pour le routage interne.
    - `description: string`: Une description **CLAIRE ET CONCISE** de ce que fait l'outil.
    - `parameters`: Le schéma `zod` défini précédemment.
    - `annotations: object`: Métadonnées optionnelles (ex: `title`, `authRequiredHint`).
    - `execute: async function`: La fonction **DÉCLENCHEUR** appelée par FastMCP lorsqu'une requête pour cet outil est reçue.
      - Elle **DOIT** valider les entrées.
      - Elle **DOIT** gérer l'authentification si nécessaire.
      - Elle **DOIT** utiliser la fonction `enqueueTask` (de `src/utils/asyncToolHelper.ts`) pour ajouter la tâche à la file d'attente BullMQ. Assurez-vous de passer le `toolName` correct !

---

### ⚙️ Étape 2 : Mise à Jour du Worker

Le fichier `src/worker.ts` est le **MAÎTRE D'ŒUVRE** du traitement des tâches.

- **Importer la Logique Métier et les Types** :

  - Au début de `src/worker.ts`, importez votre fonction `doWorkMonSuperOutil` ainsi que les types de paramètres et de résultats.
  - _Exemple_ :
    ```typescript
    import {
      doWorkMonSuperOutil,
      MonSuperOutilParamsType,
      MonSuperOutilResultType,
    } from './tools/monSuperOutil.tool.js';
    ```

- **Ajouter un Processeur pour l'Outil** :
  - Localisez l'objet `processors` dans `src/worker.ts`.
  - Ajoutez une nouvelle entrée qui mappe le `name` (chaîne de caractères) de votre outil à sa fonction `doWork...`.
  - _Exemple_ :
    ```typescript
    const processors: Record<string, JobProcFn> = {
      // ... autres outils déjà présents
      monSuperOutil: doWorkMonSuperOutil as JobProcFn<
        MonSuperOutilParamsType,
        MonSuperOutilResultType
      >,
    };
    ```
    > **IMPORTANT :** La clé (ex: `"monSuperOutil"`) doit correspondre **EXACTEMENT** au `name` défini dans l'objet outil et utilisé dans `enqueueTask`.

---

### 🔗 Étape 3 : Enregistrement de l'Outil sur le Serveur

Le fichier `src/server.ts` est le **PORTAIL D'ENTRÉE** de votre application.

- **Importer l'Outil et son Schéma de Paramètres** :

  - Au début de `src/server.ts`, importez l'objet `monSuperOutilTool` et le schéma `monSuperOutilParams`.
  - _Exemple_ :
    ```typescript
    import { monSuperOutilTool, monSuperOutilParams } from './tools/monSuperOutil.tool.js';
    ```

- **Enregistrer l'Outil** :

  - Utilisez la méthode `server.addTool()` pour faire connaître votre nouvel outil à l'instance FastMCP.
  - _Exemple_ :
    ```typescript
    server.addTool(monSuperOutilTool as Tool<AuthData, typeof monSuperOutilParams>);
    ```

- **(Optionnel mais Recommandé) Mettre à Jour la Documentation Interne** :
  - Si vous maintenez une liste d'outils dans `srvOpts.instructions` (dans `src/server.ts`), pensez à y ajouter votre nouvel outil pour la postérité.

---

## 🎉 Conclusion 🎉

Une fois ces étapes **VICTORIEUSEMENT** complétées, votre nouvel outil asynchrone sera parfaitement intégré au serveur FastMCP. Il pourra recevoir des requêtes, les traiter de manière asynchrone grâce à la magie de la file d'attente et des workers, et **renvoyer la réponse de l'outil via webhook** (si une URL de callback est fournie et configurée).

**N'oubliez pas de redémarrer votre serveur et votre worker pour que les modifications prennent effet !** Bon codage ! 💻✨
