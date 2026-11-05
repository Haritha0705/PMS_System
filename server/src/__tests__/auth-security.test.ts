/**
 * Auth behaviour with the real rate-limit plugin:
 * only password routes are limited, the limit answers 429, and changing the
 * password replaces it and signs out every session.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';

vi.mock('../services/dbStore');
vi.mock('../services/cache');
vi.mock('../plugins/prisma');

import { __resetStore, _admin } from '../services/dbStore';
import { __resetTokens } from '../plugins/prisma';
import authRoutes, { authRateLimitOptions } from '../modules/auth/auth.routes';
import { updateUserSchema, createUserSchema } from '../validation/users';

let app: FastifyInstance;
const originalAdmin = { ..._admin };

const post = (url: string, payload?: object, token?: string) =>
  app.inject({
    method: 'POST',
    url: `/api/auth${url}`,
    payload,
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });

const login = (password = 'admin123') => post('/login', { username: 'admin', password });

beforeEach(async () => {
  __resetStore();
  __resetTokens();
  Object.assign(_admin, originalAdmin);
  app = Fastify({ logger: false });
  await app.register(rateLimit, authRateLimitOptions);
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.ready();
});

afterEach(() => app.close());

describe('rate limit', () => {
  it('answers 429 after 5 login attempts', async () => {
    for (let i = 0; i < 5; i++) expect((await login('wrong-password')).statusCode).toBe(401);

    const blocked = await login();
    expect(blocked.statusCode).toBe(429);
    expect(JSON.parse(blocked.body).error).toMatch(/too many attempts/i);
  });

  it('never limits page loads (refresh and /me)', async () => {
    const { accessToken, refreshToken } = JSON.parse((await login()).body);

    for (let i = 0; i < 8; i++) {
      const me = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: { authorization: `Bearer ${accessToken}` },
      });
      expect(me.statusCode).toBe(200);
    }
    expect((await post('/refresh', { refreshToken })).statusCode).toBe(200);
    expect((await login()).statusCode).toBe(200);
  });
});

describe('POST /change-password', () => {
  const change = async (currentPassword: string, newPassword: string) => {
    const { accessToken } = JSON.parse((await login()).body);
    return post('/change-password', { currentPassword, newPassword }, accessToken);
  };

  it('requires a token', async () => {
    const res = await post('/change-password', { currentPassword: 'admin123', newPassword: 'new-password-1' });
    expect(res.statusCode).toBe(401);
  });

  it('refuses a wrong current password', async () => {
    const res = await change('not-the-password', 'new-password-1');
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toMatch(/current password is incorrect/i);
  });

  it('refuses a short password and an unchanged one', async () => {
    expect(JSON.parse((await change('admin123', 'short')).body).error).toMatch(/at least 8/i);
    expect(JSON.parse((await change('admin123', 'admin123')).body).error).toMatch(/different/i);
  });

  it('replaces the password and ends every session', async () => {
    const { refreshToken } = JSON.parse((await login()).body);
    await new Promise((resolve) => setTimeout(resolve, 1100)); // tokens differ per second

    expect((await change('admin123', 'new-password-1')).statusCode).toBe(200);

    expect((await post('/refresh', { refreshToken })).statusCode).toBe(401);
    expect((await login('admin123')).statusCode).toBe(401);
    expect((await login('new-password-1')).statusCode).toBe(200);
  });
});

describe('employee join date', () => {
  const employee = { codeNo: 'E1', firstName: 'A', lastName: 'B', email: 'a@b.lk' };

  it('accepts an empty date from the form, on create and on edit', () => {
    expect(createUserSchema.safeParse({ ...employee, joinDate: '' }).success).toBe(true);
    expect(updateUserSchema.safeParse({ joinDate: '' }).success).toBe(true);
  });

  it('still rejects a badly formatted date', () => {
    expect(updateUserSchema.safeParse({ joinDate: '15/01/2026' }).success).toBe(false);
  });
});
