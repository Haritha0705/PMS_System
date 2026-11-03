/**
 * Vitest mock for plugins/prisma — returns a mock PrismaClient
 * so tests never connect to the real database.
 */

import { vi } from 'vitest';

// In-memory refresh token store: hash → expiresAt
const _tokens = new Map<string, Date>();

const mockPrisma = {
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
      if (where.hash) {
        _tokens.delete(where.hash);
      }
      return { count: 0 };
    }),
  },
  admin: {
    findFirst: vi.fn(async () => null),
    upsert: vi.fn(async () => ({})),
  },
  user: {
    findMany: vi.fn(async () => []),
    findUnique: vi.fn(async () => null),
    create: vi.fn(async () => ({})),
    update: vi.fn(async () => ({})),
    delete: vi.fn(async () => ({})),
  },
  monthlyPaysheet: {
    findMany: vi.fn(async () => []),
    findUnique: vi.fn(async () => null),
    create: vi.fn(async () => ({})),
    createMany: vi.fn(async () => ({ count: 0 })),
    update: vi.fn(async () => ({})),
    delete: vi.fn(async () => ({})),
  },
  payrollRecord: {
    findMany: vi.fn(async () => []),
    findUnique: vi.fn(async () => null),
    create: vi.fn(async () => ({})),
    delete: vi.fn(async () => ({})),
  },
};

export const getPrisma = vi.fn(() => mockPrisma as unknown as ReturnType<typeof import('../../plugins/prisma').getPrisma>);
export const prismaPlugin = vi.fn(async () => {});

/** Reset the token store between tests */
export function __resetTokens() {
  _tokens.clear();
  vi.clearAllMocks();
  // Re-bind after clearAllMocks
  mockPrisma.refreshToken.create.mockImplementation(async ({ data }: { data: { hash: string; expiresAt: Date } }) => {
    _tokens.set(data.hash, data.expiresAt);
    return { id: 1, hash: data.hash, createdAt: new Date(), expiresAt: data.expiresAt };
  });
  mockPrisma.refreshToken.findFirst.mockImplementation(async ({ where }: { where: { hash: string } }) => {
    const exp = _tokens.get(where.hash);
    if (exp && exp > new Date()) {
      return { id: 1, hash: where.hash, createdAt: new Date(), expiresAt: exp };
    }
    return null;
  });
  mockPrisma.refreshToken.deleteMany.mockImplementation(async ({ where }: { where: { hash?: string } }) => {
    if (where.hash) _tokens.delete(where.hash);
    return { count: 0 };
  });
}

export { mockPrisma };
