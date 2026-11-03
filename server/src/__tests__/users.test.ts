/**
 * Users endpoint tests
 * GET    /api/users
 * GET    /api/users/stats
 * GET    /api/users/:codeNo
 * POST   /api/users
 * PUT    /api/users/:codeNo
 * DELETE /api/users/:codeNo
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';

vi.mock('../services/dbStore');
vi.mock('../services/cache');
vi.mock('../plugins/prisma');

import { __resetStore, __seedUser } from '../services/dbStore';
import { __resetTokens } from '../plugins/prisma';
import { buildTestApp } from './helpers/testApp';
import { getAccessToken, authHeader } from './helpers/auth';
import { makeUser, TEST_USER_CODE, TEST_USER_CODE_2 } from './helpers/fixtures';

let app: FastifyInstance;
let token: string;

beforeAll(async () => {
  app = await buildTestApp();
  token = await getAccessToken(app);
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  __resetStore();
  __resetTokens();
});

// ── GET /api/users ─────────────────────────────────────────────

describe('GET /api/users', () => {
  it('returns empty list when no users', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/users',
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.users).toEqual([]);
    expect(body.total).toBe(0);
  });

  it('returns users with pagination', async () => {
    __seedUser(makeUser({ codeNo: TEST_USER_CODE }));
    __seedUser(makeUser({ codeNo: TEST_USER_CODE_2, email: 'jane@test.com' }));

    const res = await app.inject({
      method: 'GET',
      url: '/api/users?page=1&limit=1',
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.total).toBe(2);
    expect(body.users).toHaveLength(1);
    expect(body.totalPages).toBe(2);
  });

  it('filters by branch', async () => {
    __seedUser(makeUser({ codeNo: TEST_USER_CODE, branch: 'Colombo' }));
    __seedUser(makeUser({ codeNo: TEST_USER_CODE_2, branch: 'Kandy', email: 'test2@test.com' }));

    const res = await app.inject({
      method: 'GET',
      url: '/api/users?branch=Kandy',
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.total).toBe(1);
    expect(body.users[0].branch).toBe('Kandy');
  });

  it('filters by status', async () => {
    __seedUser(makeUser({ codeNo: TEST_USER_CODE, status: 'active' }));
    __seedUser(makeUser({ codeNo: TEST_USER_CODE_2, status: 'delete', email: 'del@test.com' }));

    const res = await app.inject({
      method: 'GET',
      url: '/api/users?status=active',
      headers: authHeader(token),
    });
    const body = JSON.parse(res.body);
    expect(body.total).toBe(1);
    expect(body.users[0].status).toBe('active');
  });

  it('searches by first name', async () => {
    __seedUser(makeUser({ codeNo: TEST_USER_CODE, firstName: 'Alice', email: 'alice@test.com' }));
    __seedUser(makeUser({ codeNo: TEST_USER_CODE_2, firstName: 'Bob', email: 'bob@test.com' }));

    const res = await app.inject({
      method: 'GET',
      url: '/api/users?search=alice',
      headers: authHeader(token),
    });
    const body = JSON.parse(res.body);
    expect(body.total).toBe(1);
    expect(body.users[0].firstName).toBe('Alice');
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/users' });
    expect(res.statusCode).toBe(401);
  });
});

// ── GET /api/users/stats ───────────────────────────────────────

describe('GET /api/users/stats', () => {
  it('returns correct totals', async () => {
    __seedUser(makeUser({ codeNo: TEST_USER_CODE, status: 'active', basicSalary: 50000, allowances: 5000, deductions: 1000 }));
    __seedUser(makeUser({ codeNo: TEST_USER_CODE_2, status: 'delete', email: 'del@test.com' }));

    const res = await app.inject({
      method: 'GET',
      url: '/api/users/stats',
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.totalUsers).toBe(2);
    expect(body.activeUsers).toBe(1);
    expect(body.deletedUsers).toBe(1);
    expect(body.totalMonthlySalary).toBe(54000); // 50000+5000-1000
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/users/stats' });
    expect(res.statusCode).toBe(401);
  });
});

// ── GET /api/users/:codeNo ─────────────────────────────────────

describe('GET /api/users/:codeNo', () => {
  it('returns user for existing codeNo', async () => {
    __seedUser(makeUser());
    const res = await app.inject({
      method: 'GET',
      url: `/api/users/${TEST_USER_CODE}`,
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).codeNo).toBe(TEST_USER_CODE);
  });

  it('returns 404 for non-existent codeNo', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/users/NOTEXIST',
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(404);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: `/api/users/${TEST_USER_CODE}` });
    expect(res.statusCode).toBe(401);
  });
});

// ── POST /api/users ────────────────────────────────────────────

describe('POST /api/users', () => {
  const validUser = {
    codeNo: TEST_USER_CODE,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@test.com',
    phone: '0771234567',
    branch: 'Colombo',
    role: 'AM',
    designation: 'Area Manager',
    basicSalary: 50000,
  };

  it('creates user and returns 201', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/users',
      headers: authHeader(token),
      payload: validUser,
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.codeNo).toBe(TEST_USER_CODE);
    expect(body.firstName).toBe('John');
  });

  it('returns 409 if codeNo already exists', async () => {
    __seedUser(makeUser());
    const res = await app.inject({
      method: 'POST',
      url: '/api/users',
      headers: authHeader(token),
      payload: validUser,
    });
    expect(res.statusCode).toBe(409);
  });

  it('returns 409 if email already exists', async () => {
    __seedUser(makeUser({ codeNo: TEST_USER_CODE_2, email: 'john.doe@test.com' }));
    const res = await app.inject({
      method: 'POST',
      url: '/api/users',
      headers: authHeader(token),
      payload: validUser,
    });
    expect(res.statusCode).toBe(409);
  });

  it('returns 400 for missing required field (firstName)', async () => {
    const { firstName: _f, ...noFirstName } = validUser;
    const res = await app.inject({
      method: 'POST',
      url: '/api/users',
      headers: authHeader(token),
      payload: noFirstName,
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for invalid email format', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/users',
      headers: authHeader(token),
      payload: { ...validUser, email: 'not-an-email' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for negative basicSalary', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/users',
      headers: authHeader(token),
      payload: { ...validUser, basicSalary: -1000 },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/users',
      payload: validUser,
    });
    expect(res.statusCode).toBe(401);
  });
});

// ── PUT /api/users/:codeNo ─────────────────────────────────────

describe('PUT /api/users/:codeNo', () => {
  it('updates and returns updated user', async () => {
    __seedUser(makeUser());
    const res = await app.inject({
      method: 'PUT',
      url: `/api/users/${TEST_USER_CODE}`,
      headers: authHeader(token),
      payload: { firstName: 'Jane', email: 'jane.doe@test.com' },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.firstName).toBe('Jane');
    expect(body.codeNo).toBe(TEST_USER_CODE);
  });

  it('returns 404 for non-existent user', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/users/NOTEXIST',
      headers: authHeader(token),
      payload: { firstName: 'Jane' },
    });
    expect(res.statusCode).toBe(404);
  });

  it('returns 409 when updating to email already used by another user', async () => {
    __seedUser(makeUser({ codeNo: TEST_USER_CODE }));
    __seedUser(makeUser({ codeNo: TEST_USER_CODE_2, email: 'taken@test.com' }));

    const res = await app.inject({
      method: 'PUT',
      url: `/api/users/${TEST_USER_CODE}`,
      headers: authHeader(token),
      payload: { email: 'taken@test.com' },
    });
    expect(res.statusCode).toBe(409);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/api/users/${TEST_USER_CODE}`,
      payload: { firstName: 'Jane' },
    });
    expect(res.statusCode).toBe(401);
  });
});

// ── DELETE /api/users/:codeNo ──────────────────────────────────

describe('DELETE /api/users/:codeNo', () => {
  it('deletes user and returns 200 with message', async () => {
    __seedUser(makeUser());
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/users/${TEST_USER_CODE}`,
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toHaveProperty('message');
  });

  it('returns 404 for non-existent user', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/users/NOTEXIST',
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(404);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/users/${TEST_USER_CODE}`,
    });
    expect(res.statusCode).toBe(401);
  });
});
