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

// ── Category A roles ─────────────────────────────────────────
export const SALES_BASED_ROLES = {
  GM: "General Manager",
  AGM: "Assistant General Manager",
  PH: "Provincial Head",
  DPH: "Deputy Provincial Head",
  SRM: "Senior Regional Manager",
  RM: "Regional Manager",
  BM: "Branch Manager",
  BDE: "Business Development Executive",
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

// ── Category A config (A3, A5, A7, A9, H3) ───────────────────
export interface SalesRoleConfig {
  label: string;
  basicSalary: number; // A3
  baseTarget: number; // H3
  vehicleAllowance: number; // A5
  fuelAllowance: number; // A7
  orcValue: number; // A9 raw value; actual rate = orcValue/100
}

export const SALES_CONFIG: Record<SalesRole, SalesRoleConfig> = {
  GM: {
    label: "General Manager",
    basicSalary: 275_000,
    baseTarget: 500_000_000,
    vehicleAllowance: 150_000,
    fuelAllowance: 100_000,
    orcValue: 0.5,
  },
  AGM: {
    label: "Assistant General Manager",
    basicSalary: 250_000,
    baseTarget: 250_000_000,
    vehicleAllowance: 120_000,
    fuelAllowance: 100_000,
    orcValue: 0.5,
  },
  PH: {
    label: "Provincial Head",
    basicSalary: 200_000,
    baseTarget: 50_000_000,
    vehicleAllowance: 100_000,
    fuelAllowance: 80_000,
    orcValue: 0.5,
  },
  DPH: {
    label: "Deputy Provincial Head",
    basicSalary: 150_000,
    baseTarget: 30_000_000,
    vehicleAllowance: 100_000,
    fuelAllowance: 70_000,
    orcValue: 0.5,
  },
  SRM: {
    label: "Senior Regional Manager",
    basicSalary: 85_000,
    baseTarget: 25_000_000,
    vehicleAllowance: 85_000,
    fuelAllowance: 30_000,
    orcValue: 0.5,
  },
  RM: {
    label: "Regional Manager",
    basicSalary: 80_000,
    baseTarget: 7_000_000,
    vehicleAllowance: 80_000,
    fuelAllowance: 30_000,
    orcValue: 1,
  },
  BM: {
    label: "Branch Manager",
    basicSalary: 50_000,
    baseTarget: 3_500_000,
    vehicleAllowance: 30_000,
    fuelAllowance: 20_000,
    orcValue: 1,
  },
  BDE: {
    label: "Business Development Exec.",
    basicSalary: 30_000,
    baseTarget: 200_000,
    vehicleAllowance: 0,
    fuelAllowance: 0,
    orcValue: 0,
  },
};

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
  monthsOfService: number;
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

/** Col H — Assigned target based on months of service */
export function calculateAssignedTarget(months: number, baseTarget: number): number {
  if (!Number.isFinite(months) || !Number.isInteger(months) || months < 0)
    throw new Error("months must be a non-negative integer");
  if (!Number.isFinite(baseTarget) || baseTarget <= 0)
    throw new Error("baseTarget must be a positive number");
  if (months > 5) return baseTarget;
  if (months > 4) return baseTarget * 0.75;
  if (months > 3) return baseTarget * 0.65;
  if (months > 2) return baseTarget * 0.45;
  if (months > 1) return baseTarget * 0.35;
  return baseTarget * 0.25;
}

/** Col J — Achievement %, floored to 2 decimal places (mirrors ROUNDDOWN) */
export function calculateAchievementPct(achieveAmount: number, assignedTarget: number): number {
  if (!Number.isFinite(achieveAmount) || achieveAmount < 0)
    throw new Error("achieveAmount must be non-negative");
  if (!Number.isFinite(assignedTarget) || assignedTarget <= 0)
    throw new Error("assignedTarget must be positive");
  return Math.floor((achieveAmount / assignedTarget) * 100) / 100;
}

/** Col K — Gross salary Cat A: >=50% → full basic, <50% → basic × ach × 2 */
export function calculateAchieveSalary(achPct: number, basicSalary: number): number {
  if (achPct >= 1.0) return basicSalary;
  if (achPct >= 0.5) return basicSalary;
  return basicSalary * achPct * 2;
}

/** Col L — Vehicle allowance: >=81% → 100%, 66–80% → 75%, 51–65% → 50%, <=50% → 0 */
export function calculateVehicleAllowance(achPct: number, vehicleAmount: number): number {
  if (achPct >= 0.81) return vehicleAmount;
  if (achPct >= 0.66) return vehicleAmount * 0.75;
  if (achPct >= 0.51) return vehicleAmount * 0.5;
  return 0;
}

/** Col M — Fuel allowance (identical tier logic to vehicle) */
export function calculateFuelAllowance(achPct: number, fuelAmount: number): number {
  if (achPct >= 0.81) return fuelAmount;
  if (achPct >= 0.66) return fuelAmount * 0.75;
  if (achPct >= 0.51) return fuelAmount * 0.5;
  return 0;
}

/**
 * Col O — ORC. Uses strictly > 1.00 (matches Row 4 formula — correct behavior).
 * orcValue is raw A9 cell value; actual rate = orcValue / 100.
 */
export function calculateORC(
    achieveAmount: number,
    orcValue: number,
    baseTarget: number
): number {
  if (achieveAmount > baseTarget) return (achieveAmount - baseTarget) * (orcValue / 100);
  return 0;
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
  const isSales = "baseTarget" in input.role;
  const basicSalary = input.role.basicSalary;

  if (isSales) {
    // Category A (Sales) calculation
    const saleConfig = input.role as SalesRoleConfig;
    const assignedTarget = calculateAssignedTarget(input.monthsOfService, saleConfig.baseTarget);
    const achievementAmount = input.achievementAmount || 0;
    const achievementPct = calculateAchievementPct(achievementAmount, assignedTarget);
    const achievedSalary = calculateAchieveSalary(achievementPct, basicSalary);
    const workedDays = WORKING_DAYS_PER_MONTH - input.nopayDays;
    const vehicleAllowance = workedDays > 7
        ? calculateVehicleAllowance(achievementPct, saleConfig.vehicleAllowance)
        : 0;
    const fuelAllowance = workedDays > 7
        ? calculateFuelAllowance(achievementPct, saleConfig.fuelAllowance)
        : 0;
    const generalAllowance = input.generalAllowance || 0;
    const otherOffer = input.otherOffer || 0;
    const orc = calculateORC(
      achievementAmount,
      saleConfig.orcValue,
      saleConfig.baseTarget,
    );
    const customEarningAmount = input.customEarningAmount || 0;
    const grossSalary = achievedSalary + vehicleAllowance + fuelAllowance + generalAllowance + orc + customEarningAmount + otherOffer;
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
      vehicleAllowance,
      fuelAllowance,
      generalAllowance,
      otherOffer,
      assignedTarget,
      achievementPct,
      orc,
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
    };
  } else {
    // Category B (Non-Target) calculation
    const roleConfig = input.role as NonTargetRoleConfig;
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
