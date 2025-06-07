# --- Dockerfile Simplifié (Remote Uniquement) ---
# N'utilise que la version distante de fastmcp.
# CORRECTION v4 : Rétablissement de 'corepack enable' et correction de la création de l'utilisateur.

# Définir les arguments de build globaux
ARG NODE_VERSION=24-alpine

# ==============================================================================
# ÉTAPE 1: BUILDER - Compilation de l'application
# ==============================================================================
FROM node:${NODE_VERSION} AS builder
WORKDIR /app

# CORRECTION : Rétablir corepack pour rendre pnpm disponible.
RUN corepack enable

# Copier les fichiers de manifeste (le package.json pointe déjà vers la bonne version)
COPY package.json pnpm-lock.yaml* ./

# Définir NODE_ENV pour l'étape de build
ENV NODE_ENV=production

# Installer toutes les dépendances (y compris devDependencies pour le build)
RUN pnpm install

# Copier le reste du code source de l'application
COPY ./src ./src
COPY tsconfig.json .
COPY eslint.config.js .prettierrc.cjs ./

# Construire l'application (compiler TypeScript en JavaScript)
RUN pnpm run build

# ==============================================================================
# ÉTAPE 2: FINAL - Création de l'image d'exécution optimisée
# ==============================================================================
FROM node:${NODE_VERSION} AS final
WORKDIR /app

# CORRECTION : Rétablir corepack pour rendre pnpm disponible.
RUN corepack enable

# Définir NODE_ENV pour l'exécution
ENV NODE_ENV=production

# Créer un groupe et un utilisateur non-root pour l'application
# CORRECTION : Retrait du drapeau -H pour s'assurer que le répertoire personnel est créé.
RUN addgroup -S appgroup && \
    adduser -S -D -G appgroup appuser

# Donner à 'appuser' les permissions sur son propre répertoire personnel
# Cette commande va maintenant réussir car le répertoire existe.
RUN chown -R appuser:appgroup /home/appuser

# Installer tini (init léger) et curl (pour healthcheck)
RUN apk add --no-cache tini curl

# Copier le fichier de manifeste pour l'installation des dépendances de production
COPY package.json ./

# Installer UNIQUEMENT les dépendances de PRODUCTION
RUN pnpm install --prod --ignore-scripts

# Copier les fichiers construits (JavaScript) depuis l'étape 'builder'
COPY --from=builder /app/dist ./dist

# Changer le propriétaire des fichiers de l'application pour l'utilisateur non-root
RUN chown -R appuser:appgroup /app

# Basculer vers l'utilisateur non-root
USER appuser

# Argument pour le port, peut être défini lors du build de l'image
ARG PORT=8081
ENV PORT=${PORT}

# Exposer le port sur lequel l'application écoute
EXPOSE ${PORT}

# Utiliser tini comme point d'entrée pour gérer les signaux correctement
ENTRYPOINT ["/sbin/tini", "--"]

# Commande par défaut pour démarrer le serveur Node.js
CMD ["node", "dist/server.js"]
