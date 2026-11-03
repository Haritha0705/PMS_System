/**
 * Manual mock for services/cache — no-op, no Redis needed in tests.
 */

import { vi } from 'vitest';

export const cacheGet = vi.fn(async <T>(_key: string): Promise<T | null> => null);
export const cacheSet = vi.fn(async (): Promise<void> => {});
export const cacheDel = vi.fn(async (): Promise<void> => {});
export const cacheInvalidatePrefix = vi.fn(async (): Promise<void> => {});

export const CK = {
  USERS_ALL: 'users:all',
  USERS_STATS: 'users:stats',
  USER: (id: string) => `user:${id}`,
  PAYSHEETS_MONTH: (m: string) => `paysheets:month:${m}`,
  PAYSHEETS_ALL: 'paysheets:all',
  JOB: (id: string) => `job:${id}`,
};
