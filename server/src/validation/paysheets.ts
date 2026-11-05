import { z } from 'zod';
import type { SALES_BASED_ROLES, NON_TARGET_ROLES } from '../engine/salary-calculator';

// ── Shared primitives ─────────────────────────────────────────

export const ALL_ROLE_CODES = [
  // Sales-based (Category A)
  'PGM', 'PAGM', 'PPH', 'PRM', 'PM',
  // Non-target (Category B)
  'SR_EXEC_HR', 'JR_EXEC_HR', 'ADMIN_MANAGER', 'LEGAL_MANAGER',
  'LAND_DEVELOPMENT_1', 'LAND_DEVELOPMENT_2',
  'SUPERVISOR_LAND_1', 'SUPERVISOR_LAND_2', 'WATCHER_LAND',
  'EXEC_ASST_HR', 'EXEC_ASST_LAND', 'EXEC_GEM_1', 'EXEC_GEM_2', 'EXEC_MEDIA',
  'CABANA_PM', 'NETWORK_IT_MANAGER', 'HEAD_MICRO_FIN',
  'EXEC_MICRO_FIN_1', 'EXEC_MICRO_FIN_2',
  'GEMO', 'EXEC_ASST_FIN', 'COORD',
] as const;

export type RoleCode = (typeof ALL_ROLE_CODES)[number];

// Compile-time guard: ALL_ROLE_CODES must list exactly the roles defined in the salary engine.
type EngineRoleCode = keyof typeof SALES_BASED_ROLES | keyof typeof NON_TARGET_ROLES;
const _roleCodesInSync: [Exclude<EngineRoleCode, RoleCode>, Exclude<RoleCode, EngineRoleCode>] extends [never, never]
  ? true : false = true;
void _roleCodesInSync;

const roleCodeSchema = z.enum(ALL_ROLE_CODES, `Role must be one of: ${ALL_ROLE_CODES.join(', ')}`);

const payMonthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'payMonth must be YYYY-MM format');

// Well inside the database columns, including after amounts are added together
const moneySchema = z
  .number()
  .min(0, 'Cannot be negative')
  .max(999_999_999.99, 'Amount is too large');

const achieveSchema = z
  .number()
  .min(0, 'Cannot be negative')
  .max(99_999_999_999.99, 'Amount is too large');

const daysSchema = z
  .number()
  .min(0)
  .max(31, 'Cannot exceed 31 days');

const hoursSchema = z.number().int().min(0).max(744, 'Cannot exceed 744 hours in a month');

const minutesSchema = z.number().int().min(0).max(59, 'Minutes must be 0–59');

const mosSchema = z
  .number()
  .int('monthsOfService must be a whole number')
  .min(0, 'monthsOfService must be 0 or greater')
  .max(1200, 'monthsOfService is too large');

// ── Calculate (preview, no save) ──────────────────────────────

export const calculatePaysheetSchema = z.object({
  role:                 roleCodeSchema,
  // Optional: lets the preview use the employee's real previous month (sales annual cycle)
  codeNo:               z.string().min(1).max(50).optional(),
  payMonth:             payMonthSchema.optional(),
  /** Legacy — no longer used in any calculation. */
  monthsOfService:      mosSchema.default(0),
  achieve:              achieveSchema.default(0),
  allowance:            moneySchema.default(0),
  nopay:                daysSchema.default(0),
  lateHours:            hoursSchema.default(0),
  lateMinutes:          minutesSchema.default(0),
  welfare:              moneySchema.default(0),
  otherOffer:           moneySchema.default(0),
  epfAvailability:      z.boolean().default(true),
  customEarningName:    z.string().max(200).default(''),
  customEarningAmount:  moneySchema.default(0),
  customDeductionName:  z.string().max(200).default(''),
  customDeductionAmount: moneySchema.default(0),
}).refine(
  (d) => d.customEarningAmount === 0 || d.customEarningName.trim().length > 0,
  { message: 'customEarningName is required when customEarningAmount is set', path: ['customEarningName'] }
).refine(
  (d) => d.customDeductionAmount === 0 || d.customDeductionName.trim().length > 0,
  { message: 'customDeductionName is required when customDeductionAmount is set', path: ['customDeductionName'] }
);

// ── Create ────────────────────────────────────────────────────

export const createPaysheetSchema = z.object({
  codeNo:               z.string().min(1, 'codeNo is required').max(50),
  payMonth:             payMonthSchema,
  role:                 roleCodeSchema,
  /** Legacy — no longer used in any calculation. */
  monthsOfService:      mosSchema.default(0),
  achieve:              achieveSchema.default(0),
  allowance:            moneySchema.default(0),
  nopay:                daysSchema.default(0),
  lateHours:            hoursSchema.default(0),
  lateMinutes:          minutesSchema.default(0),
  epfAvailability:      z.boolean().default(true),
  etfAvailability:      z.boolean().default(true),
  welfare:              moneySchema.default(0),
  otherOffer:           moneySchema.default(0),
  customEarningName:    z.string().max(200).default(''),
  customEarningAmount:  moneySchema.default(0),
  customDeductionName:  z.string().max(200).default(''),
  customDeductionAmount: moneySchema.default(0),
}).refine(
  (d) => d.customEarningAmount === 0 || d.customEarningName.trim().length > 0,
  { message: 'customEarningName is required when customEarningAmount is set', path: ['customEarningName'] }
).refine(
  (d) => d.customDeductionAmount === 0 || d.customDeductionName.trim().length > 0,
  { message: 'customDeductionName is required when customDeductionAmount is set', path: ['customDeductionName'] }
);

// ── Update (all fields optional) ──────────────────────────────

export const updatePaysheetSchema = z.object({
  monthsOfService:       mosSchema.optional(),
  achieve:               achieveSchema.optional(),
  allowance:             moneySchema.optional(),
  nopay:                 daysSchema.optional(),
  lateHours:             hoursSchema.optional(),
  lateMinutes:           minutesSchema.optional(),
  epfAvailability:       z.boolean().optional(),
  etfAvailability:       z.boolean().optional(),
  welfare:               moneySchema.optional(),
  otherOffer:            moneySchema.optional(),
  customEarningName:     z.string().max(200).optional(),
  customEarningAmount:   moneySchema.optional(),
  customDeductionName:   z.string().max(200).optional(),
  customDeductionAmount: moneySchema.optional(),
}).refine(
  (d) => {
    const amt = d.customEarningAmount ?? 0;
    return amt === 0 || ((d.customEarningName ?? '').trim().length > 0);
  },
  { message: 'customEarningName is required when customEarningAmount is set', path: ['customEarningName'] }
).refine(
  (d) => {
    const amt = d.customDeductionAmount ?? 0;
    return amt === 0 || ((d.customDeductionName ?? '').trim().length > 0);
  },
  { message: 'customDeductionName is required when customDeductionAmount is set', path: ['customDeductionName'] }
);

// ── Status patch ──────────────────────────────────────────────

export const updatePaysheetStatusSchema = z.object({
  status: z.enum(['active', 'delete'], 'status must be "active" or "delete"'),
});

// ── Bulk create ───────────────────────────────────────────────

export const bulkCreatePaysheetSchema = z.object({
  payMonth: payMonthSchema,
  codeNos:  z.array(z.string().min(1)).min(1, 'At least one employee code is required'),
});

// ── Query params ──────────────────────────────────────────────

export const listPaysheetsQuerySchema = z.object({
  codeNo:   z.string().optional(),
  payMonth: payMonthSchema.optional(),
  role:     roleCodeSchema.optional(),
  search:   z.string().optional(),
  status:   z.enum(['active', 'delete', 'all']).optional(),
  page:     z.coerce.number().int().min(1).default(1),
  limit:    z.coerce.number().int().min(1).max(10000).default(15),
});

export const monthPaysheetsQuerySchema = z.object({
  search:  z.string().optional(),
  status:  z.enum(['active', 'delete', 'all']).optional(),
  branch:  z.string().optional(),
  role:    roleCodeSchema.optional(),
  page:    z.coerce.number().int().min(1).default(1),
  limit:   z.coerce.number().int().min(1).max(10000).default(15),
});

// ── Inferred types ────────────────────────────────────────────

export type CalculatePaysheetInput    = z.infer<typeof calculatePaysheetSchema>;
export type CreatePaysheetInput       = z.infer<typeof createPaysheetSchema>;
export type UpdatePaysheetInput       = z.infer<typeof updatePaysheetSchema>;
export type UpdatePaysheetStatusInput = z.infer<typeof updatePaysheetStatusSchema>;
export type BulkCreatePaysheetInput   = z.infer<typeof bulkCreatePaysheetSchema>;
export type ListPaysheetsQuery        = z.infer<typeof listPaysheetsQuerySchema>;
export type MonthPaysheetsQuery       = z.infer<typeof monthPaysheetsQuerySchema>;