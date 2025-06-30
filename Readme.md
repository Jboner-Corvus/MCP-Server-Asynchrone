<div align="center">
  <h1><font color="#2ECC71">MCP-Serveur</font></h1>
  <p><strong>Un serveur modulaire et extensible pour opérations synchrones et asynchrones.</strong></p>
  <p>Propulsé par Docker, BullMQ, Redis et FastMCP.</p>
  <p>
    <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="[Image du logo Docker]">
    <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="[Image du logo Node.js]">
    <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="[Image du logo TypeScript]">
    <img src="https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="[Image du logo Redis]">
    <img src="https://img.shields.io/badge/pnpm-F69220?style=for-the-badge&logo=pnpm&logoColor=white" alt="[Image du logo pnpm]">
  </p>
</div>

---

## 📜 <font color="#3498DB">Table des Matières</font>

- [🌟 Introduction](#-introduction)
- [📋 Prérequis](#-prérequis)
- [🚀 Installation & Configuration Initiale](#-installation--configuration-initiale)
- [⚙️ Exécution et Gestion du Serveur](#️-exécution-et-gestion-du-serveur)
- [🔍 Utilisation de l'Inspecteur (Client UI)](#-utilisation-de-linspecteur-client-ui)
- [🤝 Contribution](#-contribution)

---

## 🌟 <font color="#3498DB">Introduction</font>

**MCP-Serveur** est un serveur robuste, conçu pour la performance et la modularité. Il permet de gérer avec élégance des tâches complexes, qu'elles soient immédiates (synchrones) ou de longue durée (asynchrones), grâce à une architecture découplée s'appuyant sur :

- **FastMCP** : Pour un traitement efficace des requêtes et une gestion de session.
- **Docker & Docker Compose** : Pour une conteneurisation fiable et un déploiement simplifié.
- **BullMQ & Redis** : Pour une file d'attente de tâches asynchrones robuste et performante.
- **TypeScript** : Pour un code typé, maintenable et évolutif.

Ce document vous guidera à travers l'installation, l'exécution et l'extension du serveur.

---

## 📋 <font color="#3498DB">Prérequis</font>

Avant de commencer, assurez-vous que les éléments suivants sont installés et configurés sur votre système :

- <img src="https://img.shields.io/badge/Docker_Engine-nécessaire-blue?logo=docker" alt="[Badge Docker Engine]"> : Pour l'exécution des conteneurs. Le script de gestion vérifiera sa présence.
- <img src="https://img.shields.io/badge/Docker_Compose_(v2+)-nécessaire-blue?logo=docker" alt="[Badge Docker Compose]"> : Pour l'orchestration des services. Le script `run.sh` vérifiera sa présence.
- <img src="https://img.shields.io/badge/pnpm-recommandé-orange?logo=pnpm" alt="[Badge pnpm]"> : (Optionnel, mais recommandé pour le développement local) Pour la gestion des dépendances Node.js et l'exécution des scripts.

---

## 🚀 <font color="#3498DB">Installation & Configuration Initiale</font>

Suivez ces étapes pour mettre en place votre environnement :

1.  **Clonez le Dépôt** :

    ```bash
    git clone [https://github.com/Jboner-Corvus/MCP-Server-Asynchrone.git](https://github.com/Jboner-Corvus/MCP-Server-Asynchrone.git)
    cd MCP-Server-Asynchrone
    ```

2.  **Configuration Initiale via `run.sh`** :
    Le script `run.sh` est votre console de gestion interactive pour l'environnement Docker.
    - Rendez le script exécutable :
      ```bash
      chmod +x run.sh
      ```
    - Lancez le script :
      ```bash
      ./run.sh
      ```
    - **Fichier d'Environnement (`.env`)** :
      - Si le fichier `.env` est manquant, créer le en copiant le modèle `.env.example`.
      - ⚠️ **Action Requise** : Éditez manuellement le fichier `.env` pour définir des valeurs **fortes et uniques** pour `AUTH_TOKEN`, `REDIS_PASSWORD`, `WEBHOOK_SECRET`, et toute autre variable sensible ou spécifique à votre déploiement.
      ```dotenv
      # variables à personnaliser dans .env
      PORT=8081
      NODE_ENV=production
      LOG_LEVEL=info
      AUTH_TOKEN="VOTRE_TOKEN_SECRET_ULTRA_ROBUSTE"
      REDIS_HOST=redis
      REDIS_PORT=6379
      REDIS_PASSWORD="VOTRE_MOT_DE_PASSE_REDIS_COMPLEXE"
      WEBHOOK_SECRET="VOTRE_SECRET_WEBHOOK_LONG_ET_UNIQUE"
      ```

---

## ⚙️ <font color="#3498DB">Exécution et Gestion du Serveur</font>

Utilisez le script `run.sh` pour toutes les opérations de gestion du cycle de vie des services.

- **Démarrer / Mettre à jour** : Option `1`. Cette commande construit les images si nécessaire et lance tous les services en arrière-plan.
- **Redémarrer complètement** : Option `2`. Arrête, reconstruit, puis redémarre tous les services.
- **Arrêter tous les services** : Option `3`. Arrête et supprime les conteneurs.
- **Reconstruire les images (sans cache)** : Option `4`. Force une reconstruction complète de toutes les images Docker sans utiliser le cache.

---

## 🔍 <font color="#3498DB">Utilisation de l'Inspecteur (Client UI)</font>

L'Inspecteur MCP fournit une interface utilisateur web pour interagir avec votre serveur.

1.  **Lancement** :
    Pour lancer l'inspecteur, exécutez la commande suivante :
    ```bash
    npx @modelcontextprotocol/inspector
    ```
    Cette commande démarre un serveur proxy et ouvre automatiquement l'interface client dans votre navigateur, généralement à l'adresse `http://localhost:6274`.

2.  **Configuration de la Connexion** :
    Dans la barre latérale de l'interface, vous devez configurer le mode de connexion à votre serveur MCP.
    - **Conneion au serveur** : Sélectionnez `Streamable HTTP` ou `SSE` et entrez l'URL complète du serveur (par exemple `http://VOTRE_IP:8081/mcp`).
    - **Authentification** : Si votre serveur nécessite un jeton d'authentification, dépliez la section "Authentication" et entrez votre `Bearer Token`.

3.  **Connexion** :
    Une fois la configuration terminée, cliquez sur le bouton **"Connect"**. L'inspecteur tentera d'établir la connexion avec votre serveur MCP.

4.  **Interaction** :
    Une fois connecté, vous pouvez utiliser les différents onglets pour interagir avec le serveur :
    - **Resources** : Lister et lire les ressources disponibles.
    - **Prompts** : Lister et exécuter les prompts.
    - **Tools** : Lister et appeler les outils avec des paramètres spécifiques.

---

## 🤝 <font color="#3498DB">Contribution</font>

Les contributions sont les bienvenues ! Ouvrez une _issue_ pour discuter des changements que vous souhaitez apporter.
