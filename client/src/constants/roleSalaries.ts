import { NON_TARGET_CONFIG } from './salaryConfig';

// Non-Target Roles (Category B) — derived from salaryConfig so names/amounts stay in one place
const NON_TARGET_ENTRIES = Object.entries(NON_TARGET_CONFIG);

// Role-wise Basic Salary mappings based on salary calculator
export const ROLE_SALARIES: Record<string, number> = {
  // Sales/Target-Based Roles (Category A)
  'General Manager': 275_000,
  'Assistant General Manager': 250_000,
  'Provincial Head': 200_000,
  'Deputy Provincial Head': 150_000,
  'Senior Regional Manager': 85_000,
  'Regional Manager': 80_000,
  'Branch Manager': 50_000,
  'Business Development Executive': 30_000,

  // Non-Target Roles (Category B)
  ...Object.fromEntries(NON_TARGET_ENTRIES.map(([, cfg]) => [cfg.label, cfg.basicSalary])),
};

// Fixed monthly allowances per role (Category B only: fixed + vehicle + fuel).
// Category A allowances depend on achievement, so they are not pre-filled.
export const ROLE_ALLOWANCES: Record<string, number> = Object.fromEntries(
  NON_TARGET_ENTRIES.map(([, cfg]) => [
    cfg.label,
    (cfg.fixedAllowance ?? 0) + (cfg.vehicleAllowance ?? 0) + (cfg.fuelAllowance ?? 0),
  ])
);

export const ROLES = Object.keys(ROLE_SALARIES).sort();

// Maps full role names (stored on User records) to backend role codes
export const ROLE_NAME_TO_CODE: Record<string, string> = {
  'General Manager': 'GM',
  'Assistant General Manager': 'AGM',
  'Provincial Head': 'PH',
  'Deputy Provincial Head': 'DPH',
  'Senior Regional Manager': 'SRM',
  'Regional Manager': 'RM',
  'Branch Manager': 'BM',
  'Business Development Executive': 'BDE',
  ...Object.fromEntries(NON_TARGET_ENTRIES.map(([code, cfg]) => [cfg.label, code])),
};

// Reverse mapping: code → full name
export const ROLE_CODE_TO_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(ROLE_NAME_TO_CODE).map(([name, code]) => [code, name])
);
