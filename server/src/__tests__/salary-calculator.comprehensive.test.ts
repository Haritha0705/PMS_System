/**
 * Comprehensive salary calculator tests — all role types (Cat A & B), edge cases
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

// ── Category A: Sales/Target-Based Roles ─────────────────────────────────────

describe('Category A — GM (2 months, 75M, 10K otherOffer)', () => {
  const result = calculatePaysheet({
    role: getRoleConfig('GM')!,
    monthsOfService: 2,
    achievementAmount: 75_000_000,
    generalAllowance: 0,
    otherOffer: 10_000,
    nopayDays: 0,
    lateHours: 0,
    lateMinutes: 0,
    others: 0,
    epfAvailability: true,
  });

  it('assignedTarget = 175,000,000', () => expect(near(result.assignedTarget ?? 0, 175_000_000)).toBe(true));
  it('achievementPct ≈ 42%', () => expect(near((result.achievementPct ?? 0) * 100, 42)).toBe(true));
  it('otherOffer = 10,000', () => expect(near(result.otherOffer ?? 0, 10_000)).toBe(true));
  it('grossSalary includes otherOffer', () => expect(result.grossSalary).toBeGreaterThanOrEqual(10_000));
});

describe('Category A — AGM (6 months, 251.5M, ≈100%)', () => {
  const result = calculatePaysheet({
    role: getRoleConfig('AGM')!,
    monthsOfService: 6,
    achievementAmount: 251_500_000,
    generalAllowance: 0,
    otherOffer: 0,
    nopayDays: 0,
    lateHours: 0,
    lateMinutes: 0,
    others: 0,
    epfAvailability: true,
  });

  it('assignedTarget = 250,000,000', () => expect(near(result.assignedTarget ?? 0, 250_000_000)).toBe(true));
  it('vehicleAllowance = 120,000', () => expect(near(result.vehicleAllowance ?? 0, 120_000)).toBe(true));
  it('fuelAllowance = 100,000', () => expect(near(result.fuelAllowance ?? 0, 100_000)).toBe(true));
});

describe('Category A — PH (3 months, 35M, 5K otherOffer, deductions)', () => {
  const result = calculatePaysheet({
    role: getRoleConfig('PH')!,
    monthsOfService: 3,
    achievementAmount: 35_000_000,
    generalAllowance: 5_000,
    otherOffer: 5_000,
    nopayDays: 1,
    lateHours: 2,
    lateMinutes: 30,
    others: 1_000,
    epfAvailability: true,
  });

  it('otherOffer = 5,000', () => expect(near(result.otherOffer ?? 0, 5_000)).toBe(true));
  it('nopayDeduction > 0', () => expect(result.nopayDeduction).toBeGreaterThan(0));
});

describe('Category A — DPH (1 month, 10M, 3K otherOffer)', () => {
  const result = calculatePaysheet({
    role: getRoleConfig('DPH')!,
    monthsOfService: 1,
    achievementAmount: 10_000_000,
    generalAllowance: 0,
    otherOffer: 3_000,
    nopayDays: 0,
    lateHours: 0,
    lateMinutes: 0,
    others: 0,
    epfAvailability: true,
  });

  it('otherOffer = 3,000', () => expect(near(result.otherOffer ?? 0, 3_000)).toBe(true));
});

describe('Category A — SRM (2 months, 12M, 15K otherOffer)', () => {
  const result = calculatePaysheet({
    role: getRoleConfig('SRM')!,
    monthsOfService: 2,
    achievementAmount: 12_000_000,
    generalAllowance: 2_000,
    otherOffer: 15_000,
    nopayDays: 0,
    lateHours: 0,
    lateMinutes: 0,
    others: 500,
    epfAvailability: true,
  });

  it('otherOffer = 15,000', () => expect(near(result.otherOffer ?? 0, 15_000)).toBe(true));
});

describe('Category A — RM (3 months, 15M, custom earnings)', () => {
  const result = calculatePaysheet({
    role: getRoleConfig('RM')!,
    monthsOfService: 3,
    achievementAmount: 15_000_000,
    generalAllowance: 3_000,
    otherOffer: 5_000,
    nopayDays: 0,
    lateHours: 0,
    lateMinutes: 0,
    others: 0,
    customEarningAmount: 2_000,
    epfAvailability: true,
  });

  it('otherOffer = 5,000', () => expect(near(result.otherOffer ?? 0, 5_000)).toBe(true));
  it('customEarningAmount = 2,000', () => expect(near(result.customEarningAmount ?? 0, 2_000)).toBe(true));
});

describe('Category A — BM (4 months, 2.2M, comprehensive)', () => {
  const result = calculatePaysheet({
    role: getRoleConfig('BM')!,
    monthsOfService: 4,
    achievementAmount: 2_200_000,
    generalAllowance: 10_000,
    otherOffer: 5_000,
    nopayDays: 2,
    lateHours: 1,
    lateMinutes: 45,
    others: 2_000,
    customEarningAmount: 1_000,
    customDeductionAmount: 500,
    epfAvailability: true,
  });

  it('assignedTarget = 2,275,000', () => expect(near(result.assignedTarget ?? 0, 2_275_000)).toBe(true));
  it('otherOffer = 5,000', () => expect(near(result.otherOffer ?? 0, 5_000)).toBe(true));
  it('vehicleAllowance = 30,000', () => expect(near(result.vehicleAllowance ?? 0, 30_000)).toBe(true));
  it('nopayDeduction = 3,000', () => expect(near(result.nopayDeduction, 3_000)).toBe(true));
});

describe('Category A — BDE (1 month, 2M, 2K otherOffer)', () => {
  const result = calculatePaysheet({
    role: getRoleConfig('BDE')!,
    monthsOfService: 1,
    achievementAmount: 2_000_000,
    generalAllowance: 1_000,
    otherOffer: 2_000,
    nopayDays: 0,
    lateHours: 0,
    lateMinutes: 0,
    others: 0,
    epfAvailability: true,
  });

  it('otherOffer = 2,000', () => expect(near(result.otherOffer ?? 0, 2_000)).toBe(true));
});

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
  it('grossSalary = 80,000 (75K basic + 5K fixed allowance)', () => expect(near(result.grossSalary, 80_000)).toBe(true));
  it('netSalary = 65,750', () => expect(near(result.netSalary, 65_750)).toBe(true));
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

describe('Edge — BM high otherOffer (20K) with multiple deductions', () => {
  const result = calculatePaysheet({
    role: getRoleConfig('BM')!,
    monthsOfService: 2,
    achievementAmount: 1_000_000,
    generalAllowance: 0,
    otherOffer: 20_000,
    nopayDays: 3,
    lateHours: 8,
    lateMinutes: 15,
    others: 5_000,
    customDeductionAmount: 2_000,
    epfAvailability: true,
  });

  it('otherOffer = 20,000', () => expect(near(result.otherOffer ?? 0, 20_000)).toBe(true));
  it('has nopay and late deductions', () => {
    expect(result.nopayDeduction).toBeGreaterThan(0);
    expect(result.lateDeduction).toBeGreaterThan(0);
  });
});

describe('Edge — RM custom earning + deduction + otherOffer', () => {
  const result = calculatePaysheet({
    role: getRoleConfig('RM')!,
    monthsOfService: 1,
    achievementAmount: 5_000_000,
    generalAllowance: 2_000,
    otherOffer: 8_000,
    nopayDays: 0,
    lateHours: 0,
    lateMinutes: 0,
    others: 0,
    customEarningAmount: 5_000,
    customDeductionAmount: 1_500,
    epfAvailability: true,
  });

  it('otherOffer = 8,000', () => expect(near(result.otherOffer ?? 0, 8_000)).toBe(true));
  it('customEarningAmount = 5,000', () => expect(near(result.customEarningAmount ?? 0, 5_000)).toBe(true));
});

describe('Edge — BDE only otherOffer, no deductions', () => {
  const result = calculatePaysheet({
    role: getRoleConfig('BDE')!,
    monthsOfService: 3,
    achievementAmount: 500_000,
    generalAllowance: 0,
    otherOffer: 15_000,
    nopayDays: 0,
    lateHours: 0,
    lateMinutes: 0,
    others: 0,
    epfAvailability: true,
  });

  it('otherOffer = 15,000', () => expect(near(result.otherOffer ?? 0, 15_000)).toBe(true));
  it('nopayDeduction = 0', () => expect(near(result.nopayDeduction, 0)).toBe(true));
  it('lateDeduction = 0', () => expect(near(result.lateDeduction, 0)).toBe(true));
});

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

describe('Edge — MICRO_FIN_UNIT_HEAD very high otherOffer (30K)', () => {
  const result = calculatePaysheet({
    role: getRoleConfig('MICRO_FIN_UNIT_HEAD')!,
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

describe('Edge — AGM 12 months service with otherOffer', () => {
  const result = calculatePaysheet({
    role: getRoleConfig('AGM')!,
    monthsOfService: 12,
    achievementAmount: 100_000_000,
    generalAllowance: 5_000,
    otherOffer: 12_000,
    nopayDays: 0,
    lateHours: 0,
    lateMinutes: 0,
    others: 0,
    epfAvailability: true,
  });

  it('otherOffer = 12,000', () => expect(near(result.otherOffer ?? 0, 12_000)).toBe(true));
  it('grossSalary > 0', () => expect(result.grossSalary).toBeGreaterThan(0));
});
