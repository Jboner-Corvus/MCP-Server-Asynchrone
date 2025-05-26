# --- Dockerfile ---
# Utilise pnpm pour la gestion des dépendances.
# La source de FastMCP (local ou npm) est contrôlée par l'argument de build FASTMCP_SOURCE.

# Définir les arguments de build
ARG NODE_VERSION=24-alpine
ARG FASTMCP_VERSION_TARGET="2.1.3" 
# FASTMCP_SOURCE par défaut à 'local', car package.json pourrait pointer vers local par défaut.
# Sera surchargé par docker-compose via la variable d'environnement FASTMCP_SOURCE lue depuis .env.
ARG FASTMCP_SOURCE=local

# Étape 1: Builder
FROM node:${NODE_VERSION} AS builder
WORKDIR /app

RUN corepack enable

# Copier d'abord les fichiers de manifeste (package.json, pnpm-lock.yaml)
COPY package.json pnpm-lock.yaml* ./
# Si vous avez un .npmrc, copiez-le aussi
# COPY .npmrc ./

# Toujours copier le répertoire ./libs contenant les dépendances locales.
# Il est nécessaire si FASTMCP_SOURCE (build arg ou runtime env) est 'local'.
COPY ./libs ./libs

# Journaliser la valeur de FASTMCP_SOURCE reçue comme argument de build
RUN echo "BUILDER: Argument de build FASTMCP_SOURCE reçu: $FASTMCP_SOURCE"
RUN echo "BUILDER: Version npm cible pour FastMCP (si remote): $FASTMCP_VERSION_TARGET"
RUN echo "BUILDER: Contenu initial de fastmcp dans package.json:" && grep '"fastmcp":' package.json || echo "BUILDER: fastmcp non trouvé initialement"

# Modifier conditionnellement package.json
# Le package.json du code source a "fastmcp": "2.1.2"
RUN if [ "$FASTMCP_SOURCE" = "remote" ]; then \
        echo "BUILDER: FASTMCP_SOURCE est 'remote'. Modification de package.json pour utiliser fastmcp@${FASTMCP_VERSION_TARGET} depuis npm."; \
        # Remplace toute valeur de "fastmcp" (locale, ancienne npm) par la version cible.
        sed -i 's|\("fastmcp":\s*\)"[^"]*"|\1"'${FASTMCP_VERSION_TARGET}'"|' package.json; \
    else \
        echo "BUILDER: FASTMCP_SOURCE est 'local'. Modification de package.json pour utiliser file:./libs/fastmcp-local."; \
        # Remplace toute valeur de "fastmcp" (npm, ancienne locale) par le chemin local.
        sed -i 's|\("fastmcp":\s*\)"[^"]*"|\1"file:./libs/fastmcp-local"|' package.json; \
    fi
RUN echo "BUILDER: Contenu de fastmcp dans package.json APRES modification:" && grep '"fastmcp":' package.json

# Définir NODE_ENV pour l'étape de build (certains outils peuvent le vérifier)
ENV NODE_ENV=production

# Installer toutes les dépendances (y compris devDependencies pour le build)
# pnpm utilisera la version de fastmcp spécifiée dans package.json (modifié).
# On enlève --frozen-lockfile ici pour permettre la mise à jour du lockfile si nécessaire après modification de package.json
# ou on s'assure que le lockfile commité correspond à la source par défaut (ex: local)
RUN echo "BUILDER: Contenu de package.json AVANT pnpm install:"; cat package.json; \
    pnpm install --frozen-lockfile

# Copier le reste du code source de l'application
COPY ./src ./src
COPY tsconfig.json .
# Copier d'autres fichiers de configuration si nécessaire pour le build
COPY eslint.config.js .prettierrc.cjs ./

# Construire l'application (compiler TypeScript en JavaScript)
RUN pnpm run build

# Étape 2: Final (Image d'exécution)
FROM node:${NODE_VERSION} AS final
WORKDIR /app

RUN corepack enable

# Définir NODE_ENV pour l'exécution
ENV NODE_ENV=production

# Créer un groupe et un utilisateur non-root pour l'application
RUN addgroup -S appgroup && \
    adduser -S -D -H --shell /sbin/nologin -G appgroup appuser

# Installer tini (init léger) et curl (pour healthcheck)
RUN apk add --no-cache tini curl

# Copier les fichiers de manifeste pour l'installation des dépendances de production
COPY package.json pnpm-lock.yaml* ./

# Toujours copier le répertoire ./libs pour l'exécution,
# au cas où FASTMCP_SOURCE (variable d'environnement à l'exécution) serait 'local'
# et que le lien symbolique créé par pnpm nécessite la présence des fichiers sources.
COPY ./libs ./libs

# Journaliser la valeur de FASTMCP_SOURCE (argument de build) pour cette étape
RUN echo "FINAL STAGE: Argument de build FASTMCP_SOURCE reçu: $FASTMCP_SOURCE"
RUN echo "FINAL STAGE: Contenu initial de fastmcp dans package.json:" && grep '"fastmcp":' package.json || echo "FINAL STAGE: fastmcp non trouvé initialement"

# Modifier conditionnellement package.json à nouveau pour l'installation de production,
# en se basant sur l'ARGUMENT DE BUILD FASTMCP_SOURCE.
RUN if [ "$FASTMCP_SOURCE" = "remote" ]; then \
        echo "FINAL STAGE: FASTMCP_SOURCE est 'remote'. Modification de package.json pour npm fastmcp@${FASTMCP_VERSION_TARGET} pour l'installation de production."; \
        sed -i 's|\("fastmcp":\s*\)"[^"]*"|\1"'${FASTMCP_VERSION_TARGET}'"|' package.json; \
    else \
        echo "FINAL STAGE: FASTMCP_SOURCE est 'local'. Modification de package.json pour file:./libs/fastmcp-local pour l'installation de production."; \
        sed -i 's|\("fastmcp":\s*\)"[^"]*"|\1"file:./libs/fastmcp-local"|' package.json; \
    fi
RUN echo "FINAL STAGE: Contenu de fastmcp dans package.json APRES modification:" && grep '"fastmcp":' package.json

# Installer UNIQUEMENT les dépendances de PRODUCTION
# Ajout de --ignore-scripts pour éviter l'exécution de husky (devDependency)
RUN echo "FINAL STAGE: Contenu de package.json AVANT pnpm install --prod:"; cat package.json; \
    pnpm install --prod --frozen-lockfile --ignore-scripts

# Copier les fichiers construits (JavaScript) depuis l'étape 'builder'
COPY --from=builder /app/dist ./dist

# Changer le propriétaire des fichiers de l'application pour l'utilisateur non-root
RUN chown -R appuser:appgroup /app

# Basculer vers l'utilisateur non-root
USER appuser

# Argument pour le port, peut être défini lors du build de l'image
ARG PORT=8081
ENV PORT=${PORT}

# La variable d'environnement FASTMCP_SOURCE pour l'exécution sera définie par docker-compose (depuis .env).
# Si vous souhaitez que l'argument de build FASTMCP_SOURCE soit également la valeur par défaut à l'exécution
# (si non surchargé par docker-compose), vous pouvez décommenter la ligne suivante :
# ENV FASTMCP_SOURCE=${FASTMCP_SOURCE}

# Exposer le port sur lequel l'application écoute
EXPOSE ${PORT}

# Utiliser tini comme point d'entrée pour gérer les signaux correctement
ENTRYPOINT ["/sbin/tini", "--"]

# Commande par défaut pour démarrer le serveur Node.js
CMD ["node", "dist/server.js"]
