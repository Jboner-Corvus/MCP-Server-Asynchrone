import { pino } from 'pino';

import { config } from './config.js';

const logger = pino({
  level: config.LOG_LEVEL,
  transport: config.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
});

export default logger;
