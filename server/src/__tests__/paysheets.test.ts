/**
 * Paysheets endpoint tests
 * POST   /api/paysheets/calculate
 * POST   /api/paysheets/bulk-create
 * GET    /api/paysheets/month/:payMonth
 * GET    /api/paysheets
 * POST   /api/paysheets
 * GET    /api/paysheets/:id
 * PUT    /api/paysheets/:id
 * PATCH  /api/paysheets/:id/status
 * DELETE /api/paysheets/:id
 *
 * Route behaviour notes (from reading paysheets.routes.ts):
 * - Valid role codes: GM, AGM, PH, DPH, SRM, RM, BM, BDE, SR_EXEC_HR, JR_EXEC_HR, ...
 * - POST / returns 400 (not 409/404) for duplicate or missing user
 * - GET /:id returns { paysheet: {...} }
 * - PUT /:id returns { message, paysheet: {...} }
 * - PATCH /:id/status returns { message, paysheet: {...} }
 * - DELETE /:id returns { message, paysheet: {...} }
 * - bulk-create uses { payMonth, codeNos: string[] } and returns 200
 * - GET /month/:payMonth validates query params, not the path param
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';

vi.mock('../services/dbStore');
vi.mock('../services/cache');
vi.mock('../plugins/prisma');

import { __resetStore, __seedUser, __seedPaysheet } from '../services/dbStore';
import { __resetTokens } from '../plugins/prisma';
import { buildTestApp } from './helpers/testApp';
import { getAccessToken, authHeader } from './helpers/auth';
import { makeUser, makePaysheet, TEST_USER_CODE } from './helpers/fixtures';

let app: FastifyInstance;
let token: string;

const VALID_ROLE = 'RM'; // Regional Manager — valid role code

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
  __seedUser(makeUser({ role: VALID_ROLE })); // most tests need a user to exist
});

// ── POST /api/paysheets/calculate ──────────────────────────────

describe('POST /api/paysheets/calculate', () => {
  const validCalcPayload = {
    role: VALID_ROLE,
    monthsOfService: 12,
    achieve: 80000,
    allowance: 5000,
    nopay: 0,
    lateHours: 0,
    lateMinutes: 0,
    welfare: 500,
    otherOffer: 0,
    epfAvailability: true,
    etfAvailability: true,
    customEarningName: '',
    customEarningAmount: 0,
    customDeductionName: '',
    customDeductionAmount: 0,
  };

  it('returns calculation result for valid payload', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/paysheets/calculate',
      headers: authHeader(token),
      payload: validCalcPayload,
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty('calculation');
    expect(body.calculation).toHaveProperty('netSalary');
  });

  it('returns 400 for an invalid role code', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/paysheets/calculate',
      headers: authHeader(token),
      payload: { ...validCalcPayload, role: 'AM' }, // 'AM' is not in ALL_ROLE_CODES
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for missing monthsOfService', async () => {
    const { monthsOfService: _m, ...incomplete } = validCalcPayload;
    const res = await app.inject({
      method: 'POST',
      url: '/api/paysheets/calculate',
      headers: authHeader(token),
      payload: incomplete,
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/paysheets/calculate',
      payload: validCalcPayload,
    });
    expect(res.statusCode).toBe(401);
  });
});

// ── GET /api/paysheets ─────────────────────────────────────────

describe('GET /api/paysheets', () => {
  it('returns paginated paysheets list', async () => {
    __seedPaysheet(makePaysheet({ id: 'ps-1', payMonth: '2026-04' }));
    __seedPaysheet(makePaysheet({ id: 'ps-2', payMonth: '2026-03' }));

    const res = await app.inject({
      method: 'GET',
      url: '/api/paysheets',
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty('paysheets');
    expect(body).toHaveProperty('total');
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/paysheets' });
    expect(res.statusCode).toBe(401);
  });
});

// ── GET /api/paysheets/month/:payMonth ─────────────────────────

describe('GET /api/paysheets/month/:payMonth', () => {
  it('returns paginated paysheets for the given month', async () => {
    __seedPaysheet(makePaysheet({ id: 'ps-1', payMonth: '2026-04' }));
    __seedPaysheet(makePaysheet({ id: 'ps-2', payMonth: '2026-03' }));

    const res = await app.inject({
      method: 'GET',
      url: '/api/paysheets/month/2026-04',
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty('paysheets');
    expect(body.month).toBe('2026-04');
  });

  it('returns 200 with empty list for a month with no paysheets', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/paysheets/month/2024-01',
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).total).toBe(0);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/paysheets/month/2026-04' });
    expect(res.statusCode).toBe(401);
  });
});

// ── POST /api/paysheets ────────────────────────────────────────

describe('POST /api/paysheets', () => {
  const validPaysheet = {
    codeNo: TEST_USER_CODE,
    payMonth: '2026-04',
    role: VALID_ROLE,
    monthsOfService: 12,
    achieve: 80000,
    allowance: 5000,
    nopay: 0,
    late: 0,
    lateHours: 0,
    lateMinutes: 0,
    epfAvailability: true,
    etfAvailability: true,
    welfare: 500,
    otherOffer: 0,
    customEarningName: '',
    customEarningAmount: 0,
    customDeductionName: '',
    customDeductionAmount: 0,
  };

  it('creates paysheet and returns 201 with paysheet object', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/paysheets',
      headers: authHeader(token),
      payload: validPaysheet,
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.paysheet.codeNo).toBe(TEST_USER_CODE);
    expect(body.paysheet.payMonth).toBe('2026-04');
  });

  it('returns 400 for duplicate codeNo + payMonth', async () => {
    __seedPaysheet(makePaysheet({ id: 'ps-existing', codeNo: TEST_USER_CODE, payMonth: '2026-04' }));
    const res = await app.inject({
      method: 'POST',
      url: '/api/paysheets',
      headers: authHeader(token),
      payload: validPaysheet,
    });
    // Route sends 400 (not 409) for duplicate
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toMatch(/already exists/i);
  });

  it('returns 400 if user codeNo not found', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/paysheets',
      headers: authHeader(token),
      payload: { ...validPaysheet, codeNo: 'NONEXIST999' },
    });
    // Route sends 400 (not 404) for missing user
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toMatch(/user not found/i);
  });

  it('returns 400 for missing required fields', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/paysheets',
      headers: authHeader(token),
      payload: { codeNo: TEST_USER_CODE },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for invalid role', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/paysheets',
      headers: authHeader(token),
      payload: { ...validPaysheet, role: 'AM' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/paysheets',
      payload: validPaysheet,
    });
    expect(res.statusCode).toBe(401);
  });
});

// ── GET /api/paysheets/:id ─────────────────────────────────────

describe('GET /api/paysheets/:id', () => {
  it('returns paysheet wrapped in { paysheet: {...} }', async () => {
    __seedPaysheet(makePaysheet({ id: 'ps-test-id' }));

    const res = await app.inject({
      method: 'GET',
      url: '/api/paysheets/ps-test-id',
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.paysheet).toBeDefined();
    expect(body.paysheet.id).toBe('ps-test-id');
  });

  it('returns 404 for non-existent id', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/paysheets/no-such-id',
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(404);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/paysheets/ps-test-id' });
    expect(res.statusCode).toBe(401);
  });
});

// ── PUT /api/paysheets/:id ─────────────────────────────────────

describe('PUT /api/paysheets/:id', () => {
  it('updates paysheet and returns { message, paysheet }', async () => {
    __seedPaysheet(makePaysheet({ id: 'ps-update-id', role: VALID_ROLE }));

    const res = await app.inject({
      method: 'PUT',
      url: '/api/paysheets/ps-update-id',
      headers: authHeader(token),
      payload: { achieve: 90000, allowance: 6000 },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.paysheet).toBeDefined();
    expect(body.paysheet.achieve).toBe(90000);
  });

  it('returns 404 for non-existent id', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/paysheets/no-such-id',
      headers: authHeader(token),
      payload: { achieve: 90000 },
    });
    expect(res.statusCode).toBe(404);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/paysheets/ps-update-id',
      payload: { achieve: 90000 },
    });
    expect(res.statusCode).toBe(401);
  });
});

// ── PATCH /api/paysheets/:id/status ───────────────────────────

describe('PATCH /api/paysheets/:id/status', () => {
  it('updates status and returns { message, paysheet }', async () => {
    __seedPaysheet(makePaysheet({ id: 'ps-status-id', status: 'active' }));

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/paysheets/ps-status-id/status',
      headers: authHeader(token),
      payload: { status: 'delete' },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.paysheet.status).toBe('delete');
  });

  it('returns 400 for invalid status value', async () => {
    __seedPaysheet(makePaysheet({ id: 'ps-status-id' }));
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/paysheets/ps-status-id/status',
      headers: authHeader(token),
      payload: { status: 'invalid_status' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 404 for non-existent paysheet', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/paysheets/no-id/status',
      headers: authHeader(token),
      payload: { status: 'delete' },
    });
    expect(res.statusCode).toBe(404);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/paysheets/ps-status-id/status',
      payload: { status: 'delete' },
    });
    expect(res.statusCode).toBe(401);
  });
});

// ── DELETE /api/paysheets/:id ──────────────────────────────────

describe('DELETE /api/paysheets/:id', () => {
  it('deletes paysheet and returns 200 with message', async () => {
    __seedPaysheet(makePaysheet({ id: 'ps-del-id' }));

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/paysheets/ps-del-id',
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toHaveProperty('message');
  });

  it('returns 404 for non-existent id', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/paysheets/no-such-id',
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(404);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/api/paysheets/ps-del-id' });
    expect(res.statusCode).toBe(401);
  });
});

// ── POST /api/paysheets/bulk-create ───────────────────────────

describe('POST /api/paysheets/bulk-create', () => {
  it('bulk creates paysheets for valid codeNos', async () => {
    // bulk-create uses user.role to determine the role code
    __seedUser(makeUser({ codeNo: 'U001', email: 'u1@t.com', role: VALID_ROLE }));

    const res = await app.inject({
      method: 'POST',
      url: '/api/paysheets/bulk-create',
      headers: authHeader(token),
      payload: { payMonth: '2026-05', codeNos: ['U001'] },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty('created');
    expect(typeof body.created).toBe('number');
  });

  it('returns 400 for missing payMonth', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/paysheets/bulk-create',
      headers: authHeader(token),
      payload: { codeNos: ['U001'] },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when codeNos is empty', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/paysheets/bulk-create',
      headers: authHeader(token),
      payload: { payMonth: '2026-05', codeNos: [] },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/paysheets/bulk-create',
      payload: { payMonth: '2026-05', codeNos: ['U001'] },
    });
    expect(res.statusCode).toBe(401);
  });
});
