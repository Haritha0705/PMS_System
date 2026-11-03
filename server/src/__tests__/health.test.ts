/**
 * Health check endpoint test
 * GET /api/health
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';

vi.mock('../services/dbStore');
vi.mock('../services/cache');
vi.mock('../plugins/prisma');

import { buildTestApp } from './helpers/testApp';

let app: FastifyInstance;

beforeAll(async () => { app = await buildTestApp(); });
afterAll(async () => { await app.close(); });

describe('GET /api/health', () => {
  it('returns { status: "ok" } without authentication', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).status).toBe('ok');
  });
});