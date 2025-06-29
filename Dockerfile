# Dockerfile (Version Finale Corrigée)

# ÉTAPE 1: BUILDER
FROM node:24-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./

# CORRECTION : Copier le paquet .tgz au lieu du dossier source
COPY ./fastmcp-*.tgz ./

RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

# ÉTAPE 2: FINAL
FROM node:24-alpine AS final
WORKDIR /app
RUN corepack enable
ENV NODE_ENV=production
RUN addgroup -S appgroup && adduser -S -D -G appgroup appuser

COPY package.json pnpm-lock.yaml ./

# CORRECTION : Copier le paquet .tgz pour l'installation de production
COPY ./fastmcp-*.tgz ./

RUN pnpm install --prod --frozen-lockfile --ignore-scripts
COPY --from=builder /app/dist ./dist
RUN chown -R appuser:appgroup /app
USER appuser
EXPOSE 8080
CMD ["pnpm", "run", "start", "--", "--http-stream"]