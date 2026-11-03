/**
 * Payroll endpoint tests
 * POST   /api/payroll/generate
 * GET    /api/payroll/history
 * GET    /api/payroll/:id
 * DELETE /api/payroll/:id
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';

vi.mock('../services/dbStore');
vi.mock('../services/cache');
vi.mock('../plugins/prisma');

import { __resetStore, __seedUser, __seedPayroll } from '../services/dbStore';
import { __resetTokens } from '../plugins/prisma';
import { buildTestApp } from './helpers/testApp';
import { getAccessToken, authHeader } from './helpers/auth';
import { makeUser, makePayrollRecord, TEST_USER_CODE } from './helpers/fixtures';

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

// ── POST /api/payroll/generate ─────────────────────────────────

describe('POST /api/payroll/generate', () => {
  it('generates payroll for specified employee', async () => {
    __seedUser(makeUser());

    const res = await app.inject({
      method: 'POST',
      url: '/api/payroll/generate',
      headers: authHeader(token),
      payload: { codeNos: [TEST_USER_CODE], period: '2026-01' },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.records).toHaveLength(1);
    expect(body.records[0].codeNo).toBe(TEST_USER_CODE);
    expect(body.records[0].period).toBe('2026-01');
  });

  it('generates payroll for all active employees when codeNos is empty', async () => {
    __seedUser(makeUser({ codeNo: 'U001', email: 'u1@test.com', status: 'active' }));
    __seedUser(makeUser({ codeNo: 'U002', email: 'u2@test.com', status: 'active' }));
    __seedUser(makeUser({ codeNo: 'U003', email: 'u3@test.com', status: 'delete' }));

    const res = await app.inject({
      method: 'POST',
      url: '/api/payroll/generate',
      headers: authHeader(token),
      payload: { codeNos: [], period: '2026-02' },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.records).toHaveLength(2); // only active users
  });

  it('returns existing record when payroll already generated for that period', async () => {
    __seedUser(makeUser());
    const existing = makePayrollRecord({ period: '2026-01' });
    __seedPayroll(existing);

    const res = await app.inject({
      method: 'POST',
      url: '/api/payroll/generate',
      headers: authHeader(token),
      payload: { codeNos: [TEST_USER_CODE], period: '2026-01' },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.records[0].id).toBe(existing.id);
  });

  it('returns 400 for invalid period format', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/payroll/generate',
      headers: authHeader(token),
      payload: { codeNos: [], period: '01-2026' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for missing period', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/payroll/generate',
      headers: authHeader(token),
      payload: { codeNos: [] },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/payroll/generate',
      payload: { codeNos: [], period: '2026-01' },
    });
    expect(res.statusCode).toBe(401);
  });
});

// ── GET /api/payroll/history ───────────────────────────────────

describe('GET /api/payroll/history', () => {
  it('returns all payroll records', async () => {
    __seedPayroll(makePayrollRecord({ id: 'pr-1', period: '2026-01' }));
    __seedPayroll(makePayrollRecord({ id: 'pr-2', period: '2026-02' }));

    const res = await app.inject({
      method: 'GET',
      url: '/api/payroll/history',
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).total).toBe(2);
  });

  it('filters by period', async () => {
    __seedPayroll(makePayrollRecord({ id: 'pr-1', period: '2026-01' }));
    __seedPayroll(makePayrollRecord({ id: 'pr-2', period: '2026-02' }));

    const res = await app.inject({
      method: 'GET',
      url: '/api/payroll/history?period=2026-01',
      headers: authHeader(token),
    });
    const body = JSON.parse(res.body);
    expect(body.total).toBe(1);
    expect(body.records[0].period).toBe('2026-01');
  });

  it('filters by codeNo', async () => {
    __seedPayroll(makePayrollRecord({ id: 'pr-1', codeNo: TEST_USER_CODE }));
    __seedPayroll(makePayrollRecord({ id: 'pr-2', codeNo: 'OTHER001' }));

    const res = await app.inject({
      method: 'GET',
      url: `/api/payroll/history?codeNo=${TEST_USER_CODE}`,
      headers: authHeader(token),
    });
    const body = JSON.parse(res.body);
    expect(body.total).toBe(1);
    expect(body.records[0].codeNo).toBe(TEST_USER_CODE);
  });

  it('searches by userName', async () => {
    __seedPayroll(makePayrollRecord({ id: 'pr-1', userName: 'John Doe' }));
    __seedPayroll(makePayrollRecord({ id: 'pr-2', userName: 'Jane Smith' }));

    const res = await app.inject({
      method: 'GET',
      url: '/api/payroll/history?search=john',
      headers: authHeader(token),
    });
    const body = JSON.parse(res.body);
    expect(body.total).toBe(1);
    expect(body.records[0].userName).toBe('John Doe');
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/payroll/history' });
    expect(res.statusCode).toBe(401);
  });
});

// ── GET /api/payroll/:id ───────────────────────────────────────

describe('GET /api/payroll/:id', () => {
  it('returns payroll record by id', async () => {
    const record = makePayrollRecord();
    __seedPayroll(record);

    const res = await app.inject({
      method: 'GET',
      url: `/api/payroll/${record.id}`,
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).id).toBe(record.id);
  });

  it('returns 404 for non-existent id', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/payroll/nonexistent-id',
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(404);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/payroll/some-id' });
    expect(res.statusCode).toBe(401);
  });
});

// ── DELETE /api/payroll/:id ────────────────────────────────────

describe('DELETE /api/payroll/:id', () => {
  it('deletes payroll record and returns 200 with message', async () => {
    const record = makePayrollRecord();
    __seedPayroll(record);

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/payroll/${record.id}`,
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toHaveProperty('message');
  });

  it('returns 404 for non-existent id', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/payroll/nonexistent-id',
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(404);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/api/payroll/some-id' });
    expect(res.statusCode).toBe(401);
  });
});
