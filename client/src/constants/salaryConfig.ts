// Mirror of server/src/engine/salary-calculator.ts — static role configs
// used on the client for salary breakdown display.

export const WORKING_DAYS_PER_MONTH = 25;
export const TOTAL_MINUTES_PER_MONTH = 12_000; // 25 × 8 × 60
export const EPF_EMPLOYEE_RATE = 0.08;
export const EPF_EMPLOYER_RATE = 0.12;
export const ETF_RATE = 0.03;

export interface SalesRoleConfig {
  role: string;
  label: string;
  annualTarget: number;
  monthlyTarget: number;
  annualSalary: number;
  monthlySalary: number;
  /** Fixed value EPF (employee 8%) is taken on when the month's achievement is 25% or more. */
  epfFixedValue: number;
}

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

export const SALES_CONFIG: Record<string, SalesRoleConfig> = {
  PGM:  { role: 'PGM',  label: 'Project General Manager',           annualTarget: 8_100_000_000, monthlyTarget: 675_000_000, annualSalary: 8_400_000, monthlySalary: 700_000, epfFixedValue: 175_000 },
  PAGM: { role: 'PAGM', label: 'Project Assistant General Manager', annualTarget: 2_700_000_000, monthlyTarget: 225_000_000, annualSalary: 7_500_000, monthlySalary: 625_000, epfFixedValue: 156_250 },
  PPH:  { role: 'PPH',  label: 'Project Provincial Head',           annualTarget:   900_000_000, monthlyTarget:  75_000_000, annualSalary: 6_600_000, monthlySalary: 550_000, epfFixedValue: 137_500 },
  PRM:  { role: 'PRM',  label: 'Project Regional Manager',          annualTarget:   180_000_000, monthlyTarget:  15_000_000, annualSalary: 4_200_000, monthlySalary: 350_000, epfFixedValue:  87_500 },
  PM:   { role: 'PM',   label: 'Project Manager',                   annualTarget:    18_000_000, monthlyTarget:   1_500_000, annualSalary: 1_800_000, monthlySalary: 150_000, epfFixedValue:  37_500 },
};

export const NON_TARGET_CONFIG: Record<string, NonTargetRoleConfig> = {
  SR_EXEC_HR:          { label: 'Senior Executive HR',         basicSalary:  42_500, fixedAllowance:  15_000 },
  JR_EXEC_HR:          { label: 'Junior Executive HR',         basicSalary:  40_000, fixedAllowance:  10_000 },
  ADMIN_MANAGER:       { label: 'Admin Manager',               basicSalary:  75_000, fixedAllowance:   5_000 },
  LEGAL_MANAGER:       { label: 'Legal Manager',               basicSalary:  75_000 },
  EXEC_ASST_HR:        { label: 'Executive Assistant HR',      basicSalary:  35_000, fixedAllowance:   5_000 },
  EXEC_ASST_LAND:      { label: 'Executive Assistant Land',    basicSalary:  35_000, fixedAllowance:   5_000 },
  EXEC_GEM_1:          { label: 'Executive Gem 1',             basicSalary:  35_000, fixedAllowance:   5_000 },
  EXEC_GEM_2:          { label: 'Executive Gem 2',             basicSalary:  30_000, fixedAllowance:   5_000 },
  EXEC_MEDIA:          { label: 'Executive Media',             basicSalary:  35_000, fixedAllowance:   5_000 },
  CABANA_PM:           { label: 'Cabana Project Manager',      basicSalary: 100_000, fixedAllowance:  50_000 },
  NETWORK_IT_MANAGER:  { label: 'Network & IT Manager',        basicSalary: 100_000 },
  HEAD_MICRO_FIN:      { label: 'Head of Micro Finance',       basicSalary:  80_000, fixedAllowance:  50_000 },
  EXEC_MICRO_FIN_1:    { label: 'Executive Micro Finance 1',   basicSalary:  35_000, fixedAllowance:   5_000 },
  EXEC_MICRO_FIN_2:    { label: 'Executive Micro Finance 2',   basicSalary:  35_000, fixedAllowance:   5_000 },
  MICRO_FIN_UNIT_HEAD: { label: 'Micro Finance Unit Head',     basicSalary:  80_000, fixedAllowance: 160_000 },
  GEMO:                { label: 'Gemologist',                  basicSalary: 200_000, vehicleAllowance: 100_000, fuelAllowance: 80_000 },
  EXEC_ASST_FIN:       { label: 'Executive Assistant Finance', basicSalary:  35_000 },
  COORD:               { label: 'Coordinator',                 basicSalary:  35_000 },
};

export function isSalesRole(role: string): boolean {
  return role in SALES_CONFIG;
}
