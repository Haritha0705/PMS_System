/**
 * Export tests that use the real generators and CORS plugin, so they check the
 * actual files and headers a browser receives (export.test.ts mocks the generators).
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import ExcelJS from 'exceljs';

vi.mock('../services/dbStore');

import { __resetStore, __seedUser, __seedPaysheet } from '../services/dbStore';
import exportRoutes from '../modules/payslips/export.routes';
import { exportMonthlyPaysheetsByRoleToExcel } from '../utils/excelExport';
import { makeUser, makePaysheet } from './helpers/fixtures';

const ORIGIN = 'https://client.example.com';

describe('GET /export/paysheets-json in a browser', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(cors, { origin: true });
    await app.register(exportRoutes, { prefix: '/export' });
    await app.ready();
  });

  afterAll(() => app.close());

  beforeEach(() => __resetStore());

  const get = () => app.inject({
    method: 'GET',
    url: '/export/paysheets-json?payMonth=2026-04',
    headers: { origin: ORIGIN },
  });

  it('keeps the CORS header and returns a zip', async () => {
    __seedUser(makeUser());
    __seedPaysheet(makePaysheet());

    const res = await get();

    expect(res.statusCode).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe(ORIGIN);
    expect(res.headers['content-type']).toBe('application/zip');
    expect(res.rawPayload.subarray(0, 2).toString()).toBe('PK');
  });

  it('exposes the skipped paysheets to the client', async () => {
    __seedUser(makeUser());
    __seedPaysheet(makePaysheet());
    __seedPaysheet(makePaysheet({ id: 'zero-pay', codeNo: 'EMP-ZERO', achievedSalary: 0 }));

    const res = await get();

    expect(res.headers['x-skipped-count']).toBe('1');
    expect(res.headers['access-control-expose-headers']).toContain('X-Skipped-Names');
  });
});

describe('Salary Earned column in the Excel paysheets', () => {
  /** Reads a data row of the first sheet as { column header: value }. */
  async function readRow(codeNo: string, buffer: Buffer): Promise<Record<string, unknown>> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
    const sheet = workbook.worksheets[0];
    const headers: Record<number, string> = {};
    const result: Record<string, unknown> = {};
    sheet.eachRow((row) => {
      if (row.getCell(1).value === 'Code No') {
        row.eachCell((cell, col) => { headers[col] = String(cell.value); });
      } else if (row.getCell(1).value === codeNo) {
        Object.entries(headers).forEach(([col, name]) => { result[name] = row.getCell(Number(col)).value; });
      }
    });
    return result;
  }

  it('shows what a sales employee earned, separate from Basic Offer', async () => {
    const paysheet = makePaysheet({ role: 'PM', basicSalary: 150_000, achievedSalary: 100_000 });
    const row = await readRow(paysheet.codeNo, await exportMonthlyPaysheetsByRoleToExcel([paysheet], []));

    expect(row['Basic Offer']).toBe(150_000);
    expect(row['Salary Earned']).toBe(100_000);
  });

  it('stays blank for non-target roles', async () => {
    const paysheet = makePaysheet({ role: 'LEGAL_MANAGER', basicSalary: 75_000, achievedSalary: 75_000 });
    const row = await readRow(paysheet.codeNo, await exportMonthlyPaysheetsByRoleToExcel([paysheet], []));

    expect(row['Basic Offer']).toBe(75_000);
    expect(row['Salary Earned'] ?? '').toBe('');
  });
});
