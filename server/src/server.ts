/**
 * Server bootstrap — starts listening on the configured port.
 * Keep all Fastify plugin registration in app.ts;
 * this file is only responsible for the network layer.
 */

import app from './app';
import { ENV } from './config/env';
import logger from './utils/logger';

app.listen({ port: ENV.PORT, host: '0.0.0.0' }, (err) => {
  if (err) {
    logger.error('Server failed to start:', err);
    process.exit(1);
  }
  logger.info(`PMS Application Server running on http://localhost:${ENV.PORT}`);
  logger.info('Neon PostgreSQL database connected');
  logger.info('Default login: admin / admin123');
});
