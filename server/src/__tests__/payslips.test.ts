/**
 * Payslips endpoint tests
 * POST /api/payslips/generate      → 202 (starts background job)
 * GET  /api/payslips/progress/:id  → 200 job status / 404
 * GET  /api/payslips/download/:id  → 200 ZIP / 400 not ready / 410 cleaned / 404
 * POST /api/payslips/print         → 200 / 400 / 500
 * GET  /api/payslips/pdf/:id       → 200 PDF / 404 / 500
 *
 * payslipService is mocked so Puppeteer / worker threads never run.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import fs from 'fs';

vi.mock('../services/dbStore');
vi.mock('../services/cache');
vi.mock('../plugins/prisma');

// Mock payslipService — avoid Puppeteer / worker threads in tests
vi.mock('../services/payslipService', () => {
  const jobs = new Map<string, Record<string, unknown>>();

  return {
    startPayslipGeneration: vi.fn(async (payMonth: string, codeNos: string[] | undefined) => {
      const id = `job-${Date.now()}`;
      const job = {
        id, status: 'processing', payMonth,
        total: codeNos?.length ?? 1, completed: 0, failed: 0,
        progress: 0, error: null, createdAt: new Date().toISOString(), zipPath: null,
      };
      jobs.set(id, job);
      return { job, skipped: [] };
    }),

    getJob: vi.fn(async (jobId: string) => jobs.get(jobId) ?? null),

    printPayslips: vi.fn(async (_jobId: string, _printerName?: string, _copies?: number) => {
      return 'Print job sent successfully';
    }),

    generateSinglePdf: vi.fn(async (paysheetId: string): Promise<Buffer> => {
      if (paysheetId === 'not-found-id') {
        throw new Error('Paysheet not found');
      }
      return Buffer.from('%PDF-1.4 test pdf content');
    }),

    // Expose helper to seed a completed job
    __seedCompletedJob: (id: string, zipPath: string) => {
      jobs.set(id, {
        id, status: 'completed', total: 1, completed: 1, failed: 0,
        progress: 100, error: null, createdAt: new Date().toISOString(), zipPath,
      });
    },

    __seedJob: (id: string, overrides: Record<string, unknown>) => {
      jobs.set(id, { id, status: 'processing', total: 1, completed: 0, failed: 0, progress: 0, error: null, createdAt: new Date().toISOString(), zipPath: null, ...overrides });
    },

    __clearJobs: () => jobs.clear(),
  };
});

import { __resetStore } from '../services/dbStore';
import { __resetTokens } from '../plugins/prisma';
import { buildTestApp } from './helpers/testApp';
import { getAccessToken, authHeader } from './helpers/auth';

let app: FastifyInstance;
let token: string;

const TEST_ZIP = '/tmp/test-payslips.zip';

beforeAll(async () => {
  app = await buildTestApp();
  token = await getAccessToken(app);
  // Create a real zip file for download tests
  if (!fs.existsSync(TEST_ZIP)) fs.writeFileSync(TEST_ZIP, 'PK fake zip content');
});

afterAll(async () => {
  await app.close();
});

beforeEach(async () => {
  __resetStore();
  __resetTokens();
  // Clear mock job store
  const svc = await import('../services/payslipService') as Record<string, unknown>;
  (svc.__clearJobs as () => void)();
});

// ── POST /api/payslips/generate ────────────────────────────────

describe('POST /api/payslips/generate', () => {
  it('returns 202 with jobId when payMonth is valid', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/payslips/generate',
      headers: authHeader(token),
      payload: { payMonth: '2026-04' },
    });
    expect(res.statusCode).toBe(202);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty('jobId');
    expect(body).toHaveProperty('total');
  });

  it('accepts optional codeNos array', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/payslips/generate',
      headers: authHeader(token),
      payload: { payMonth: '2026-04', codeNos: ['EMP001', 'EMP002'] },
    });
    expect(res.statusCode).toBe(202);
  });

  it('returns 400 for missing payMonth', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/payslips/generate',
      headers: authHeader(token),
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for invalid payMonth format', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/payslips/generate',
      headers: authHeader(token),
      payload: { payMonth: '04/2026' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/payslips/generate',
      payload: { payMonth: '2026-04' },
    });
    expect(res.statusCode).toBe(401);
  });
});

// ── GET /api/payslips/progress/:jobId ─────────────────────────

describe('GET /api/payslips/progress/:jobId', () => {
  it('returns job status for existing jobId', async () => {
    // First create a job
    const genRes = await app.inject({
      method: 'POST',
      url: '/api/payslips/generate',
      headers: authHeader(token),
      payload: { payMonth: '2026-04' },
    });
    const { jobId } = JSON.parse(genRes.body);

    const res = await app.inject({
      method: 'GET',
      url: `/api/payslips/progress/${jobId}`,
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('progress');
    expect(body).toHaveProperty('total');
  });

  it('returns 404 for non-existent jobId', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/payslips/progress/no-such-job',
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(404);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/payslips/progress/some-id' });
    expect(res.statusCode).toBe(401);
  });
});

// ── GET /api/payslips/download/:jobId ─────────────────────────

describe('GET /api/payslips/download/:jobId', () => {
  it('returns 400 when job is still processing', async () => {
    const genRes = await app.inject({
      method: 'POST',
      url: '/api/payslips/generate',
      headers: authHeader(token),
      payload: { payMonth: '2026-04' },
    });
    const { jobId } = JSON.parse(genRes.body);

    const res = await app.inject({
      method: 'GET',
      url: `/api/payslips/download/${jobId}`,
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toMatch(/not ready/i);
  });

  it('returns 200 and streams ZIP for completed job', async () => {
    const svc = await import('../services/payslipService') as Record<string, unknown>;
    (svc.__seedCompletedJob as (id: string, path: string) => void)('completed-job', TEST_ZIP);

    const res = await app.inject({
      method: 'GET',
      url: '/api/payslips/download/completed-job',
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('zip');
  });

  it('returns 410 when ZIP file has been cleaned up', async () => {
    const svc = await import('../services/payslipService') as Record<string, unknown>;
    (svc.__seedCompletedJob as (id: string, path: string) => void)('done-job', '/tmp/nonexistent-file.zip');

    const res = await app.inject({
      method: 'GET',
      url: '/api/payslips/download/done-job',
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(410);
  });

  it('returns 404 for non-existent jobId', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/payslips/download/no-job',
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(404);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/payslips/download/some-id' });
    expect(res.statusCode).toBe(401);
  });
});

// ── POST /api/payslips/print ───────────────────────────────────

describe('POST /api/payslips/print', () => {
  it('returns 200 with message for valid jobId', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/payslips/print',
      headers: authHeader(token),
      payload: { jobId: 'any-job-id' },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toHaveProperty('message');
  });

  it('returns 400 for missing jobId', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/payslips/print',
      headers: authHeader(token),
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for copies exceeding max (50)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/payslips/print',
      headers: authHeader(token),
      payload: { jobId: 'job-1', copies: 100 },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/payslips/print',
      payload: { jobId: 'job-1' },
    });
    expect(res.statusCode).toBe(401);
  });
});

// ── GET /api/payslips/pdf/:paysheetId ─────────────────────────

describe('GET /api/payslips/pdf/:paysheetId', () => {
  it('returns 200 with PDF content-type for existing paysheet', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/payslips/pdf/existing-paysheet-id',
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('pdf');
  });

  it('returns 404 when paysheet is not found', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/payslips/pdf/not-found-id',
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(404);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/payslips/pdf/some-id' });
    expect(res.statusCode).toBe(401);
  });
});
