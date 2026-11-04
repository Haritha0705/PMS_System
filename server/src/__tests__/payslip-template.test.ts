/**
 * Template: templates/payslip.ts — the server-generated pay sheet PDF
 */

import { describe, it, expect } from 'vitest';
import { renderPayslipHTML } from '../templates/payslip';
import type { PayslipEmployee } from '../types/worker';

const nonTarget: PayslipEmployee = {
  id: 'ps1', codeNo: 'E001', firstName: 'A', lastName: 'B', designation: 'Coordinator', branch: 'Galle',
  bankName: '', bankAccount: '', payMonth: '2026-11',
  basicSalary: 35_000, achievedSalary: 40_000, isSalesRole: false,
  vehicleAllowance: 0, fuelAllowance: 0, generalAllowance: 5_000, orc: 0, otherOffer: 0,
  customEarningName: '', customEarningAmount: 0, grossSalary: 40_000,
  epfEmployee: 2_800, epfEmployer: 4_200, etf: 1_050, nopayDeduction: 0, lateDeduction: 0, welfare: 0,
  customDeductionName: '', customDeductionAmount: 0, netSalary: 37_200, achievementPct: 0, assignedTarget: 0,
  cycle: 0, remainingTarget: 0, remainingSalary: 0, createdAt: '2026-11-04T00:00:00.000Z',
};

const sales: PayslipEmployee = {
  ...nonTarget, designation: 'Project Manager', isSalesRole: true,
  basicSalary: 150_000, achievedSalary: 150_000, generalAllowance: 0, grossSalary: 150_000,
  epfEmployee: 3_000, netSalary: 147_000, cycle: 1, remainingTarget: 16_500_000, remainingSalary: 0,
};

const TITLE = 'Remaining Target Annual Amount &amp; Remaining Annual Salary';

describe('renderPayslipHTML', () => {
  it('shows the basic salary as the basic offer, apart from the gross', () => {
    const html = renderPayslipHTML(nonTarget);
    expect(html).toMatch(/Basic Offer<\/span><span class="amt">Rs\. 35,000\.00/);
    expect(html).toMatch(/Gross Offer<\/span><span class="amt">Rs\. 40,000\.00/);
  });

  it('adds the remaining section for sales roles, keeping a zero amount', () => {
    const html = renderPayslipHTML(sales);
    expect(html).toContain(TITLE);
    expect(html).toMatch(/Remaining Target Annual Amount<\/span><span class="amt">Rs\. 16,500,000\.00/);
    expect(html).toMatch(/Remaining Annual Salary<\/span><span class="amt">Rs\. 0\.00/);
  });

  it('leaves the section out for non-target roles', () => {
    expect(renderPayslipHTML(nonTarget)).not.toContain(TITLE);
  });

  it('leaves the section out for sales paysheets with no cycle data', () => {
    expect(renderPayslipHTML({ ...sales, cycle: 0 })).not.toContain(TITLE);
  });
});
