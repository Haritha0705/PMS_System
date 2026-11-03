// Mirror of server/src/engine/salary-calculator.ts — static role configs
// used on the client for salary breakdown display.

export const WORKING_DAYS_PER_MONTH = 25;
export const TOTAL_MINUTES_PER_MONTH = 12_000; // 25 × 8 × 60
export const EPF_EMPLOYEE_RATE = 0.08;
export const EPF_EMPLOYER_RATE = 0.12;
export const ETF_RATE = 0.03;

export interface SalesRoleConfig {
  label: string;
  basicSalary: number;
  baseTarget: number;
  vehicleAllowance: number;
  fuelAllowance: number;
  orcValue: number; // raw value; actual rate = orcValue / 100
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
  GM:  { label: 'General Manager',               basicSalary: 275_000, baseTarget: 500_000_000, vehicleAllowance: 150_000, fuelAllowance: 100_000, orcValue: 0.5 },
  AGM: { label: 'Assistant General Manager',      basicSalary: 250_000, baseTarget: 250_000_000, vehicleAllowance: 120_000, fuelAllowance: 100_000, orcValue: 0.5 },
  PH:  { label: 'Provincial Head',                basicSalary: 200_000, baseTarget:  50_000_000, vehicleAllowance: 100_000, fuelAllowance:  80_000, orcValue: 0.5 },
  DPH: { label: 'Deputy Provincial Head',         basicSalary: 150_000, baseTarget:  30_000_000, vehicleAllowance: 100_000, fuelAllowance:  70_000, orcValue: 0.5 },
  SRM: { label: 'Senior Regional Manager',        basicSalary:  85_000, baseTarget:  25_000_000, vehicleAllowance:  85_000, fuelAllowance:  30_000, orcValue: 0.5 },
  RM:  { label: 'Regional Manager',               basicSalary:  80_000, baseTarget:   7_000_000, vehicleAllowance:  80_000, fuelAllowance:  30_000, orcValue: 1   },
  BM:  { label: 'Branch Manager',                 basicSalary:  50_000, baseTarget:   3_500_000, vehicleAllowance:  30_000, fuelAllowance:  20_000, orcValue: 1   },
  BDE: { label: 'Business Development Exec.',     basicSalary:  30_000, baseTarget:     200_000, vehicleAllowance:       0, fuelAllowance:       0, orcValue: 0   },
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
};

export function isSalesRole(role: string): boolean {
  return role in SALES_CONFIG;
}

/** Returns { pct: number (0–100), desc: string } for assigned-target multiplier */
export function getTargetMultiplier(months: number): { pct: number; desc: string } {
  if (months > 5) return { pct: 100, desc: '100% (6+ months of service)' };
  if (months > 4) return { pct: 75,  desc: '75% (5 months of service)'  };
  if (months > 3) return { pct: 65,  desc: '65% (4 months of service)'  };
  if (months > 2) return { pct: 45,  desc: '45% (3 months of service)'  };
  if (months > 1) return { pct: 35,  desc: '35% (2 months of service)'  };
  return              { pct: 25,  desc: '25% (0–1 month of service)' };
}
