// src/utils/webhookUtils.ts

import crypto from 'crypto';
import logger from '../logger.js';
import { getErrDetails, WebhookError, ErrorDetails } from './errorUtils.js';
import { config } from '../config.js';
import { WEBHOOK_SIGNATURE_HEADER, WEBHOOK_SECRET_ENV_VAR } from './constants.js';

import type { TaskOutcome } from './asyncToolHelper.js';

/**
 * Génère une signature HMAC SHA256 pour un payload donné.
 */
function generateSignature(payload: unknown): string {
  const secret = config[WEBHOOK_SECRET_ENV_VAR];
  if (!secret) {
    logger.error(
      `[WebhookUtils] ${WEBHOOK_SECRET_ENV_VAR} n'est pas défini. Impossible de signer le webhook.`
    );
    throw new Error(`${WEBHOOK_SECRET_ENV_VAR} is not configured. Cannot sign webhook.`);
  }
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  return hmac.digest('hex');
}

/**
 * Envoie un webhook à l'URL spécifiée avec le payload.
 */
export async function sendWebhook<P, R>(
  url: string,
  payload: TaskOutcome<P, R>,
  taskId: string,
  toolName: string,
  throwErr: boolean = false
): Promise<boolean> {
  const log = logger.child({ taskId, cbUrl: url, tool: toolName, op: 'sendWebhook' });
  try {
    const signature = generateSignature(payload);
    log.info({ payloadSize: JSON.stringify(payload).length }, 'Envoi du webhook avec signature...');
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Task-ID': taskId,
        [WEBHOOK_SIGNATURE_HEADER]: signature,
        'User-Agent': `FastMCP/${toolName}-Callback-Agent/1.1`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      const errBody = await res
        .text()
        .catch(() => "Échec de la récupération du corps de la réponse d'erreur du webhook.");
      log.error(
        { status: res.status, statusText: res.statusText, body: errBody },
        'Le webhook a échoué avec une réponse non-OK.'
      );
      if (throwErr) {
        throw new WebhookError(
          `La livraison du webhook à ${url} a échoué. Statut : ${res.status} ${res.statusText}`,
          'WebhookDeliveryError',
          res.status,
          errBody,
          { originalPayload: payload }
        );
      }
      return false;
    }

    log.info({ status: res.status }, 'Webhook envoyé avec succès.');
    return true;
  } catch (error: unknown) {
    const errDetails: ErrorDetails = getErrDetails(error);
    log.error({ err: errDetails }, "Erreur lors de l'envoi du webhook.");
    if (throwErr) {
      if (error instanceof WebhookError) throw error;
      throw new WebhookError(
        `Erreur d'infrastructure lors de l'envoi du webhook à ${url}: ${errDetails.message}`, // Now uses errDetails.message
        'WebhookInfrastructureError',
        undefined,
        undefined,
        errDetails
      );
    }
    return false;
  }
}

/**
 * Utilitaire pour vérifier la signature HMAC.
 */
export function verifyWebhookSignature(
  payload: string,
  receivedSignature: string,
  secret: string
): boolean {
  if (!payload || !receivedSignature || !secret) {
    logger.warn(
      '[WebhookUtils] Vérification de signature impossible : payload, signature ou secret manquant.'
    );
    return false;
  }
  try {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const computedSignature = hmac.digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(computedSignature, 'hex'),
      Buffer.from(receivedSignature, 'hex')
    );
  } catch (error) {
    logger.error(
      { err: getErrDetails(error) },
      '[WebhookUtils] Erreur lors de la vérification de la signature du webhook.'
    );
    return false;
  }
}
