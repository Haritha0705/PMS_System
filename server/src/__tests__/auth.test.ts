/**
 * Auth endpoint tests
 * POST /api/auth/login
 * POST /api/auth/refresh
 * POST /api/auth/logout
 * GET  /api/auth/me
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';

vi.mock('../services/dbStore');
vi.mock('../services/cache');
vi.mock('../plugins/prisma');

// Import from the MOCKED path (not __mocks__ directly) so we get the same instance
// that the routes use. vi.mock is hoisted before these imports run.
import { __resetStore } from '../services/dbStore';
import { __resetTokens } from '../plugins/prisma';
import { buildTestApp } from './helpers/testApp';

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildTestApp();
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  __resetStore();
  __resetTokens();
});

// ── POST /api/auth/login ───────────────────────────────────────

describe('POST /api/auth/login', () => {
  it('returns 200 with tokens for valid credentials', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'admin', password: 'admin123' },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty('accessToken');
    expect(body).toHaveProperty('refreshToken');
    expect(body.user).toMatchObject({ username: 'admin', role: 'super_admin' });
  });

  it('returns 401 for wrong password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'admin', password: 'wrongpassword' },
    });
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body)).toHaveProperty('error');
  });

  it('returns 401 for unknown username', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'notauser', password: 'admin123' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 400 for missing username', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { password: 'admin123' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for missing password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'admin' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for empty body', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });
});

// ── POST /api/auth/refresh ─────────────────────────────────────

describe('POST /api/auth/refresh', () => {
  async function loginAndGetTokens() {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'admin', password: 'admin123' },
    });
    const body = JSON.parse(res.body);
    if (!body.refreshToken) throw new Error(`Login failed: ${res.body}`);
    return body as { accessToken: string; refreshToken: string };
  }

  it('returns 200 with access + refresh tokens for valid refresh token', async () => {
    const { refreshToken } = await loginAndGetTokens();
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      payload: { refreshToken },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty('accessToken');
    expect(body).toHaveProperty('refreshToken');
  });

  it('returns 401 after token is explicitly revoked via logout', async () => {
    // This tests revocation: logout first, then try to use the refresh token
    const { refreshToken } = await loginAndGetTokens();
    // Revoke via logout
    await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      payload: { refreshToken },
    });
    // Revoked token should be rejected
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      payload: { refreshToken },
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 401 for a fake refresh token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      payload: { refreshToken: 'fake.token.here' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 400 for missing refreshToken field', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });
});

// ── POST /api/auth/logout ──────────────────────────────────────

describe('POST /api/auth/logout', () => {
  it('returns 200 and message on valid logout', async () => {
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'admin', password: 'admin123' },
    });
    const { refreshToken } = JSON.parse(loginRes.body);

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      payload: { refreshToken },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toHaveProperty('message');
  });

  it('returns 400 for missing refreshToken', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });
});

// ── GET /api/auth/me ───────────────────────────────────────────

describe('GET /api/auth/me', () => {
  it('returns admin info with valid token', async () => {
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'admin', password: 'admin123' },
    });
    const { accessToken } = JSON.parse(loginRes.body);

    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toMatchObject({ username: 'admin', name: 'Super Admin', role: 'super_admin' });
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/auth/me' });
    expect(res.statusCode).toBe(401);
  });

  it('returns 401 with invalid token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { Authorization: 'Bearer invalid.token.here' },
    });
    expect(res.statusCode).toBe(401);
  });
});