/**
 * Redis plugin — optional singleton IORedis connection.
 * If REDIS_URL is not set the plugin registers but redis is null,
 * and the cache layer falls back to in-memory.
 */

import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import Redis from 'ioredis';
import { ENV } from '../config/env';

let _redis: Redis | null = null;

export function getRedis(): Redis | null {
  return _redis;
}

export async function createRedis(): Promise<Redis | null> {
  if (!ENV.REDIS_URL) return null;
  if (_redis) return _redis;

  const client = new Redis(ENV.REDIS_URL, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,
  });

  await client.connect();
  _redis = client;
  return _redis;
}

async function redisPlugin(fastify: FastifyInstance): Promise<void> {
  try {
    const redis = await createRedis();
    if (redis) {
      fastify.log.info('Redis connected');
      fastify.addHook('onClose', async () => {
        redis.disconnect();
        fastify.log.info('Redis disconnected');
      });
    } else {
      fastify.log.info('Redis not configured — cache running in-memory');
    }
  } catch (err) {
    fastify.log.warn({ err }, 'Redis connection failed — falling back to in-memory cache');
    _redis = null;
  }
}

export default fp(redisPlugin, { name: 'redis' });
