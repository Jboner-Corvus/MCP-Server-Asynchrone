# Dockerfile (Version Finale Corrigée)

# ÉTAPE 1: BUILDER
# [cite_start]Utilise une image Node.js version 24-alpine comme base pour la construction. [cite: 1220]
FROM node:24-alpine AS builder
# [cite_start]Définit le répertoire de travail dans le conteneur. [cite: 1220]
WORKDIR /app
# [cite_start]Active corepack pour gérer les versions de gestionnaires de paquets comme pnpm. [cite: 1220]
RUN corepack enable
# [cite_start]Copie les fichiers de définition de projet et de verrouillage des dépendances. [cite: 1220]
COPY package.json pnpm-lock.yaml ./

# [cite_start]CORRECTION : Copier le paquet .tgz au lieu du dossier source. [cite: 1220]
COPY ./fastmcp-*.tgz ./

# [cite_start]Installe les dépendances en se basant sur le fichier de verrouillage pour une construction reproductible. [cite: 1220]
RUN pnpm install --frozen-lockfile
# [cite_start]Copie tous les autres fichiers du projet. [cite: 1220]
COPY . .
# [cite_start]Exécute le script de build pour compiler le code TypeScript en JavaScript. [cite: 1221]
RUN pnpm run build

# ÉTAPE 2: FINAL
# [cite_start]Utilise une nouvelle image Node.js légère pour la production. [cite: 1221]
FROM node:24-alpine AS final
# [cite_start]Définit le répertoire de travail. [cite: 1221]
WORKDIR /app
# [cite_start]Active corepack. [cite: 1221]
RUN corepack enable
# [cite_start]Définit l'environnement sur 'production'. [cite: 1221]
ENV NODE_ENV=production
# [cite_start]Crée un groupe et un utilisateur non-root pour des raisons de sécurité. [cite: 1221]
RUN addgroup -S appgroup && adduser -S -D -G appgroup appuser

# [cite_start]Copie les fichiers de définition de projet et de verrouillage. [cite: 1221]
COPY package.json pnpm-lock.yaml ./

# [cite_start]CORRECTION : Copier le paquet .tgz pour l'installation de production. [cite: 1221]
COPY ./fastmcp-*.tgz ./

# [cite_start]Installe uniquement les dépendances de production et ignore les scripts. [cite: 1221]
RUN pnpm install --prod --frozen-lockfile --ignore-scripts
# [cite_start]Copie les fichiers JavaScript compilés depuis l'étape de construction (builder). [cite: 1221]
COPY --from=builder /app/dist ./dist
# [cite_start]Change le propriétaire de tous les fichiers pour l'utilisateur non-root. [cite: 1221]
RUN chown -R appuser:appgroup /app
# [cite_start]Change l'utilisateur pour l'utilisateur non-root. [cite: 1221]
USER appuser
# [cite_start]Expose le port sur lequel l'application s'exécutera. [cite: 1221]
EXPOSE 8080
# [cite_start]La commande par défaut pour démarrer le serveur en mode HTTP Stream. [cite: 1221]
CMD ["pnpm", "run", "start", "--", "--http-stream"]