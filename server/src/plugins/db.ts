import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import { getDb, initDatabase } from '../services/db';

// Re-export so the rest of the app can import from plugins/db
export { getDb };

/**
 * Fastify plugin — initialises the Neon PostgreSQL connection and
 * ensures all tables exist.  Register this before any route plugins.
 */
async function dbPlugin(fastify: FastifyInstance): Promise<void> {
  await initDatabase();
  fastify.log.info('Database initialised');
}

export default fp(dbPlugin, { name: 'db' });
