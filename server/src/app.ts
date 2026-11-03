// Load environment variables first
require('dotenv').config();

import path from 'path';
import Fastify from 'fastify';
import staticPlugin from '@fastify/static';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
import compress from '@fastify/compress';

import { ENV } from './config/env';
import corsPlugin from './plugins/cors';
import prismaPlugin from './plugins/prisma';
import redisPlugin from './plugins/redis';

// ── Module routes ────────────────────────────────────────────
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/users/users.routes';
import payrollRoutes from './modules/payroll/payroll.routes';
import paysheetRoutes from './modules/payroll/paysheets.routes';
import payslipRoutes from './modules/payslips/payslips.routes';
import exportRoutes from './modules/payslips/export.routes';

import { authMiddleware } from './modules/auth/auth.service';
import { ensureAdmin } from './modules/auth/auth.routes';
import { initDatabase } from './services/db';
import { registerAllWorkers } from './queues/processors';
import { closeQueues } from './queues/queues';
import logger from './utils/logger';

const app = Fastify({
  logger: true,
  bodyLimit: 1_048_576,
});

// ── Plugins ──────────────────────────────────────────────────
app.register(prismaPlugin);
app.register(redisPlugin);
app.register(corsPlugin);
app.register(compress, { global: true });
app.register(helmet, { contentSecurityPolicy: false });

// ── Serve exported files ─────────────────────────────────────
const exportsDir = ENV.OUTPUT_DIR || path.join(__dirname, '..', 'exports');
app.register(staticPlugin, {
  root: exportsDir,
  prefix: '/exports/',
  decorateReply: true,
});

// ── Rate limit login only (5 attempts / 15 min per IP) ───────
app.register(async (fastify) => {
  await fastify.register(rateLimit, {
    max: 5,
    timeWindow: '15 minutes',
    keyGenerator: (req) => req.ip,
    errorResponseBuilder: () => ({
      error: 'Too many login attempts. Please try again in 15 minutes.',
    }),
  });
  fastify.register(authRoutes, { prefix: '/api/auth' });
});


// ── Protected routes ─────────────────────────────────────────
app.register(async (fastify) => {
  fastify.addHook('preHandler', authMiddleware);
  fastify.register(userRoutes,      { prefix: '/users' });
  fastify.register(payrollRoutes,   { prefix: '/payroll' });
  fastify.register(paysheetRoutes,  { prefix: '/paysheets' });
  fastify.register(payslipRoutes,   { prefix: '/payslips' });
  fastify.register(exportRoutes,    { prefix: '/export' });
}, { prefix: '/api' });

// ── Health check ─────────────────────────────────────────────
app.get('/api/health', async (_request, reply) => {
  return reply.send({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Serve frontend static files ───────────────────────────────
const clientPath = ENV.CLIENT_PATH || path.join(__dirname, '../../client/dist');
app.register(staticPlugin, {
  root: clientPath,
  prefix: '/',
  decorateReply: false,
});

// ── React router fallback ─────────────────────────────────────
app.setNotFoundHandler(async (_request, reply) => {
  return reply.sendFile('index.html', clientPath);
});

// ── Graceful shutdown ─────────────────────────────────────────
const shutdown = async (signal: string) => {
  logger.info(`${signal} received — shutting down`);
  await closeQueues();
  await app.close();
  process.exit(0);
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// ── Bootstrap ─────────────────────────────────────────────────
logger.info(`Starting PMS Server with NODE_ENV=${ENV.NODE_ENV}, PORT=${ENV.PORT}`);

initDatabase()
  .then(async () => {
    logger.info('Database initialized successfully');
    await ensureAdmin();
    logger.info('Admin user ensured');

    // Register BullMQ workers (no-op if Redis not configured)
    registerAllWorkers();

    app.listen({ port: ENV.PORT, host: '0.0.0.0' }, (err) => {
      if (err) {
        logger.error('Server failed to start:', err);
        process.exit(1);
      }
      logger.info(`✓ PMS Application Server running on http://localhost:${ENV.PORT}`);
      logger.info('✓ Neon PostgreSQL database connected');
      logger.info(`✓ Redis: ${ENV.REDIS_URL ? 'enabled' : 'not configured (in-memory fallback)'}`);
      logger.info('✓ CORS enabled for: ' + [...ENV.ALLOWED_ORIGINS, `http://localhost:${ENV.PORT}`].join(', '));
    });
  })
  .catch((err) => {
    logger.error('Failed to initialize database:', err);
    logger.error('Stack:', err instanceof Error ? err.stack : '');
    process.exit(1);
  });

export default app;
