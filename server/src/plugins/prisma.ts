import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { ENV } from '../config/env';

neonConfig.webSocketConstructor = ws;

// ── Singleton ─────────────────────────────────────────────────
// One PrismaClient for the entire server process.
let _prisma: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (!_prisma) {
    if (!ENV.DATABASE_URL) throw new Error('DATABASE_URL is not set');
    const adapter = new PrismaNeon({ connectionString: ENV.DATABASE_URL });
    _prisma = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development'
        ? ['query', 'warn', 'error']
        : ['warn', 'error'],
    });
  }
  return _prisma;
}

// ── Fastify plugin ────────────────────────────────────────────
async function prismaPlugin(fastify: FastifyInstance): Promise<void> {
  const prisma = getPrisma();
  await prisma.$connect();
  fastify.log.info('Prisma connected');

  // Disconnect on server close
  fastify.addHook('onClose', async () => {
    await prisma.$disconnect();
    fastify.log.info('Prisma disconnected');
  });
}

export default fp(prismaPlugin, { name: 'prisma' });
