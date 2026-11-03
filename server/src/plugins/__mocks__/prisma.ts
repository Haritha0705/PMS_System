/**
 * Manual mock for plugins/prisma — returns an in-memory mock PrismaClient.
 * Placed in __mocks__ so Vitest auto-uses it when vi.mock('../plugins/prisma') is called.
 */

import { vi } from 'vitest';

// In-memory refresh token store: hash → expiresAt
export const _tokens = new Map<string, Date>();

export const mockPrisma = {
  refreshToken: {
    create: vi.fn(async ({ data }: { data: { hash: string; expiresAt: Date } }) => {
      _tokens.set(data.hash, data.expiresAt);
      return { id: 1, hash: data.hash, createdAt: new Date(), expiresAt: data.expiresAt };
    }),
    findFirst: vi.fn(async ({ where }: { where: { hash: string; expiresAt?: unknown } }) => {
      const exp = _tokens.get(where.hash);
      if (exp && exp > new Date()) {
        return { id: 1, hash: where.hash, createdAt: new Date(), expiresAt: exp };
      }
      return null;
    }),
    delete: vi.fn(async ({ where }: { where: { hash: string } }) => {
      _tokens.delete(where.hash);
      return { id: 1 };
    }),
    deleteMany: vi.fn(async ({ where }: { where: { hash?: string; expiresAt?: unknown } }) => {
      if (where?.hash) _tokens.delete(where.hash);
      return { count: 0 };
    }),
  },
};

export const getPrisma = vi.fn(() => mockPrisma as unknown as import('@prisma/client').PrismaClient);

// No-op Fastify plugin
export const prismaPlugin = vi.fn(async () => {});

/** Reset token store between tests */
export function __resetTokens(): void {
  _tokens.clear();
}
