/**
 * Salary Calculator unit tests — core scenarios
 */

import { describe, it, expect } from 'vitest';
import {
  calculatePaysheet,
  getRoleConfig,
  isSalesRole,
  NON_TARGET_ROLES,
} from '../engine/salary-calculator';

// ── Helpers ───────────────────────────────────────────────────────────────────

function near(a: number, b: number) {
  return Math.abs(a - b) < 0.01;
}

// ── Test 3: SR_EXEC_HR (Cat B), 2 no-pay, 10h late ──────────────────────────

describe('SR_EXEC_HR — 1 month, 15K fixed allowance + 10K otherOffer, 2 no-pay days, 10h late', () => {
  const config = getRoleConfig('SR_EXEC_HR')!;
  const result = calculatePaysheet({
    role: config,
    monthsOfService: 1,
    otherOffer: 10_000,
    nopayDays: 2,
    lateHours: 10,
    lateMinutes: 0,
    others: 0,
    epfAvailability: true,
  });

  it('SR_EXEC_HR is NOT a sales role', () => expect(isSalesRole('SR_EXEC_HR')).toBe(false));
  it('generalAllowance = 15,000 (fixed role allowance)', () => expect(near(result.generalAllowance ?? 0, 15_000)).toBe(true));
  it('grossSalary = 67,500', () => expect(near(result.grossSalary, 67_500)).toBe(true));
  it('nopayDeduction = 2,550', () => expect(near(result.nopayDeduction, 2_550)).toBe(true));
  it('lateDeduction = 2,125', () => expect(near(result.lateDeduction, 2_125)).toBe(true));
  it('epfEmployee = 3,400 (Cat B — 8% of basic salary only, allowance/offer excluded)', () => expect(near(result.epfEmployee, 3_400)).toBe(true));
  it('netSalary = 59,425', () => expect(near(result.netSalary, 59_425)).toBe(true));
});

// ── Test 4: JR_EXEC_HR (Cat B), no deductions ────────────────────────────────

describe('JR_EXEC_HR — 1 month, 10K fixed allowance + 10K otherOffer, no deductions', () => {
  const config = getRoleConfig('JR_EXEC_HR')!;
  const result = calculatePaysheet({
    role: config,
    monthsOfService: 1,
    otherOffer: 10_000,
    nopayDays: 0,
    lateHours: 0,
    lateMinutes: 0,
    others: 0,
    epfAvailability: true,
  });

  it('grossSalary = 60,000', () => expect(near(result.grossSalary, 60_000)).toBe(true));
  it('epfEmployee = 3,200 (Cat B — 8% of basic salary only, allowance/offer excluded)', () => expect(near(result.epfEmployee, 3_200)).toBe(true));
  it('netSalary = 56,800', () => expect(near(result.netSalary, 56_800)).toBe(true));
});

// ── Test 5: ADMIN_MANAGER (Cat B), 2 no-pay, 10h late ────────────────────────

describe('ADMIN_MANAGER — 1 month, 5K fixed allowance, 0 otherOffer, 2 no-pay, 10h late', () => {
  const config = getRoleConfig('ADMIN_MANAGER')!;
  const result = calculatePaysheet({
    role: config,
    monthsOfService: 1,
    otherOffer: 0,
    nopayDays: 2,
    lateHours: 10,
    lateMinutes: 0,
    others: 0,
    epfAvailability: true,
  });

  it('grossSalary = 80,000', () => expect(near(result.grossSalary, 80_000)).toBe(true));
  it('netSalary = 65,750', () => expect(near(result.netSalary, 65_750)).toBe(true));
});

// ── Test 7: EXEC_MICRO_FIN_1 (Cat B), EPF not enrolled ───────────────────────

describe('EXEC_MICRO_FIN_1 — EPF not enrolled', () => {
  const config = getRoleConfig('EXEC_MICRO_FIN_1')!;
  const result = calculatePaysheet({
    role: config,
    monthsOfService: 1,
    otherOffer: 50_000,
    nopayDays: 0,
    lateHours: 0,
    lateMinutes: 0,
    others: 0,
    epfAvailability: false,
  });

  it('grossSalary = 90,000 (35K basic + 5K allowance + 50K offer)', () => expect(near(result.grossSalary, 90_000)).toBe(true));
  it('epfEmployee = 0 (not enrolled)', () => expect(near(result.epfEmployee, 0)).toBe(true));
  it('netSalary = 90,000 (no deductions)', () => expect(near(result.netSalary, 90_000)).toBe(true));
});

// ── Test 8: GEMO (Cat B), flat vehicle + fuel allowance ──────────────────────

describe('GEMO — Gemologist, flat vehicle + fuel allowance, no offer', () => {
  const config = getRoleConfig('GEMO')!;
  const result = calculatePaysheet({
    role: config,
    monthsOfService: 1,
    otherOffer: 0,
    nopayDays: 0,
    lateHours: 0,
    lateMinutes: 0,
    others: 0,
    epfAvailability: true,
  });

  it('GEMO is NOT a sales role', () => expect(isSalesRole('GEMO')).toBe(false));
  it('vehicleAllowance = 100,000 (flat, always paid)', () => expect(near(result.vehicleAllowance ?? 0, 100_000)).toBe(true));
  it('fuelAllowance = 80,000 (flat, always paid)', () => expect(near(result.fuelAllowance ?? 0, 80_000)).toBe(true));
  it('grossSalary = 380,000 (basic + vehicle + fuel)', () => expect(near(result.grossSalary, 380_000)).toBe(true));
  it('epfEmployee = 16,000 (Cat B — 8% of basic salary only)', () => expect(near(result.epfEmployee, 16_000)).toBe(true));
  it('netSalary = 364,000', () => expect(near(result.netSalary, 364_000)).toBe(true));
});

// ── Test 9: EXEC_ASST_FIN (Cat B), plain fixed salary, no extras ─────────────

describe('EXEC_ASST_FIN — Executive Assistant Finance, no allowance, no offer', () => {
  const config = getRoleConfig('EXEC_ASST_FIN')!;
  const result = calculatePaysheet({
    role: config,
    monthsOfService: 1,
    otherOffer: 0,
    nopayDays: 0,
    lateHours: 0,
    lateMinutes: 0,
    others: 0,
    epfAvailability: true,
  });

  it('EXEC_ASST_FIN is NOT a sales role', () => expect(isSalesRole('EXEC_ASST_FIN')).toBe(false));
  it('generalAllowance = 0 (no fixed allowance for this role)', () => expect(near(result.generalAllowance ?? 0, 0)).toBe(true));
  it('vehicleAllowance = 0 (not configured for this role)', () => expect(near(result.vehicleAllowance ?? 0, 0)).toBe(true));
  it('grossSalary = 35,000', () => expect(near(result.grossSalary, 35_000)).toBe(true));
  it('epfEmployee = 2,800', () => expect(near(result.epfEmployee, 2_800)).toBe(true));
  it('netSalary = 32,200', () => expect(near(result.netSalary, 32_200)).toBe(true));
});

// ── Test 10: LEGAL_MANAGER (Cat B), fixed office salary ──────────────────────

describe('LEGAL_MANAGER — Legal Manager, fixed salary, no target', () => {
  const config = getRoleConfig('LEGAL_MANAGER')!;
  const result = calculatePaysheet({
    role: config,
    monthsOfService: 1,
    otherOffer: 0,
    nopayDays: 0,
    lateHours: 0,
    lateMinutes: 0,
    others: 0,
    epfAvailability: true,
  });

  it('LEGAL_MANAGER is NOT a sales role', () => expect(isSalesRole('LEGAL_MANAGER')).toBe(false));
  it('basicSalary = 75,000', () => expect(near(result.basicSalary, 75_000)).toBe(true));
  it('grossSalary = 75,000 (fixed, no target)', () => expect(near(result.grossSalary, 75_000)).toBe(true));
  it('no vehicle allowance', () => expect(near(result.vehicleAllowance ?? 0, 0)).toBe(true));
  it('no fuel allowance', () => expect(near(result.fuelAllowance ?? 0, 0)).toBe(true));
  it('epfEmployee = 6,000 (8% of basic)', () => expect(near(result.epfEmployee, 6_000)).toBe(true));
  it('epfEmployer = 9,000 (12% of basic)', () => expect(near(result.epfEmployer, 9_000)).toBe(true));
  it('etf = 2,250 (3% of basic)', () => expect(near(result.etf, 2_250)).toBe(true));
  it('netSalary = 69,000', () => expect(near(result.netSalary, 69_000)).toBe(true));
});

// ── Category B role table — gross must match the official salary table ──────
// Basic + fixed allowance (+ Gemologist vehicle/fuel) with no inputs/deductions.
// EPF is always 8% of BASIC only.

describe('Category B role table (no inputs, no deductions)', () => {
  const TABLE: Record<string, { basic: number; total: number }> = {
    SR_EXEC_HR:          { basic:  42_500, total:  57_500 },
    JR_EXEC_HR:          { basic:  40_000, total:  50_000 },
    ADMIN_MANAGER:       { basic:  75_000, total:  80_000 },
    LEGAL_MANAGER:       { basic:  75_000, total:  75_000 },
    EXEC_ASST_HR:        { basic:  35_000, total:  40_000 },
    EXEC_ASST_LAND:      { basic:  35_000, total:  40_000 },
    EXEC_GEM_1:          { basic:  35_000, total:  40_000 },
    EXEC_GEM_2:          { basic:  30_000, total:  35_000 },
    EXEC_MEDIA:          { basic:  35_000, total:  40_000 },
    CABANA_PM:           { basic: 100_000, total: 150_000 },
    NETWORK_IT_MANAGER:  { basic: 100_000, total: 100_000 },
    HEAD_MICRO_FIN:      { basic:  80_000, total: 130_000 },
    EXEC_MICRO_FIN_1:    { basic:  35_000, total:  40_000 },
    EXEC_MICRO_FIN_2:    { basic:  35_000, total:  40_000 },
    MICRO_FIN_UNIT_HEAD: { basic:  80_000, total: 240_000 },
    GEMO:                { basic: 200_000, total: 380_000 },
    EXEC_ASST_FIN:       { basic:  35_000, total:  35_000 },
  };

  it('covers every non-target role in the engine', () => {
    expect(Object.keys(TABLE).sort()).toEqual(Object.keys(NON_TARGET_ROLES).sort());
  });

  for (const [code, { basic, total }] of Object.entries(TABLE)) {
    it(`${code}: basic ${basic}, gross ${total}, EPF on basic only`, () => {
      expect(isSalesRole(code)).toBe(false);
      const r = calculatePaysheet({
        role: getRoleConfig(code)!,
        monthsOfService: 1,
        otherOffer: 0,
        nopayDays: 0,
        lateHours: 0,
        lateMinutes: 0,
        others: 0,
        epfAvailability: true,
      });
      expect(near(r.basicSalary, basic)).toBe(true);
      expect(near(r.grossSalary, total)).toBe(true);
      expect(near(r.epfEmployee, basic * 0.08)).toBe(true);
      expect(near(r.netSalary, total - basic * 0.08)).toBe(true);
    });
  }
});
