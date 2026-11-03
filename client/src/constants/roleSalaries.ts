import { SALES_CONFIG, NON_TARGET_CONFIG } from './salaryConfig';

// Non-Target Roles (Category B) — derived from salaryConfig so names/amounts stay in one place
const NON_TARGET_ENTRIES = Object.entries(NON_TARGET_CONFIG);

// Role-wise Basic Salary mappings based on salary calculator
export const ROLE_SALARIES: Record<string, number> = {
  // Sales/Target-Based Roles (Category A) — fixed monthly salary of the annual cycle
  ...Object.fromEntries(Object.values(SALES_CONFIG).map((cfg) => [cfg.label, cfg.monthlySalary])),

  // Non-Target Roles (Category B)
  ...Object.fromEntries(NON_TARGET_ENTRIES.map(([, cfg]) => [cfg.label, cfg.basicSalary])),
};

// Fixed monthly allowances per role (Category B only: fixed + vehicle + fuel).
// Category A roles have no fixed allowances.
export const ROLE_ALLOWANCES: Record<string, number> = Object.fromEntries(
  NON_TARGET_ENTRIES.map(([, cfg]) => [
    cfg.label,
    (cfg.fixedAllowance ?? 0) + (cfg.vehicleAllowance ?? 0) + (cfg.fuelAllowance ?? 0),
  ])
);

export const ROLES = Object.keys(ROLE_SALARIES).sort();

// Maps full role names (stored on User records) to backend role codes
export const ROLE_NAME_TO_CODE: Record<string, string> = {
  ...Object.fromEntries(Object.entries(SALES_CONFIG).map(([code, cfg]) => [cfg.label, code])),
  ...Object.fromEntries(NON_TARGET_ENTRIES.map(([code, cfg]) => [cfg.label, code])),
};

// Reverse mapping: code → full name
export const ROLE_CODE_TO_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(ROLE_NAME_TO_CODE).map(([name, code]) => [code, name])
);
