// src/utils/errorUtils.ts

import { ERROR_STACK_TRACE_MAX_LENGTH } from './constants.js';

export interface ErrorDetails {
  message: string;
  name: string;
  type?: string;
  details?: unknown;
  stack?: string;
}

export class AppErrorBase extends Error {
  public type: string;
  public details?: unknown;

  constructor(message: string, type: string, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.type = type;
    this.details = details;
  }
}

export class EnqueueTaskError extends AppErrorBase {
  constructor(message: string, details?: unknown) {
    super(message, 'EnqueueTaskError', details);
  }
}

export class WebhookError extends AppErrorBase {
  public statusCode?: number;
  public responseBody?: string;
  constructor(
    message: string,
    type: string = 'WebhookError',
    statusCode?: number,
    responseBody?: string,
    details?: unknown
  ) {
    super(message, type, details);
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
}

export function getErrDetails(error: unknown): ErrorDetails {
  if (error instanceof AppErrorBase) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack?.substring(0, ERROR_STACK_TRACE_MAX_LENGTH),
      type: error.type,
      details: error.details,
    };
  }
  if (error instanceof Error) {
    let type = 'GenericError';
    if ('code' in error) type = (error as { code: string }).code;

    return {
      message: error.message,
      name: error.name,
      stack: error.stack?.substring(0, ERROR_STACK_TRACE_MAX_LENGTH),
      type: type,
      details: 'details' in error ? (error as { details: unknown }).details : undefined,
    };
  }
  const name = 'UnknownError';
  const type = 'UnknownErrorType';
  let msgValue = 'An unknown error occurred.';
  let detailsValue: { originalError: unknown; [key: string]: unknown } = { originalError: error };
  if (typeof error === 'string') {
    msgValue = error;
  } else if (error && typeof error === 'object') {
    if ('message' in error && typeof (error as { message: unknown }).message === 'string') {
      msgValue = (error as { message: string }).message;
    } else {
      try {
        msgValue = JSON.stringify(error);
      } catch {
        // _e variable removed as it's unused
        // msgValue reste 'An unknown error occurred.' ou 'Failed to stringify...'
      }
    }
    if (detailsValue.originalError === error) {
      detailsValue = { ...(error as object), originalError: error };
    } else {
      detailsValue = { ...detailsValue, ...(error as object) };
    }
  }

  return {
    message: msgValue,
    name,
    stack: undefined,
    type,
    details: detailsValue,
  };
}
