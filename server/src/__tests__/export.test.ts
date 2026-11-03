/**
 * Export endpoint tests
 * GET /api/export/users-excel
 * GET /api/export/paysheets-excel
 * GET /api/export/paysheets-excel-by-role
 * GET /api/export/paysheets-excel-by-branch
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';

vi.mock('../services/dbStore');
vi.mock('../services/cache');
vi.mock('../plugins/prisma');

// Mock Excel export functions — they now return in-memory buffers (no disk I/O)
vi.mock('../utils/excelExport', () => ({
  exportUsersToExcel: vi.fn(async () => Buffer.from('xlsx-users')),
  exportMonthlyPaysheetsToExcel: vi.fn(async () => Buffer.from('xlsx-paysheets')),
  exportMonthlyPaysheetsByRoleToExcel: vi.fn(async () => Buffer.from('xlsx-role')),
  exportMonthlyPaysheetsByBranchToExcel: vi.fn(async () => Buffer.from('xlsx-branch')),
  exportPaysheetsToMonthBranchZip: vi.fn(async () => Buffer.from('zip-branch')),
}));

import { __resetStore, __seedUser, __seedPaysheet } from '../services/dbStore';
import { __resetTokens } from '../plugins/prisma';
import { buildTestApp } from './helpers/testApp';
import { getAccessToken, authHeader } from './helpers/auth';
import { makeUser, makePaysheet } from './helpers/fixtures';

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

// ── GET /api/export/users-excel ────────────────────────────────

describe('GET /api/export/users-excel', () => {
  it('returns 400 when no users exist', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/export/users-excel',
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toMatch(/no user data/i);
  });

  it('streams Excel file when users exist', async () => {
    __seedUser(makeUser());
    const res = await app.inject({
      method: 'GET',
      url: '/api/export/users-excel',
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('spreadsheet');
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/export/users-excel' });
    expect(res.statusCode).toBe(401);
  });
});

// ── GET /api/export/paysheets-excel ───────────────────────────

describe('GET /api/export/paysheets-excel', () => {
  it('returns 400 when no paysheets exist', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/export/paysheets-excel',
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(400);
  });

  it('streams Excel file when paysheets exist', async () => {
    __seedUser(makeUser());
    __seedPaysheet(makePaysheet());
    const res = await app.inject({
      method: 'GET',
      url: '/api/export/paysheets-excel',
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(200);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/export/paysheets-excel' });
    expect(res.statusCode).toBe(401);
  });
});

// ── GET /api/export/paysheets-excel-by-role ───────────────────

describe('GET /api/export/paysheets-excel-by-role', () => {
  it('returns 400 when no paysheets exist', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/export/paysheets-excel-by-role',
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(400);
  });

  it('streams file when paysheets exist', async () => {
    __seedUser(makeUser());
    __seedPaysheet(makePaysheet());
    const res = await app.inject({
      method: 'GET',
      url: '/api/export/paysheets-excel-by-role',
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(200);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/export/paysheets-excel-by-role' });
    expect(res.statusCode).toBe(401);
  });
});

// ── GET /api/export/paysheets-excel-by-branch ─────────────────

describe('GET /api/export/paysheets-excel-by-branch', () => {
  it('returns 400 when no paysheets exist', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/export/paysheets-excel-by-branch',
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(400);
  });

  it('streams file when paysheets exist', async () => {
    __seedUser(makeUser());
    __seedPaysheet(makePaysheet());
    const res = await app.inject({
      method: 'GET',
      url: '/api/export/paysheets-excel-by-branch',
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(200);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/export/paysheets-excel-by-branch' });
    expect(res.statusCode).toBe(401);
  });
});

// ── GET /api/export/paysheets-json ────────────────────────────

describe('GET /api/export/paysheets-json', () => {
  it('returns 400 when no paysheets exist for the month', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/export/paysheets-json?payMonth=2026-04',
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for missing payMonth query param', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/export/paysheets-json',
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/export/paysheets-json?payMonth=2026-04' });
    expect(res.statusCode).toBe(401);
  });
});

// ── POST /api/export/backup ───────────────────────────────────

describe('POST /api/export/backup', () => {
  it('returns 200 with not_configured status', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/export/backup',
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('not_configured');
    expect(body).toHaveProperty('instructions');
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/export/backup' });
    expect(res.statusCode).toBe(401);
  });
});
