/**
 * Input limits that match the database columns, escaping in payslip PDFs,
 * and printing being refused on servers with no printer.
 */

import { describe, it, expect, vi } from 'vitest';
import Fastify from 'fastify';

vi.mock('../services/dbStore');
vi.mock('../services/cache');
vi.mock('../plugins/prisma');
vi.mock('../config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../config/env')>();
  return { ENV: { ...actual.ENV, SERVER_PRINT_ENABLED: false } };
});

import { createUserSchema, updateUserSchema } from '../validation/users';
import { createPaysheetSchema } from '../validation/paysheets';
import { generatePayslipsSchema } from '../validation/payslip';
import { renderPayslipHTML } from '../templates/payslip';
import payslipRoutes from '../modules/payslips/payslips.routes';
import type { PayslipEmployee } from '../types/worker';

const paysheet = { codeNo: 'E1', payMonth: '2026-10', role: 'PM' };
const employee = { codeNo: 'E1', firstName: 'A', lastName: 'B', email: 'a@b.lk' };

describe('validation limits', () => {
  it('refuses amounts too large for the database', () => {
    expect(createPaysheetSchema.safeParse({ ...paysheet, otherOffer: 1e12 }).success).toBe(false);
    expect(updateUserSchema.safeParse({ basicSalary: 1e15 }).success).toBe(false);
    expect(createUserSchema.safeParse({ ...employee, allowances: 1e15 }).success).toBe(false);
  });

  it('accepts the largest real amounts', () => {
    // The largest annual sales target is 8.1 billion
    expect(createPaysheetSchema.safeParse({ ...paysheet, achieve: 8_100_000_000 }).success).toBe(true);
    expect(createPaysheetSchema.safeParse({ ...paysheet, otherOffer: 5_000_000 }).success).toBe(true);
  });

  it('refuses late hours too large for the database', () => {
    expect(createPaysheetSchema.safeParse({ ...paysheet, lateHours: 3_000_000_000 }).success).toBe(false);
    expect(createPaysheetSchema.safeParse({ ...paysheet, lateHours: 40 }).success).toBe(true);
  });

  it('refuses dates that do not exist', () => {
    expect(createUserSchema.safeParse({ ...employee, joinDate: '2026-99-99' }).success).toBe(false);
    expect(createUserSchema.safeParse({ ...employee, joinDate: '2026-02-30' }).success).toBe(false);
    expect(createUserSchema.safeParse({ ...employee, joinDate: '2024-02-29' }).success).toBe(true);
  });

  it('refuses a payslip month that does not exist', () => {
    expect(generatePayslipsSchema.safeParse({ payMonth: '2026-13' }).success).toBe(false);
    expect(generatePayslipsSchema.safeParse({ payMonth: '2026-12' }).success).toBe(true);
  });
});

describe('payslip template', () => {
  const emp = {
    id: 'E1', codeNo: 'E1', firstName: '<img src=x onerror=alert(1)>', lastName: 'Silva & Sons', designation: 'Manager',
    branch: 'Colombo', bankName: '', bankAccount: '', payMonth: '2026-10', basicSalary: 100, achievedSalary: 100,
    isSalesRole: false, vehicleAllowance: 0, fuelAllowance: 0, generalAllowance: 0, orc: 0, otherOffer: 0,
    customEarningName: '<script>steal()</script>', customEarningAmount: 5, grossSalary: 105, epfEmployee: 8, epfEmployer: 12,
    etf: 3, nopayDeduction: 0, lateDeduction: 0, welfare: 0, customDeductionName: '', customDeductionAmount: 0,
    netSalary: 97, achievementPct: 0, assignedTarget: 0, cycle: 0, remainingTarget: 0, remainingSalary: 0,
    createdAt: '2026-10-01T00:00:00.000Z',
  } as PayslipEmployee;

  it('shows typed names as text, never as HTML', () => {
    const html = renderPayslipHTML(emp);

    expect(html).not.toContain('<img src=x');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('Silva &amp; Sons');
    expect(html).toContain('&lt;script&gt;steal()&lt;/script&gt;');
  });
});

describe('printing on a server with no printer', () => {
  it('explains what to do instead', async () => {
    const app = Fastify({ logger: false });
    await app.register(payslipRoutes, { prefix: '/payslips' });

    const res = await app.inject({ method: 'POST', url: '/payslips/print', payload: { jobId: 'job-1' } });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toMatch(/download the zip/i);
    await app.close();
  });
});
