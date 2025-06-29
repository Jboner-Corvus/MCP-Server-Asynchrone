// src/config.ts
import dotenv from "dotenv";
import { z } from "zod";

// Charge les variables depuis le fichier .env à la racine
dotenv.config();

// Schéma de validation pour toutes les variables d'environnement requises
const configSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8080),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
  AUTH_TOKEN: z.string().min(32, "Le AUTH_TOKEN doit être plus sécurisé."),
  REDIS_HOST: z.string().min(1),
  REDIS_PORT: z.coerce.number().int().positive(),
  REDIS_PASSWORD: z.string().min(1),
  WEBHOOK_SECRET: z.string().min(32, "Le WEBHOOK_SECRET doit être plus sécurisé."),
});

// Valider process.env
const parsedConfig = configSchema.safeParse(process.env);

if (!parsedConfig.success) {
  console.error("❌ Erreurs de configuration dans les variables d'environnement :");
  console.error(parsedConfig.error.format());
  process.exit(1);
}

// Exporter la configuration validée et typée
export const config = parsedConfig.data;