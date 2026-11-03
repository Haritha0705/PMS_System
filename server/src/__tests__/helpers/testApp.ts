/**
 * Test application factory — builds a Fastify instance with all routes
 * but WITHOUT starting a real HTTP server. Vitest uses inject() to call routes.
 *
 * We mock the database layer so tests never hit the real Neon DB.
 */

import Fastify, { FastifyInstance } from 'fastify';
import authRoutes from '../../modules/auth/auth.routes';
import userRoutes from '../../modules/users/users.routes';
import payrollRoutes from '../../modules/payroll/payroll.routes';
import paysheetRoutes from '../../modules/payroll/paysheets.routes';
import payslipRoutes from '../../modules/payslips/payslips.routes';
import exportRoutes from '../../modules/payslips/export.routes';
import { authMiddleware } from '../../modules/auth/auth.service';

export async function buildTestApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  // Auth routes (unprotected)
  app.register(authRoutes, { prefix: '/api/auth' });

  // Protected routes
  app.register(
    async (fastify) => {
      fastify.addHook('preHandler', authMiddleware);
      fastify.register(userRoutes, { prefix: '/users' });
      fastify.register(payrollRoutes, { prefix: '/payroll' });
      fastify.register(paysheetRoutes, { prefix: '/paysheets' });
      fastify.register(payslipRoutes, { prefix: '/payslips' });
      fastify.register(exportRoutes, { prefix: '/export' });
    },
    { prefix: '/api' }
  );

  app.get('/api/health', async (_req, reply) => reply.send({ status: 'ok' }));

  await app.ready();
  return app;
}
