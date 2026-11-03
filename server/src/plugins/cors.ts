import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { ENV } from '../config/env';

// Static allowlist (exact matches) from env + local server origin.
const STATIC_ORIGINS = new Set([...ENV.ALLOWED_ORIGINS, `http://localhost:${ENV.PORT}`]);

// Vercel generates a unique hostname per deployment (preview URLs) plus a
// stable production alias. Allow any deployment of this project so preview
// builds keep working without reconfiguring CORS on every deploy.
const VERCEL_ORIGIN = /^https:\/\/pms-prestige-glamour-group-of-comp[a-z0-9-]*\.vercel\.app$/;

function isAllowedOrigin(origin: string): boolean {
  return STATIC_ORIGINS.has(origin) || VERCEL_ORIGIN.test(origin);
}

async function corsPlugin(fastify: FastifyInstance): Promise<void> {
  fastify.register(cors, {
    origin(origin, cb) {
      // Requests with no Origin header (curl, server-to-server, same-origin) are allowed.
      if (!origin || isAllowedOrigin(origin)) {
        cb(null, true);
        return;
      }
      cb(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
}

export default fp(corsPlugin, { name: 'cors' });
