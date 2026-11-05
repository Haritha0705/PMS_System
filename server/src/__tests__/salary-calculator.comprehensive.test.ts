/**
 * Comprehensive salary calculator tests — Category B roles, edge cases (Category A: sales-cycle.test.ts)
 */

import { describe, it, expect } from 'vitest';
import {
  calculatePaysheet,
  getRoleConfig,
  isSalesRole,
} from '../engine/salary-calculator';

function near(a: number, b: number) {
  return Math.abs(a - b) < 0.01;
}

// ── Category B: Non-Target Roles ─────────────────────────────────────────────

describe('Category B — JR_EXEC_HR (1 month, 10K otherOffer, no deductions)', () => {
  const result = calculatePaysheet({
    role: getRoleConfig('JR_EXEC_HR')!,
    monthsOfService: 1,
    otherOffer: 10_000,
    nopayDays: 0,
    lateHours: 0,
    lateMinutes: 0,
    others: 0,
    epfAvailability: true,
  });

  it('JR_EXEC_HR is NOT a sales role', () => expect(isSalesRole('JR_EXEC_HR')).toBe(false));
  it('otherOffer = 10,000', () => expect(near(result.otherOffer ?? 0, 10_000)).toBe(true));
  it('nopayDeduction = 0', () => expect(near(result.nopayDeduction, 0)).toBe(true));
});

describe('Category B — HEAD_MICRO_FIN (2 months, 5K otherOffer, with deductions)', () => {
  const result = calculatePaysheet({
    role: getRoleConfig('HEAD_MICRO_FIN')!,
    monthsOfService: 2,
    otherOffer: 5_000,
    nopayDays: 1,
    lateHours: 1,
    lateMinutes: 0,
    others: 1_000,
    epfAvailability: true,
  });

  it('otherOffer = 5,000', () => expect(near(result.otherOffer ?? 0, 5_000)).toBe(true));
  it('nopayDeduction > 0', () => expect(result.nopayDeduction).toBeGreaterThan(0));
});

describe('Category B — ADMIN_MANAGER (1 month, 0 otherOffer, with deductions)', () => {
  const result = calculatePaysheet({
    role: getRoleConfig('ADMIN_MANAGER')!,
    monthsOfService: 1,
    otherOffer: 0,
    nopayDays: 2,
    lateHours: 10,
    lateMinutes: 0,
    others: 0,
    epfAvailability: true,
  });

  it('otherOffer = 0', () => expect(near(result.otherOffer ?? 0, 0)).toBe(true));
  it('grossSalary = 80,000 (65K basic + 15K fixed allowance)', () => expect(near(result.grossSalary, 80_000)).toBe(true));
  it('netSalary = 67,650', () => expect(near(result.netSalary, 67_650)).toBe(true));
});

describe('Category B — SR_EXEC_HR (1 month, 10K otherOffer, 2 no-pay, 10h late)', () => {
  const result = calculatePaysheet({
    role: getRoleConfig('SR_EXEC_HR')!,
    monthsOfService: 1,
    otherOffer: 10_000,
    nopayDays: 2,
    lateHours: 10,
    lateMinutes: 0,
    others: 0,
    epfAvailability: true,
  });

  it('grossSalary = 67,500 (42.5K basic + 15K fixed allowance + 10K offer)', () => expect(near(result.grossSalary, 67_500)).toBe(true));
  it('netSalary = 59,425', () => expect(near(result.netSalary, 59_425)).toBe(true));
});

describe('Category B — EXEC_ASST_LAND (3 months, 8K otherOffer)', () => {
  const result = calculatePaysheet({
    role: getRoleConfig('EXEC_ASST_LAND')!,
    monthsOfService: 3,
    otherOffer: 8_000,
    nopayDays: 0,
    lateHours: 0,
    lateMinutes: 0,
    others: 0,
    epfAvailability: true,
  });

  it('otherOffer = 8,000', () => expect(near(result.otherOffer ?? 0, 8_000)).toBe(true));
});

describe('Category B — EXEC_ASST_HR (2 months, 3K otherOffer)', () => {
  const result = calculatePaysheet({
    role: getRoleConfig('EXEC_ASST_HR')!,
    monthsOfService: 2,
    otherOffer: 3_000,
    nopayDays: 0,
    lateHours: 0,
    lateMinutes: 0,
    others: 0,
    epfAvailability: true,
  });

  it('otherOffer = 3,000', () => expect(near(result.otherOffer ?? 0, 3_000)).toBe(true));
});

describe('Category B — EXEC_ASST_FIN (1 month, 4K otherOffer)', () => {
  const result = calculatePaysheet({
    role: getRoleConfig('EXEC_ASST_FIN')!,
    monthsOfService: 1,
    otherOffer: 4_000,
    nopayDays: 0,
    lateHours: 0,
    lateMinutes: 0,
    others: 0,
    epfAvailability: true,
  });

  it('otherOffer = 4,000', () => expect(near(result.otherOffer ?? 0, 4_000)).toBe(true));
});

describe('Category B — CABANA_PM (6 months, 25K otherOffer)', () => {
  const result = calculatePaysheet({
    role: getRoleConfig('CABANA_PM')!,
    monthsOfService: 6,
    otherOffer: 25_000,
    nopayDays: 0,
    lateHours: 0,
    lateMinutes: 0,
    others: 0,
    epfAvailability: true,
  });

  it('otherOffer = 25,000', () => expect(near(result.otherOffer ?? 0, 25_000)).toBe(true));
});

describe('Category B — EXEC_MICRO_FIN_1 (1 month, 50K otherOffer, NO EPF)', () => {
  const result = calculatePaysheet({
    role: getRoleConfig('EXEC_MICRO_FIN_1')!,
    monthsOfService: 1,
    otherOffer: 50_000,
    nopayDays: 0,
    lateHours: 0,
    lateMinutes: 0,
    others: 0,
    epfAvailability: false,
  });

  it('otherOffer = 50,000', () => expect(near(result.otherOffer ?? 0, 50_000)).toBe(true));
  it('epfEmployee = 0 (not enrolled)', () => expect(near(result.epfEmployee, 0)).toBe(true));
});

// ── Edge Cases ────────────────────────────────────────────────────────────────

describe('Edge — ADMIN_MANAGER zero otherOffer with heavy deductions', () => {
  const result = calculatePaysheet({
    role: getRoleConfig('ADMIN_MANAGER')!,
    monthsOfService: 1,
    otherOffer: 0,
    nopayDays: 5,
    lateHours: 15,
    lateMinutes: 30,
    others: 3_000,
    customDeductionAmount: 2_000,
    epfAvailability: true,
  });

  it('otherOffer = 0', () => expect(near(result.otherOffer ?? 0, 0)).toBe(true));
  it('netSalary still positive', () => expect(result.netSalary).toBeGreaterThan(0));
});

describe('Edge — HEAD_MICRO_FIN very high otherOffer (30K)', () => {
  const result = calculatePaysheet({
    role: getRoleConfig('HEAD_MICRO_FIN')!,
    monthsOfService: 2,
    otherOffer: 30_000,
    nopayDays: 0,
    lateHours: 0,
    lateMinutes: 0,
    others: 0,
    epfAvailability: true,
  });

  it('otherOffer = 30,000', () => expect(near(result.otherOffer ?? 0, 30_000)).toBe(true));
});
