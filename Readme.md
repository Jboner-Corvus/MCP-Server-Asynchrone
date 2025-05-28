<div align="center">
  <h1><font color="#2ECC71">MCP-Serveur</font></h1>
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

- [🤝 Contribution](#-contribution)

---

## 🌟 <font color="#3498DB">Introduction</font>

**MCP-Serveur** est un serveur robuste, conçue pour la performance et la modularité. Il permet de gérer avec élégance des tâches complexes, qu'elles soient immédiates (synchrones) ou de longue durée (asynchrones), grâce à une architecture découplée s'appuyant sur :

- **FastMCP** : Pour un traitement efficace des requêtes et une gestion de session.
- **Docker & Docker Compose** : Pour une conteneurisation fiable et un déploiement simplifié.
- **BullMQ & Redis** : Pour une file d'attente de tâches asynchrones robuste et performante.
- **TypeScript** : Pour un code typé, maintenable et évolutif.

Ce document vous guidera à travers l'installation, l'exécution et l'extension du serveur.

---

## 📋 <font color="#3498DB">Prérequis</font>

Avant de commencer, assurez-vous que les éléments suivants sont installés et configurés sur votre système :

- <img src="https://img.shields.io/badge/Docker_Engine- nécessaire-blue?logo=docker" alt="Docker Engine"> : Pour l'exécution des conteneurs.
- <img src="https://img.shields.io/badge/Docker_Compose (v2+)- nécessaire-blue?logo=docker" alt="Docker Compose"> : Pour l'orchestration des services. Le script `run.sh` vérifiera sa présence.
- <img src="https://img.shields.io/badge/pnpm-recommandé-orange?logo=pnpm" alt="pnpm"> : (Optionnel, mais recommandé pour le développement local) Pour la gestion des dépendances Node.js et l'exécution des scripts.

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
      - Si le fichier `.env` est manquant, le script proposera de le créer à partir de `src/.env.example` ou d'un modèle de base.
      - Vous serez guidé pour configurer la variable cruciale `FASTMCP_SOURCE` (choix entre `local` ou `remote`) dans `.env`.
      - ⚠️ **Action Requise** : Éditez manuellement le fichier `.env` pour définir des valeurs **fortes et uniques** pour `AUTH_TOKEN`, `REDIS_PASSWORD`, `WEBHOOK_SECRET`, et toute autre variable sensible ou spécifique à votre déploiement.
        ```dotenv
        # Exemple de variables à personnaliser dans .env
        AUTH_TOKEN="VOTRE_TOKEN_SECRET_ULTRA_ROBUSTE"
        REDIS_PASSWORD="VOTRE_MOT_DE_PASSE_REDIS_COMPLEXE"
        WEBHOOK_SECRET="VOTRE_SECRET_WEBHOOK_LONG_ET_UNIQUE"
        ```
    - **(Recommandé)** Validez votre configuration `.env` en utilisant l'option `15` ("🛡️ VALIDER Paramètres d'Environnement (.env)") dans le menu de `run.sh`.

---

## ⚙️ <font color="#3498DB">Exécution et Gestion du Serveur</font>

Utilisez le script `run.sh` pour la majorité des opérations de gestion :

- **Installer** : Options `1`,
- **Visualiser les journaux (logs)** : Option `11`.

---

## 🔌 <font color="#3498DB">Intégration avec le client N8N </font>

Le serveur **MCP-Serveur** peut être facilement intégré avec **n8n** pour automatiser vos workflows en exploitant les capacités du **Model Context Protocol (MCP)**. Cette intégration permet d'orchestrer des tâches complexes et de créer des flux d'automatisation sophistiqués.

1. **Ajout du Nœud MCP Client** :

   - Dans votre workflow n8n, ajoutez un nœud de type **MCP Client Tool**.
   - Ce nœud servira de pont entre n8n et votre serveur MCP.

2. **Configuration du Point de Terminaison SSE** :

   - **Endpoint SSE** : `http://VOTRE_IP:8081/sse`
   - 💡 **Note** : Remplacez `VOTRE_IP` par l'adresse IP réelle de votre serveur MCP (exemple : `192.168.2.16`).
   - Ce point de terminaison utilise les **Server-Sent Events** pour une communication en temps réel.

3. **Configuration de l'Authentification** :
   - **Type d'authentification** : `Bearer Token`
   - Créez une nouvelle credential **Bearer Auth** dans n8n.
   - Utilisez la valeur de votre variable `AUTH_TOKEN` définie dans le fichier `.env`.
   - Cette authentification garantit la sécurité des communications entre n8n et votre serveur.

---

## 🤝 <font color="#3498DB">Contribution</font>

Les contributions sont les bienvenues ! ouvrez une _issue_ pour discuter des changements que vous souhaitez apporter.
