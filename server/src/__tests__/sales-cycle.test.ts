/**
 * Sales (Category A) annual-cycle salary system
 */

import { describe, it, expect } from 'vitest';
import {
  calculateMonthlySalary,
  calculatePaysheet,
  getRoleConfig,
  initialSalesState,
  isSalesRole,
  SALES_CONFIG,
  SALES_BASED_ROLES,
  type EmployeePerformance,
  type MonthlyResult,
  type SalesRole,
} from '../engine/salary-calculator';

/** Run several months in a row, each starting from the previous month's nextState. */
function runMonths(role: SalesRole, achievements: number[], start?: EmployeePerformance): MonthlyResult[] {
  let state = start ?? initialSalesState(role);
  return achievements.map((a) => {
    const r = calculateMonthlySalary(role, a, state);
    state = r.nextState;
    return r;
  });
}

describe('Sales role table', () => {
  it('has exactly the 5 new roles', () => {
    expect(Object.keys(SALES_BASED_ROLES)).toEqual(['PGM', 'PAGM', 'PPH', 'PRM', 'PM']);
  });

  it.each([
    ['PGM',  8_100_000_000, 675_000_000, 8_400_000, 700_000],
    ['PAGM', 2_700_000_000, 225_000_000, 7_500_000, 625_000],
    ['PPH',    900_000_000,  75_000_000, 6_600_000, 550_000],
    ['PRM',    180_000_000,  15_000_000, 4_200_000, 350_000],
    ['PM',      18_000_000,   1_500_000, 1_800_000, 150_000],
  ] as const)('%s config', (role, annualTarget, monthlyTarget, annualSalary, monthlySalary) => {
    expect(isSalesRole(role)).toBe(true);
    expect(SALES_CONFIG[role]).toMatchObject({ role, annualTarget, monthlyTarget, annualSalary, monthlySalary });
    // monthly × 12 = annual for every role
    expect(monthlyTarget * 12).toBe(annualTarget);
    expect(monthlySalary * 12).toBe(annualSalary);
  });

  it('old sales role codes are gone', () => {
    for (const old of ['GM', 'AGM', 'PH', 'DPH', 'SRM', 'RM', 'BM', 'BDE']) {
      expect(getRoleConfig(old)).toBeNull();
    }
  });
});

// ── The worked PGM example (Jan → May) ───────────────────────────────────────

describe('PGM worked example', () => {
  const [jan, feb, mar, apr, may] = runMonths('PGM', [
    472_500_000,    // Jan: 70% of monthly target
    7_627_500_000,  // Feb: completes the annual target
    472_500_000,    // Mar: new cycle
    800_000_000,    // Apr: over target, extra carried
    550_000_000,    // May: target reduced by April's extra
  ]);

  it('January — 70% of target → 70% of monthly salary', () => {
    expect(jan.adjustedTarget).toBe(675_000_000);
    expect(jan.achievementPercentage).toBe(70);
    expect(jan.salaryEarned).toBe(490_000);
    expect(jan.carryForward).toBe(0);
    expect(jan.cycle).toBe(1);
    expect(jan.cycleMonth).toBe(1);
    expect(jan.cycleRefreshed).toBe(false);
  });

  it('February — annual target completed → remaining annual salary, cycle refreshes', () => {
    expect(feb.annualTargetCompleted).toBe(true);
    expect(feb.totalAchieved).toBe(8_100_000_000);
    expect(feb.salaryEarned).toBe(7_910_000);
    expect(feb.totalSalaryPaid).toBe(8_400_000);
    expect(feb.remainingSalary).toBe(0);
    expect(feb.cycleRefreshed).toBe(true);
    expect(feb.nextState).toMatchObject({ cycle: 2, cycleMonth: 0, totalAchieved: 0, totalSalaryPaid: 0, carryForward: 0 });
  });

  it('March — fresh cycle', () => {
    expect(mar.cycle).toBe(2);
    expect(mar.cycleMonth).toBe(1);
    expect(mar.salaryEarned).toBe(490_000);
    expect(mar.remainingTarget).toBe(8_100_000_000 - 472_500_000);
  });

  it('April — over target → full salary, 125M carried', () => {
    expect(apr.achievementPercentage).toBe(100);
    expect(apr.salaryEarned).toBe(700_000);
    expect(apr.extraAchievement).toBe(125_000_000);
    expect(apr.carryForward).toBe(125_000_000);
  });

  it("May — target reduced by April's extra", () => {
    expect(may.previousCarryForward).toBe(125_000_000);
    expect(may.adjustedTarget).toBe(550_000_000);
    expect(may.achievementPercentage).toBe(100);
    expect(may.salaryEarned).toBe(700_000);
    expect(may.carryForward).toBe(0);
    expect(may.totalAchieved).toBe(472_500_000 + 800_000_000 + 550_000_000);
    expect(may.totalSalaryPaid).toBe(490_000 + 700_000 + 700_000);
  });
});

// ── Edge cases ───────────────────────────────────────────────────────────────

describe('Year-end without completing the annual target', () => {
  // PM: 11 × 1.4M + 1.6M = 17.0M < 18M annual target
  const months = runMonths('PM', [...Array(11).fill(1_400_000), 1_600_000]);
  const last = months[11];

  it('each 1.4M month pays 93.33% of 150,000', () => expect(months[0].salaryEarned).toBe(140_000));
  it('month 12 refreshes the cycle', () => {
    expect(last.cycleMonth).toBe(12);
    expect(last.annualTargetCompleted).toBe(false);
    expect(last.cycleRefreshed).toBe(true);
    expect(last.nextState.cycle).toBe(2);
  });
  it('carry is dropped at a plain year-end', () => {
    expect(last.extraAchievement).toBe(100_000);
    expect(last.carryForward).toBe(0);
    expect(last.nextState.carryForward).toBe(0);
  });
  it('unpaid salary is not carried into the new cycle', () => {
    expect(last.nextState.totalSalaryPaid).toBe(0);
  });
});

describe('Carry larger than one monthly target is used one month at a time', () => {
  // PM: month 1 = 5M (3.5M extra), then 0 achievement
  const [m1, m2, m3, m4] = runMonths('PM', [5_000_000, 0, 0, 0]);

  it('month 1 carries 3.5M', () => expect(m1.carryForward).toBe(3_500_000));
  it('month 2: target 0 → full salary from carry, 2.0M left', () => {
    expect(m2.adjustedTarget).toBe(0);
    expect(m2.salaryEarned).toBe(150_000);
    expect(m2.carryForward).toBe(2_000_000);
  });
  it('month 3: target 0 again, 0.5M left', () => {
    expect(m3.salaryEarned).toBe(150_000);
    expect(m3.carryForward).toBe(500_000);
  });
  it('month 4: target 1.0M, nothing achieved → 0 salary', () => {
    expect(m4.adjustedTarget).toBe(1_000_000);
    expect(m4.salaryEarned).toBe(0);
    expect(m4.carryForward).toBe(0);
  });
});

describe('Annual target completed in one month', () => {
  const [m1, m2] = runMonths('PM', [20_000_000, 0]);

  it('pays exactly the annual salary, never more', () => {
    expect(m1.salaryEarned).toBe(1_800_000);
    expect(m1.totalSalaryPaid).toBe(1_800_000);
  });
  it('the 2M above the annual target moves to the new cycle', () => {
    expect(m1.carryForward).toBe(2_000_000);
    expect(m1.nextState).toMatchObject({ cycle: 2, carryForward: 2_000_000 });
  });
  it('the carry covers the next month', () => {
    expect(m2.cycle).toBe(2);
    expect(m2.adjustedTarget).toBe(0);
    expect(m2.salaryEarned).toBe(150_000);
  });
});

describe('Invalid input', () => {
  const s = initialSalesState('PM');
  it('negative achievement', () => expect(() => calculateMonthlySalary('PM', -1, s)).toThrow('Invalid achievement amount'));
  it('NaN achievement', () => expect(() => calculateMonthlySalary('PM', NaN, s)).toThrow('Invalid achievement amount'));
  it('role mismatch', () => expect(() => calculateMonthlySalary('PGM', 0, s)).toThrow('does not match'));
  it('cycle month out of range', () =>
    expect(() => calculateMonthlySalary('PM', 0, { ...s, cycleMonth: 12 })).toThrow('Invalid cycle month'));
});

// ── Full paysheet (deductions on top of salaryEarned) ────────────────────────

describe('calculatePaysheet — PGM with deductions', () => {
  const r = calculatePaysheet({
    role: getRoleConfig('PGM')!,
    achievementAmount: 472_500_000,
    generalAllowance: 10_000,
    otherOffer: 0,
    nopayDays: 2,
    lateHours: 0,
    lateMinutes: 0,
    others: 0,
    epfAvailability: true,
  });

  it('basicSalary = monthly salary (rate for no-pay / late)', () => expect(r.basicSalary).toBe(700_000));
  it('achievedSalary = salaryEarned', () => expect(r.achievedSalary).toBe(490_000));
  it('assignedTarget = this month\'s target', () => expect(r.assignedTarget).toBe(675_000_000));
  it('achievementPct stored as a fraction', () => expect(r.achievementPct).toBeCloseTo(0.7, 6));
  it('gross = salaryEarned + general allowance', () => expect(r.grossSalary).toBe(500_000));
  it('no-pay = 700,000 / 25 × 1.5', () => expect(r.nopayDeduction).toBeCloseTo(42_000, 2));
  it('EPF 8% on the fixed value (achievement 25% or more)', () => expect(r.epfEmployee).toBeCloseTo(14_000, 2));
  it('ETF 3% on salaryEarned', () => expect(r.etf).toBeCloseTo(14_700, 2));
  it('net = 500,000 − 42,000 − 14,000', () => expect(r.netSalary).toBeCloseTo(444_000, 2));
  it('no ORC, vehicle or fuel', () => {
    expect(r.orc).toBe(0);
    expect(r.vehicleAllowance).toBe(0);
    expect(r.fuelAllowance).toBe(0);
  });
  it('returns cycle state for the next month', () => {
    expect(r.cycle).toBe(1);
    expect(r.cycleMonth).toBe(1);
    expect(r.nextState?.totalAchieved).toBe(472_500_000);
  });
});

describe('calculatePaysheet — previous state from another role starts fresh', () => {
  const pmState: EmployeePerformance = { ...initialSalesState('PM'), cycleMonth: 5, carryForward: 1_000_000 };
  const r = calculatePaysheet({
    role: getRoleConfig('PRM')!,
    previousState: pmState,
    achievementAmount: 15_000_000,
    nopayDays: 0, lateHours: 0, lateMinutes: 0, epfAvailability: true,
  });
  it('ignores the other role\'s carry and month', () => {
    expect(r.previousCarryForward).toBe(0);
    expect(r.cycleMonth).toBe(1);
    expect(r.achievedSalary).toBe(350_000);
  });
});

// ── EPF (employee 8%) for sales roles ────────────────────────────────────────

describe('Category A EPF 8%', () => {
  const epfFor = (role: string, achievementAmount: number, epfAvailability = true) =>
    calculatePaysheet({
      role: getRoleConfig(role)!, achievementAmount,
      nopayDays: 0, lateHours: 0, lateMinutes: 0, epfAvailability,
    });

  const TABLE: [string, number, number, number][] = [
    ['PGM',  675_000_000, 175_000, 14_000],
    ['PAGM', 225_000_000, 156_250, 12_500],
    ['PPH',   75_000_000, 137_500, 11_000],
    ['PRM',   15_000_000,  87_500,  7_000],
    ['PM',     1_500_000,  37_500,  3_000],
  ];

  for (const [role, monthlyTarget, fixedValue, epf] of TABLE) {
    it(`${role}: fixed value ${fixedValue} gives EPF ${epf} at exactly 25%`, () => {
      expect(epfFor(role, monthlyTarget * 0.25).epfEmployee).toBeCloseTo(epf, 2);
    });

    it(`${role}: EPF stays ${epf} at 100% and over`, () => {
      expect(epfFor(role, monthlyTarget).epfEmployee).toBeCloseTo(epf, 2);
      expect(epfFor(role, monthlyTarget * 1.5).epfEmployee).toBeCloseTo(epf, 2);
    });

    it(`${role}: below 25% EPF is 8% of the salary achieved`, () => {
      const r = epfFor(role, monthlyTarget * 0.1);
      expect(r.epfEmployee).toBeCloseTo(r.achievedSalary * 0.08, 2);
      expect(r.epfEmployee).toBeLessThan(epf);
    });
  }

  it('just under 25% is not rounded up to the fixed value', () => {
    const r = epfFor('PM', 374_990); // 24.9993%, stored rounded as 25%
    expect(r.achievementPct).toBeCloseTo(0.25, 6);
    expect(r.epfEmployee).toBeCloseTo(r.achievedSalary * 0.08, 2);
    expect(r.epfEmployee).toBeLessThan(3_000);
  });

  it('nothing achieved -> no EPF', () => expect(epfFor('PM', 0).epfEmployee).toBe(0));
  it('not enrolled -> no EPF', () => expect(epfFor('PM', 1_500_000, false).epfEmployee).toBe(0));

  it('employer EPF and ETF stay on the salary earned', () => {
    const r = epfFor('PM', 1_500_000);
    expect(r.epfEmployer).toBeCloseTo(18_000, 2);
    expect(r.etf).toBeCloseTo(4_500, 2);
  });

  it('net salary deducts the new EPF', () => {
    const r = epfFor('PM', 1_500_000);
    expect(r.netSalary).toBeCloseTo(150_000 - 3_000, 2);
  });
});
