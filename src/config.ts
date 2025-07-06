// src/config.ts (Simplifié)

import path from 'path';
import { fileURLToPath } from 'url';

import dotenv from 'dotenv';
import { z } from 'zod';

import { WEBHOOK_SECRET_ENV_VAR, DEFAULT_HEALTH_CHECK_OPTIONS } from './utils/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger les variables d'environnement depuis le fichier .env à la racine du projet, sauf en mode test
if (process.env.NODE_ENV !== 'test') {
  dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(8081),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  HTTP_STREAM_ENDPOINT: z.string().startsWith('/').default('/stream'),
  AUTH_TOKEN: z.string().min(16, 'AUTH_TOKEN doit comporter au moins 16 caractères.'),
  REDIS_HOST: z.string().min(1).default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  HEALTH_CHECK_PATH: z
    .string()
    .startsWith('/')
    .default(DEFAULT_HEALTH_CHECK_OPTIONS.path)
    .describe("Chemin pour le point de terminaison de vérification de l'état."),
  [WEBHOOK_SECRET_ENV_VAR]: z
    .string()
    .min(
      32,
      `${WEBHOOK_SECRET_ENV_VAR} doit comporter au moins 32 caractères pour une sécurité adéquate.`
    ),
  // Les variables FASTMCP_SOURCE et FASTMCP_REMOTE_VERSION ont été retirées.
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("❌ Variables d'environnement invalides détectées dans .env:");
  for (const error of parsedEnv.error.issues) {
    console.error(`  - Champ: ${error.path.join('.') || 'global'}, Problème: ${error.message}`);
  }
  console.error("Veuillez corriger les variables d'environnement et redémarrer l'application.");
  process.exit(1);
}

export const config = parsedEnv.data;

// Vérification de sécurité critique pour AUTH_TOKEN en production
if (
  config.NODE_ENV === 'production' &&
  (!config.AUTH_TOKEN ||
    config.AUTH_TOKEN === 'YOUR_STRONG_SECRET_TOKEN_HERE_CHANGE_ME' ||
    config.AUTH_TOKEN === 'CHANGE_THIS_STRONG_SECRET_TOKEN' ||
    config.AUTH_TOKEN.length < 16)
) {
  console.error(
    'ERREUR CRITIQUE DE SÉCURITÉ : AUTH_TOKEN est manquant, trop court, ou utilise une valeur par défaut en environnement de PRODUCTION.'
  );
  console.error(
    'Veuillez définir un AUTH_TOKEN fort et unique dans votre fichier .env pour la production.'
  );
  process.exit(1);
}
