# Dockerfile Corrigé

# =================================
# ÉTAPE 1: BUILDER - Compilation de l'application
# =================================
FROM node:24-alpine AS builder
WORKDIR /app

# Activer pnpm
RUN corepack enable

# Copier les fichiers de manifeste de paquets
COPY package.json pnpm-lock.yaml ./

# Installer TOUTES les dépendances (incl. devDependencies) pour construire le projet
# pnpm install va maintenant chercher la version publique de fastmcp
RUN pnpm install --frozen-lockfile

# Copier le reste du code source de l'application
COPY . .

# Compiler le code TypeScript en JavaScript
RUN pnpm run build

# =================================
# ÉTAPE 2: FINAL - Création de l'image de production
# =================================
FROM node:24-alpine AS final
WORKDIR /app

# Activer pnpm
RUN corepack enable

# Définir l'environnement de production
ENV NODE_ENV=production

# Créer un utilisateur non-root pour des raisons de sécurité
RUN addgroup -S appgroup && adduser -S -D -G appgroup appuser

# Copier les fichiers de manifeste de paquets
COPY package.json pnpm-lock.yaml ./

# Installer UNIQUEMENT les dépendances de production
RUN pnpm install --prod --frozen-lockfile --ignore-scripts

# Copier les fichiers compilés depuis l'étape de build
COPY --from=builder /app/dist ./dist

# Donner la propriété du répertoire de l'application à l'utilisateur non-root
RUN chown -R appuser:appgroup /app

# Changer pour l'utilisateur non-root
USER appuser

# Exposer le port sur lequel l'application s'exécute
EXPOSE 8080

# La commande pour démarrer le serveur
CMD ["pnpm", "run", "start"]