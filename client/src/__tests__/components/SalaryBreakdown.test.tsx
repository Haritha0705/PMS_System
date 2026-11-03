/**
 * Component: SalaryBreakdown.tsx — sales (annual cycle) rows
 */

import { describe, it, expect } from 'vitest';
import { buildBreakdownRows } from '../../components/SalaryBreakdown';
import type { MonthlyPaysheet } from '../../types';

const base: MonthlyPaysheet = {
  codeNo: 'E001', payMonth: '2026-05', role: 'PGM',
  achieve: 550_000_000, allowance: 0, nopay: 0, late: 0, lateHours: 0, lateMinutes: 0,
  epfAvailability: true, etfAvailability: true, welfare: 0, otherOffer: 0,
  customEarningName: '', customEarningAmount: 0, customDeductionName: '', customDeductionAmount: 0,
  basicSalary: 700_000, achievedSalary: 700_000, assignedTarget: 550_000_000, achievementPct: 1,
  grossSalary: 700_000, generalAllowance: 0, netSalary: 644_000, epfEmployee: 56_000,
  cycle: 2, cycleMonth: 3, prevCarryForward: 125_000_000, carryForward: 0,
  totalAchieved: 1_822_500_000, totalSalaryPaid: 1_890_000,
  remainingTarget: 6_277_500_000, remainingSalary: 6_510_000, annualTargetCompleted: false,
};

const row = (rows: ReturnType<typeof buildBreakdownRows>, step: string) => rows.find((r) => r.step === step);

describe('buildBreakdownRows — sales role', () => {
  const rows = buildBreakdownRows(base);

  it('shows the cycle position', () => expect(row(rows, 'Annual Cycle')?.result).toBe('3 / 12'));
  it("shows this month's target reduced by the carry", () => {
    expect(row(rows, 'Previous Carry Forward')?.result).toBe((125_000_000).toLocaleString('en-IN', { minimumFractionDigits: 2 }));
    expect(row(rows, "This Month's Target")?.formula).toContain('carry');
  });
  it('shows salary earned at full monthly salary', () =>
    expect(row(rows, 'Salary Earned')?.formula).toContain('full monthly salary'));
  it('has no old vehicle / fuel / ORC / months-of-service rows', () => {
    const steps = rows.map((r) => r.step);
    expect(steps).not.toContain('Vehicle Allowance');
    expect(steps).not.toContain('Fuel Allowance');
    expect(steps).not.toContain('Months of Service');
    expect(steps.some((s) => s.startsWith('ORC'))).toBe(false);
  });
  it('EPF is described as on salary earned', () =>
    expect(rows.find((r) => r.step.startsWith('EPF — Employee'))?.formula).toContain('salary earned'));
});

describe('buildBreakdownRows — annual target completed', () => {
  const rows = buildBreakdownRows({ ...base, annualTargetCompleted: true, achievedSalary: 6_510_000 });
  it('explains the remaining annual salary payout', () =>
    expect(row(rows, 'Salary Earned')?.formula).toBe('Annual target completed — remaining annual salary paid'));
  it('notes the new cycle', () => expect(row(rows, 'Annual Cycle')?.formula).toContain('new cycle starts next month'));
});
