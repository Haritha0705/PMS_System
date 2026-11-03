/**
 * Vitest mock for services/cache — no-op so tests don't need Redis.
 */

import { vi } from 'vitest';

export const cacheGet = vi.fn(async () => null);
export const cacheSet = vi.fn(async () => {});
export const cacheDel = vi.fn(async () => {});
export const cacheInvalidatePrefix = vi.fn(async () => {});

export const CK = {
  USERS_ALL: 'users:all',
  USERS_STATS: 'users:stats',
  USER: (id: string) => `user:${id}`,
  PAYSHEETS_MONTH: (m: string) => `paysheets:month:${m}`,
  PAYSHEETS_ALL: 'paysheets:all',
  JOB: (id: string) => `job:${id}`,
};
