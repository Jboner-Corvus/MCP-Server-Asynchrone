// src/utils/constants.ts

/**
 * Codes de couleur ANSI pour la journalisation thématique.
 * Utilisés pour améliorer la lisibilité des logs en console.
 */
export const ANSI_COLORS = {
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  MAGENTA: '\x1b[35m',
  CYAN: '\x1b[36m',
  RESET: '\x1b[0m',
  LIGHT_BLUE: '\x1b[94m', // Ajout pour une différenciation
};

/**
 * Nom de la variable d'environnement pour le secret de signature des webhooks.
 * Ce secret est utilisé pour générer et vérifier les signatures HMAC des webhooks.
 */
export const WEBHOOK_SIGNATURE_HEADER = 'X-Webhook-Signature-256';
export const WEBHOOK_SECRET_ENV_VAR = 'WEBHOOK_SECRET';

/**
 * Durée maximale de la trace de la pile (stack trace) dans les logs d'erreur.
 * Permet de limiter la verbosité tout en conservant des informations utiles.
 */
export const ERROR_STACK_TRACE_MAX_LENGTH = 250;

/**
 * Options par défaut pour la file d'attente BullMQ.
 * Utilisées pour configurer les tentatives, le backoff, et la suppression des tâches.
 */
export const DEFAULT_BULLMQ_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: { count: 1000, age: 24 * 3600 }, // Conserver pendant 24 heures
  removeOnFail: { count: 5000, age: 7 * 24 * 3600 }, // Conserver les échecs pendant 7 jours
};

/**
 * Noms des files d'attente BullMQ.
 */
export const TASK_QUEUE_NAME = 'async-tasks';
export const DEAD_LETTER_QUEUE_NAME = 'dead-letter-tasks';

/**
 * Configuration par défaut pour le mécanisme de ping de FastMCP.
 */
export const DEFAULT_PING_OPTIONS = {
  enabled: true,
  intervalMs: 15000, // Augmenté pour moins de verbosité par défaut
  logLevel: 'debug' as const, // 'debug' est un LogLevel valide pour pino et FastMCP
};

/**
 * Configuration par défaut pour le health check de FastMCP.
 */
export const DEFAULT_HEALTH_CHECK_OPTIONS = {
  enabled: true,
  path: '/health', // Maintenu cohérent avec la configuration existante
  message: 'ok',
  status: 200,
};
