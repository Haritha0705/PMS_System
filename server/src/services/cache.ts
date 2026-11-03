/**
 * Cache service — Redis-backed with automatic in-memory fallback.
 * Same interface whether Redis is available or not.
 *
 * Usage:
 *   const users = await cacheGet<User[]>('users:all');
 *   await cacheSet('users:all', users, 180);          // 180 s TTL
 *   await cacheDel('users:all');
 *   await cacheInvalidatePrefix('users:');             // wildcard delete
 */

import { getRedis } from '../plugins/redis';

// ── In-memory fallback ────────────────────────────────────────

const mem = new Map<string, { data: unknown; exp: number }>();

function memGet<T>(key: string): T | null {
  const e = mem.get(key);
  if (!e || Date.now() > e.exp) { mem.delete(key); return null; }
  return e.data as T;
}

function memSet(key: string, data: unknown, ttlSec: number): void {
  mem.set(key, { data, exp: Date.now() + ttlSec * 1000 });
}

function memDel(key: string): void {
  mem.delete(key);
}

function memDelPrefix(prefix: string): void {
  for (const k of mem.keys()) if (k.startsWith(prefix)) mem.delete(k);
}

// ── Public API ────────────────────────────────────────────────

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (redis) {
    try {
      const raw = await redis.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch { return null; }
  }
  return memGet<T>(key);
}

export async function cacheSet(key: string, data: unknown, ttlSec = 60): Promise<void> {
  const redis = getRedis();
  if (redis) {
    try {
      await redis.set(key, JSON.stringify(data), 'EX', ttlSec);
      return;
    } catch { /* fall through to memory */ }
  }
  memSet(key, data, ttlSec);
}

export async function cacheDel(key: string): Promise<void> {
  const redis = getRedis();
  if (redis) {
    try { await redis.del(key); return; } catch { /* fall through */ }
  }
  memDel(key);
}

export async function cacheInvalidatePrefix(prefix: string): Promise<void> {
  const redis = getRedis();
  if (redis) {
    try {
      // SCAN instead of KEYS to avoid blocking large keyspaces
      let cursor = '0';
      do {
        const [next, keys] = await redis.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 100);
        if (keys.length) await redis.del(...keys);
        cursor = next;
      } while (cursor !== '0');
      return;
    } catch { /* fall through */ }
  }
  memDelPrefix(prefix);
}

// ── Cache key constants ───────────────────────────────────────

export const CK = {
  USERS_ALL:          'users:all',
  USERS_STATS:        'users:stats',
  USER:               (id: string) => `user:${id}`,
  PAYSHEETS_MONTH:    (m: string) => `paysheets:month:${m}`,
  PAYSHEETS_ALL:      'paysheets:all',
  PAYROLL_ALL:        'payroll:all',
  JOB:                (id: string) => `job:${id}`,
} as const;
