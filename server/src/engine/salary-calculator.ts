// ============================================================
// Prestige Salary System — Complete Implementation
// ============================================================

// ── Constants ────────────────────────────────────────────────
export const WORKING_DAYS_PER_MONTH = 25;
export const WORKING_HOURS_PER_DAY = 8;
export const TOTAL_MINUTES_PER_MONTH = 12_000; // 25 × 8 × 60

export const EPF_EMPLOYEE_RATE = 0.08;
export const EPF_EMPLOYER_RATE = 0.12;
export const ETF_RATE = 0.03;

// ── Role categories ──────────────────────────────────────────
export const JOB_ROLE_CATEGORIES = {
  SALES_BASED: "Sales/Target-Based Roles",
  NON_TARGET: "Non-Target Roles",
} as const;

// ── Category A roles (sales — annual-cycle salary system) ────
export const SALES_BASED_ROLES = {
  PGM: "Prestige General Manager",
  PAGM: "Prestige Assistant General Manager",
  PPH: "Prestige Provincial Head",
  PRM: "Prestige Regional Manager",
  PM: "Prestige Manager",
} as const;
export type SalesRole = keyof typeof SALES_BASED_ROLES;

// ── Category B roles ─────────────────────────────────────────
export const NON_TARGET_ROLES = {
  SR_EXEC_HR: "Senior Executive HR",
  JR_EXEC_HR: "Junior Executive HR",
  ADMIN_MANAGER: "Admin Manager",
  LEGAL_MANAGER: "Legal Manager",
  EXEC_ASST_HR: "Executive Assistant HR",
  EXEC_ASST_LAND: "Executive Assistant Land",
  EXEC_GEM_1: "Executive Gem 1",
  EXEC_GEM_2: "Executive Gem 2",
  EXEC_MEDIA: "Executive Media",
  CABANA_PM: "Cabana Project Manager",
  NETWORK_IT_MANAGER: "Network & IT Manager",
  HEAD_MICRO_FIN: "Head of Micro Finance",
  EXEC_MICRO_FIN_1: "Executive Micro Finance 1",
  EXEC_MICRO_FIN_2: "Executive Micro Finance 2",
  MICRO_FIN_UNIT_HEAD: "Micro Finance Unit Head",
  GEMO: "Gemologist",
  EXEC_ASST_FIN: "Executive Assistant Finance",
} as const;
export type NonTargetRole = keyof typeof NON_TARGET_ROLES;

// ── Category A config ────────────────────────────────────────
export interface SalesRoleConfig {
  role: SalesRole;
  label: string;
  annualTarget: number;
  monthlyTarget: number;
  annualSalary: number;
  monthlySalary: number;
}

export const SALES_CONFIG: Record<SalesRole, SalesRoleConfig> = {
  PGM:  { role: "PGM",  label: "Prestige General Manager",           annualTarget: 8_100_000_000, monthlyTarget: 675_000_000, annualSalary: 8_400_000, monthlySalary: 700_000 },
  PAGM: { role: "PAGM", label: "Prestige Assistant General Manager", annualTarget: 2_700_000_000, monthlyTarget: 225_000_000, annualSalary: 7_500_000, monthlySalary: 625_000 },
  PPH:  { role: "PPH",  label: "Prestige Provincial Head",           annualTarget:   900_000_000, monthlyTarget:  75_000_000, annualSalary: 6_600_000, monthlySalary: 550_000 },
  PRM:  { role: "PRM",  label: "Prestige Regional Manager",          annualTarget:   180_000_000, monthlyTarget:  15_000_000, annualSalary: 4_200_000, monthlySalary: 350_000 },
  PM:   { role: "PM",   label: "Prestige Manager",                   annualTarget:    18_000_000, monthlyTarget:   1_500_000, annualSalary: 1_800_000, monthlySalary: 150_000 },
};

// ── Category A annual-cycle state ────────────────────────────
/** State carried from one month to the next (stored on each paysheet). */
export interface EmployeePerformance {
  role: SalesRole;
  month: number;            // overall month counter (never resets)
  cycle: number;            // annual cycle number (1, 2, 3 ...)
  cycleMonth: number;       // months finished inside the current annual cycle (0 - 11)
  totalAchieved: number;    // achieved inside the current annual cycle
  totalSalaryPaid: number;  // salary paid inside the current annual cycle
  carryForward: number;     // extra achievement carried to next month
}

export interface MonthlyResult {
  role: SalesRole;
  month: number;
  cycle: number;
  cycleMonth: number;

  monthlyTarget: number;
  previousCarryForward: number;
  adjustedTarget: number;

  actualAchievement: number;
  achievementPercentage: number;
  extraAchievement: number;

  monthlySalary: number;
  salaryEarned: number;

  annualTarget: number;
  totalAchieved: number;
  remainingTarget: number;

  annualSalary: number;
  totalSalaryPaid: number;
  remainingSalary: number;

  carryForward: number;
  annualTargetCompleted: boolean;
  /** true when annualTarget / annualSalary are refreshed for the next month */
  cycleRefreshed: boolean;
  /** state to store and pass to the next month's calculation */
  nextState: EmployeePerformance;
}

/** Starting state for an employee's first month on a sales role. */
export function initialSalesState(role: SalesRole): EmployeePerformance {
  return { role, month: 0, cycle: 1, cycleMonth: 0, totalAchieved: 0, totalSalaryPaid: 0, carryForward: 0 };
}

export const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

// ── Category B config ─────────────────────────────────────────
export interface NonTargetRoleConfig {
  label: string;
  basicSalary: number;
  /** Flat monthly allowance, always paid in full — added to gross; EPF/ETF stay on basic only. */
  fixedAllowance?: number;
  /** Flat monthly allowance, always paid in full — NOT tiered by attendance/achievement like Category A. */
  vehicleAllowance?: number;
  /** Flat monthly allowance, always paid in full — NOT tiered by attendance/achievement like Category A. */
  fuelAllowance?: number;
}

export const NON_TARGET_CONFIG: Record<NonTargetRole, NonTargetRoleConfig> = {
  SR_EXEC_HR:          { label: "Senior Executive HR",         basicSalary:  42_500, fixedAllowance:  15_000 },
  JR_EXEC_HR:          { label: "Junior Executive HR",         basicSalary:  40_000, fixedAllowance:  10_000 },
  ADMIN_MANAGER:       { label: "Admin Manager",               basicSalary:  75_000, fixedAllowance:   5_000 },
  LEGAL_MANAGER:       { label: "Legal Manager",               basicSalary:  75_000 },
  EXEC_ASST_HR:        { label: "Executive Assistant HR",      basicSalary:  35_000, fixedAllowance:   5_000 },
  EXEC_ASST_LAND:      { label: "Executive Assistant Land",    basicSalary:  35_000, fixedAllowance:   5_000 },
  EXEC_GEM_1:          { label: "Executive Gem 1",             basicSalary:  35_000, fixedAllowance:   5_000 },
  EXEC_GEM_2:          { label: "Executive Gem 2",             basicSalary:  30_000, fixedAllowance:   5_000 },
  EXEC_MEDIA:          { label: "Executive Media",             basicSalary:  35_000, fixedAllowance:   5_000 },
  CABANA_PM:           { label: "Cabana Project Manager",      basicSalary: 100_000, fixedAllowance:  50_000 },
  NETWORK_IT_MANAGER:  { label: "Network & IT Manager",        basicSalary: 100_000 },
  HEAD_MICRO_FIN:      { label: "Head of Micro Finance",       basicSalary:  80_000, fixedAllowance:  50_000 },
  EXEC_MICRO_FIN_1:    { label: "Executive Micro Finance 1",   basicSalary:  35_000, fixedAllowance:   5_000 },
  EXEC_MICRO_FIN_2:    { label: "Executive Micro Finance 2",   basicSalary:  35_000, fixedAllowance:   5_000 },
  MICRO_FIN_UNIT_HEAD: { label: "Micro Finance Unit Head",     basicSalary:  80_000, fixedAllowance: 160_000 },
  GEMO:                { label: "Gemologist",                  basicSalary: 200_000, vehicleAllowance: 100_000, fuelAllowance: 80_000 },
  EXEC_ASST_FIN:       { label: "Executive Assistant Finance", basicSalary:  35_000 },
};

// ── Paysheet calculation input/output types ──────────────────
export interface PaysheetInput {
  role: SalesRoleConfig | NonTargetRoleConfig;
  /** Category A only — state after the employee's previous month (omit for the first month). */
  previousState?: EmployeePerformance;
  /** Legacy field, no longer used in any calculation. */
  monthsOfService?: number;
  achievementAmount?: number;
  generalAllowance?: number;
  otherOffer?: number;
  nopayDays: number;
  lateHours: number;
  lateMinutes: number;
  others?: number;
  epfAvailability: boolean;
  customEarningAmount?: number;
  customDeductionAmount?: number;
}

export interface PaysheetResult {
  basicSalary: number;
  achievedSalary: number;
  vehicleAllowance?: number;
  fuelAllowance?: number;
  generalAllowance?: number;
  otherOffer?: number;
  assignedTarget?: number;
  achievementPct?: number;
  orc?: number;
  customEarningAmount?: number;
  grossSalary: number;
  nopayDeduction: number;
  lateDeduction: number;
  epfEmployee: number;
  epfEmployer: number;
  etf: number;
  welfare: number;
  customDeductionAmount?: number;
  netSalary: number;

  // Category A annual-cycle details (state AFTER this month)
  cycle?: number;
  cycleMonth?: number;
  previousCarryForward?: number;
  carryForward?: number;
  totalAchieved?: number;
  totalSalaryPaid?: number;
  remainingTarget?: number;
  remainingSalary?: number;
  annualTargetCompleted?: boolean;
  cycleRefreshed?: boolean;
  nextState?: EmployeePerformance;
}

// ============================================================
// Utility functions to detect role category
// ============================================================

export function isSalesRole(role: any): role is SalesRole {
  return role in SALES_CONFIG;
}

export function isNonTargetRole(role: any): role is NonTargetRole {
  return role in NON_TARGET_CONFIG;
}

export function getRoleConfig(role: string): SalesRoleConfig | NonTargetRoleConfig | null {
  if (isSalesRole(role)) return SALES_CONFIG[role];
  if (isNonTargetRole(role)) return NON_TARGET_CONFIG[role];
  return null;
}

// ============================================================
// Core calculation functions
// ============================================================

/**
 * Category A — one month of the annual-cycle salary system.
 * Uses the previous month's state; returns this month's salary and the next state.
 */
export function calculateMonthlySalary(
  role: SalesRole,
  actualAchievement: number,
  previous: EmployeePerformance
): MonthlyResult {
  const config = SALES_CONFIG[role];
  if (!config) throw new Error(`Unknown sales role: ${role}`);

  if (!Number.isFinite(actualAchievement) || actualAchievement < 0) {
    throw new Error("Invalid achievement amount");
  }
  if (previous.role !== role) {
    throw new Error("Employee role does not match performance record");
  }
  if (!Number.isInteger(previous.cycleMonth) || previous.cycleMonth < 0 || previous.cycleMonth >= 12) {
    throw new Error("Invalid cycle month");
  }

  const { annualTarget, monthlyTarget, annualSalary, monthlySalary } = config;
  const cycleMonth = previous.cycleMonth + 1;

  // 1. Remaining annual amounts in the current cycle
  const remainingTarget = Math.max(0, annualTarget - previous.totalAchieved);
  const remainingSalary = Math.max(0, annualSalary - previous.totalSalaryPaid);

  // 2. This month's target = monthlyTarget minus previous carry-forward
  //    (never more than what is left of the annual target)
  const adjustedTarget = Math.min(remainingTarget, Math.max(0, monthlyTarget - previous.carryForward));

  // 3. Annual progress
  const acceptedAchievement = Math.min(actualAchievement, remainingTarget);
  const totalAchieved = previous.totalAchieved + acceptedAchievement;

  // 4. Annual target completed this month?
  const annualTargetCompleted = totalAchieved >= annualTarget;

  // 5. Achievement percentage against this month's target
  const achievementPercentage = adjustedTarget === 0
    ? 100
    : Math.min(100, (actualAchievement / adjustedTarget) * 100);

  // 6. Salary
  let salaryEarned: number;
  if (annualTargetCompleted) {
    // Annual target done -> pay all remaining annual salary
    salaryEarned = remainingSalary;
  } else {
    // Below target -> percentage of monthlySalary; on / over target -> full monthlySalary
    salaryEarned = Math.min(monthlySalary * (achievementPercentage / 100), remainingSalary);
  }
  salaryEarned = round2(salaryEarned);

  // 7. Carry-forward — carry larger than one monthlyTarget is consumed one month at a time.
  const previousCarryUsed = Math.min(previous.carryForward, monthlyTarget);
  const unusedPreviousCarry = previous.carryForward - previousCarryUsed;

  // Extra = achievement above this month's target
  //   (in the completion month: only the part above the annual target, which moves to the new cycle)
  const extraAchievement = annualTargetCompleted
    ? Math.max(0, actualAchievement - remainingTarget)
    : Math.max(0, actualAchievement - adjustedTarget);

  const carryForward = annualTargetCompleted ? extraAchievement : unusedPreviousCarry + extraAchievement;

  // 8. Totals for this cycle
  const totalSalaryPaid = round2(previous.totalSalaryPaid + salaryEarned);

  // 9. Refresh annualTarget / annualSalary when the annual target is completed or the 12-month cycle ends
  const cycleRefreshed = annualTargetCompleted || cycleMonth >= 12;

  const nextState: EmployeePerformance = cycleRefreshed
    ? {
        role,
        month: previous.month + 1,
        cycle: previous.cycle + 1,
        cycleMonth: 0,
        totalAchieved: 0,
        totalSalaryPaid: 0,
        // keep extra over the annual target; drop carry at plain year-end
        carryForward: annualTargetCompleted ? carryForward : 0,
      }
    : {
        role,
        month: previous.month + 1,
        cycle: previous.cycle,
        cycleMonth,
        totalAchieved,
        totalSalaryPaid,
        carryForward,
      };

  return {
    role,
    month: previous.month + 1,
    cycle: previous.cycle,
    cycleMonth,
    monthlyTarget,
    previousCarryForward: previous.carryForward,
    adjustedTarget,
    actualAchievement,
    achievementPercentage: round2(achievementPercentage),
    extraAchievement,
    monthlySalary,
    salaryEarned,
    annualTarget,
    totalAchieved,
    remainingTarget: Math.max(0, annualTarget - totalAchieved),
    annualSalary,
    totalSalaryPaid,
    remainingSalary: round2(Math.max(0, annualSalary - totalSalaryPaid)),
    carryForward: nextState.carryForward,
    annualTargetCompleted,
    cycleRefreshed,
    nextState,
  };
}

/** Col H Cat B — grossSalary = basic + otherOffer */
export function calculateAchieveSalaryCatB(basicSalary: number, otherOffer: number): number {
  return basicSalary + (otherOffer || 0);
}

/** No-pay deduction: 0.5-day grace, daily rate = basic/25 */
export function calculateNoPayDeduction(nopayDays: number, basicSalary: number): number {
  if (nopayDays > 0) return (basicSalary / WORKING_DAYS_PER_MONTH) * (nopayDays - 0.5);
  return 0;
}

/** Late deduction: per-minute rate = basic / 12,000 */
export function calculateLateDeduction(
  lateHours: number,
  lateMinutes: number,
  basicSalary: number
): number {
  const totalMinutes = lateHours * 60 + lateMinutes;
  return totalMinutes * (basicSalary / TOTAL_MINUTES_PER_MONTH);
}

/** EPF on achieved salary, NOT gross. Employee contribution deducted; employer is company cost only. */
export function calculateEPF(
  achievedSalary: number,
  epfAvailability: boolean
): { employee: number; employer: number } {
  if (!epfAvailability) return { employee: 0, employer: 0 };
  return {
    employee: achievedSalary * EPF_EMPLOYEE_RATE,
    employer: achievedSalary * EPF_EMPLOYER_RATE,
  };
}

/** ETF — employer cost only, NOT deducted from net */
export function calculateETF(achievedSalary: number, epfAvailability: boolean): number {
  return epfAvailability ? achievedSalary * ETF_RATE : 0;
}

// ============================================================
// Main paysheet calculation function
// ============================================================

export function calculatePaysheet(input: PaysheetInput): PaysheetResult {
  const isSales = "annualTarget" in input.role;

  if (isSales) {
    // Category A (Sales) — annual-cycle salary system
    const saleConfig = input.role as SalesRoleConfig;
    const roleCode = saleConfig.role;

    const previous = input.previousState && input.previousState.role === roleCode
      ? input.previousState
      : initialSalesState(roleCode);
    const cycle = calculateMonthlySalary(roleCode, input.achievementAmount || 0, previous);

    // basicSalary = fixed monthly salary — the rate for no-pay / late deductions
    const basicSalary = saleConfig.monthlySalary;
    const achievedSalary = cycle.salaryEarned;
    const generalAllowance = input.generalAllowance || 0;
    const otherOffer = input.otherOffer || 0;
    const customEarningAmount = input.customEarningAmount || 0;
    const grossSalary = achievedSalary + generalAllowance + otherOffer + customEarningAmount;
    const nopayDeduction = calculateNoPayDeduction(input.nopayDays, basicSalary);
    const lateDeduction = calculateLateDeduction(input.lateHours, input.lateMinutes, basicSalary);
    const epf = calculateEPF(achievedSalary, input.epfAvailability);
    const etf = calculateETF(achievedSalary, input.epfAvailability);
    const welfare = input.others || 0;
    const customDeductionAmount = input.customDeductionAmount || 0;
    const netSalary = grossSalary - (nopayDeduction + lateDeduction + epf.employee + welfare + customDeductionAmount);

    return {
      basicSalary,
      achievedSalary,
      vehicleAllowance: 0,
      fuelAllowance: 0,
      generalAllowance,
      otherOffer,
      assignedTarget: cycle.adjustedTarget,
      achievementPct: cycle.achievementPercentage / 100,
      orc: 0,
      customEarningAmount,
      grossSalary,
      nopayDeduction,
      lateDeduction,
      epfEmployee: epf.employee,
      epfEmployer: epf.employer,
      etf,
      welfare,
      customDeductionAmount,
      netSalary,
      cycle: cycle.cycle,
      cycleMonth: cycle.cycleMonth,
      previousCarryForward: cycle.previousCarryForward,
      carryForward: cycle.carryForward,
      totalAchieved: cycle.totalAchieved,
      totalSalaryPaid: cycle.totalSalaryPaid,
      remainingTarget: cycle.remainingTarget,
      remainingSalary: cycle.remainingSalary,
      annualTargetCompleted: cycle.annualTargetCompleted,
      cycleRefreshed: cycle.cycleRefreshed,
      nextState: cycle.nextState,
    };
  } else {
    // Category B (Non-Target) calculation
    const roleConfig = input.role as NonTargetRoleConfig;
    const basicSalary = roleConfig.basicSalary;
    const otherOffer = input.otherOffer || 0;
    const customEarningAmount = input.customEarningAmount || 0;
    // Flat allowances — always paid in full, NOT tiered by attendance or achievement (unlike Category A).
    const vehicleAllowance = roleConfig.vehicleAllowance || 0;
    const fuelAllowance = roleConfig.fuelAllowance || 0;
    const generalAllowance = roleConfig.fixedAllowance || 0;
    const achievedSalary =
      calculateAchieveSalaryCatB(basicSalary, otherOffer) + customEarningAmount + vehicleAllowance + fuelAllowance + generalAllowance;
    const nopayDeduction = calculateNoPayDeduction(input.nopayDays, basicSalary);
    const lateDeduction = calculateLateDeduction(input.lateHours, input.lateMinutes, basicSalary);
    const epf = calculateEPF(basicSalary, input.epfAvailability);
    const etf = calculateETF(basicSalary, input.epfAvailability);
    const welfare = input.others || 0;
    const customDeductionAmount = input.customDeductionAmount || 0;
    const netSalary = achievedSalary - (nopayDeduction + lateDeduction + epf.employee + welfare + customDeductionAmount);

    return {
      basicSalary,
      achievedSalary,
      vehicleAllowance,
      fuelAllowance,
      generalAllowance,
      otherOffer,
      customEarningAmount,
      grossSalary: achievedSalary,
      nopayDeduction,
      lateDeduction,
      epfEmployee: epf.employee,
      epfEmployer: epf.employer,
      etf,
      welfare,
      customDeductionAmount,
      netSalary,
    };
  }
}
