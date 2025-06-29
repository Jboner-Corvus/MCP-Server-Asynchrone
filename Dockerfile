# ÉTAPE 1: BUILDER - Compilation de l'application
FROM node:24-alpine AS builder
WORKDIR /app

# Activer pnpm via corepack
RUN corepack enable

# Copier les fichiers de manifeste et installer TOUTES les dépendances (dev incluses)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copier le reste du code source
COPY . .

# Compiler le code TypeScript en JavaScript
RUN pnpm run build

# ÉTAPE 2: FINAL - Image d'exécution optimisée
FROM node:24-alpine AS final
WORKDIR /app

# Activer pnpm
RUN corepack enable

ENV NODE_ENV=production

# Créer un utilisateur non-root pour la sécurité
RUN addgroup -S appgroup && adduser -S -D -G appgroup appuser

# Installer uniquement les dépendances de PRODUCTION
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile --ignore-scripts
# Copier le code compilé depuis l'étape 'builder'
COPY --from=builder /app/dist ./dist

# Changer le propriétaire des fichiers
RUN chown -R appuser:appgroup /app

# Passer à l'utilisateur non-root
USER appuser

# Exposer le port que le serveur écoute à l'intérieur du conteneur
EXPOSE 8080

# Commande par défaut pour démarrer le serveur principal
CMD ["pnpm", "run", "start", "--", "--http-stream"]