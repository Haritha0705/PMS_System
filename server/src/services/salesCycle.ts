// ============================================================
// Paysheet calculation with the sales annual cycle
// ============================================================
// Sales (Category A) pay depends on the employee's previous month: carry-forward,
// total achieved and salary paid so far in the annual cycle. Those values are stored
// on every sales paysheet, so the next month can continue from them.
//
// Rules:
//   - "Previous month" = the employee's latest ACTIVE paysheet before this pay month.
//   - If there is none, it is on another role, or it has no cycle data (cycle = 0,
//     e.g. created before the annual-cycle system), the cycle starts fresh.
//   - Changing or removing a month recalculates that employee's later months in order.

import { dbGetPaysheetsByCodeNo, dbUpdatePaysheet } from './dbStore';
import { MonthlyPaysheetDTO } from '../models';
import {
  calculatePaysheet,
  getRoleConfig,
  isSalesRole,
  initialSalesState,
  type EmployeePerformance,
  type PaysheetInput,
  type PaysheetResult,
  type SalesRole,
  type SalesRoleConfig,
  type NonTargetRoleConfig,
} from '../engine/salary-calculator';

export interface PaysheetFields {
  achieve: number; allowance: number; otherOffer: number;
  nopay: number; lateHours: number; lateMinutes: number;
  welfare: number; epfAvailability: boolean;
  customEarningAmount: number; customDeductionAmount: number;
}

export function buildPaysheetInput(
  roleCode: string,
  roleConfig: SalesRoleConfig | NonTargetRoleConfig,
  fields: PaysheetFields,
  previousState?: EmployeePerformance
): PaysheetInput {
  const common = {
    role: roleConfig,
    otherOffer: fields.otherOffer, nopayDays: fields.nopay,
    lateHours: fields.lateHours, lateMinutes: fields.lateMinutes,
    others: fields.welfare, epfAvailability: fields.epfAvailability,
    customEarningAmount: fields.customEarningAmount,
    customDeductionAmount: fields.customDeductionAmount,
  };
  if (isSalesRole(roleCode)) {
    return { ...common, achievementAmount: fields.achieve, generalAllowance: fields.allowance, previousState };
  }
  return common;
}

/** Engine result → the fields stored on a paysheet (drops engine-only values). */
export function toPaysheetFields(result: PaysheetResult): Partial<MonthlyPaysheetDTO> {
  const { nextState: _n, cycleRefreshed: _c, previousCarryForward, ...rest } = result;
  return {
    ...rest,
    cycle: result.cycle ?? 0,
    cycleMonth: result.cycleMonth ?? 0,
    prevCarryForward: previousCarryForward ?? 0,
    carryForward: result.carryForward ?? 0,
    totalAchieved: result.totalAchieved ?? 0,
    totalSalaryPaid: result.totalSalaryPaid ?? 0,
    remainingTarget: result.remainingTarget ?? 0,
    remainingSalary: result.remainingSalary ?? 0,
    annualTargetCompleted: result.annualTargetCompleted ?? false,
  };
}

/** State to start the NEXT month from, rebuilt from a saved sales paysheet. */
export function stateAfterPaysheet(ps: MonthlyPaysheetDTO, month: number): EmployeePerformance | null {
  if (!isSalesRole(ps.role) || !ps.cycle) return null;
  const role = ps.role as SalesRole;
  const cycleMonth = ps.cycleMonth ?? 0;
  // carryForward is stored as the value for next month (already 0 after a plain year-end)
  const carryForward = ps.carryForward ?? 0;
  if (ps.annualTargetCompleted || cycleMonth >= 12) {
    return { role, month, cycle: ps.cycle + 1, cycleMonth: 0, totalAchieved: 0, totalSalaryPaid: 0, carryForward };
  }
  return {
    role, month, cycle: ps.cycle, cycleMonth,
    totalAchieved: ps.totalAchieved ?? 0,
    totalSalaryPaid: ps.totalSalaryPaid ?? 0,
    carryForward,
  };
}

const isActive = (ps: MonthlyPaysheetDTO) => (ps.status ?? 'active') === 'active';

/** Previous state from an already-loaded, month-ordered list of the employee's paysheets. */
function previousStateFromList(
  list: MonthlyPaysheetDTO[], payMonth: string, roleCode: SalesRole
): EmployeePerformance {
  const earlier = list.filter((p) => isActive(p) && p.payMonth < payMonth);
  const prev = earlier[earlier.length - 1];
  if (!prev || prev.role !== roleCode) return initialSalesState(roleCode);
  return stateAfterPaysheet(prev, earlier.length) ?? initialSalesState(roleCode);
}

/** State the given pay month starts from (undefined for non-sales roles). */
export async function getPreviousState(
  codeNo: string, payMonth: string, roleCode: string
): Promise<EmployeePerformance | undefined> {
  if (!isSalesRole(roleCode)) return undefined;
  const list = await dbGetPaysheetsByCodeNo(codeNo);
  return previousStateFromList(list, payMonth, roleCode);
}

function fieldsOf(ps: MonthlyPaysheetDTO): PaysheetFields {
  return {
    achieve: ps.achieve, allowance: ps.allowance, otherOffer: ps.otherOffer,
    nopay: ps.nopay, lateHours: ps.lateHours, lateMinutes: ps.lateMinutes,
    welfare: ps.welfare, epfAvailability: ps.epfAvailability,
    customEarningAmount: ps.customEarningAmount ?? 0,
    customDeductionAmount: ps.customDeductionAmount ?? 0,
  };
}

/** Recalculate a saved paysheet from its own inputs and the given previous state. */
export function recalcPaysheet(ps: MonthlyPaysheetDTO, previousState?: EmployeePerformance): MonthlyPaysheetDTO | null {
  const roleConfig = getRoleConfig(ps.role);
  if (!roleConfig) return null;
  const result = calculatePaysheet(buildPaysheetInput(ps.role, roleConfig, fieldsOf(ps), previousState));
  return {
    ...ps,
    ...toPaysheetFields(result),
    welfare: ps.welfare,
    otherOffer: ps.otherOffer,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Recalculate the employee's sales paysheets AFTER `fromPayMonth`, oldest first,
 * each one starting from the state its (possibly just-updated) previous month leaves.
 * Returns how many paysheets were updated.
 */
export async function recalcFollowingMonths(codeNo: string, fromPayMonth: string): Promise<number> {
  const list = await dbGetPaysheetsByCodeNo(codeNo);
  let updated = 0;
  for (let i = 0; i < list.length; i++) {
    const ps = list[i];
    if (!isActive(ps) || ps.payMonth <= fromPayMonth || !isSalesRole(ps.role)) continue;
    const prevState = previousStateFromList(list, ps.payMonth, ps.role);
    const next = recalcPaysheet(ps, prevState);
    if (!next) continue;
    list[i] = next; // later months must see this month's new values
    await dbUpdatePaysheet(ps.id!, next);
    updated++;
  }
  return updated;
}
