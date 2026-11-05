import { z } from 'zod';

const codeNoSchema = z
  .string()
  .min(1, 'Employee code is required')
  .max(50)
  .regex(/^[A-Za-z0-9_-]+$/, 'Code No may only contain letters, numbers, hyphens and underscores');

const nameSchema = z.string().min(1).max(200).trim();

const emailSchema = z
  .string()
  .email('Invalid email address')
  .max(300)
  .transform((v) => v.toLowerCase().trim());

const amountSchema = z
  .number()
  .min(0, 'Cannot be negative')
  .max(999_999_999.99, 'Amount is too large');

const moneySchema = amountSchema.default(0);

const isRealDate = (value: string): boolean => {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format')
  .refine(isRealDate, 'Date is not a real calendar date')
  .or(z.literal('')) // the form's date field is optional and sends '' when empty
  .optional();

// ── Create ────────────────────────────────────────────────────

export const createUserSchema = z.object({
  codeNo:      codeNoSchema,
  firstName:   nameSchema,
  lastName:    nameSchema,
  email:       emailSchema,
  phone:       z.string().max(50).default(''),
  branch:      z.string().max(200).default(''),
  role:        z.string().max(100).default(''),
  designation: z.string().max(200).default(''),
  joinDate:    dateSchema,
  bankAccount: z.string().max(100).default(''),
  bankName:    z.string().max(200).default(''),
  basicSalary: moneySchema,
  allowances:  moneySchema,
  deductions:  moneySchema,
  status:      z.enum(['active', 'delete']).default('active'),
});

// ── Update (all fields optional except codeNo is in the URL) ──

export const updateUserSchema = z.object({
  firstName:   nameSchema.optional(),
  lastName:    nameSchema.optional(),
  email:       emailSchema.optional(),
  phone:       z.string().max(50).optional(),
  branch:      z.string().max(200).optional(),
  role:        z.string().max(100).optional(),
  designation: z.string().max(200).optional(),
  joinDate:    dateSchema,
  bankAccount: z.string().max(100).optional(),
  bankName:    z.string().max(200).optional(),
  basicSalary: amountSchema.optional(),
  allowances:  amountSchema.optional(),
  deductions:  amountSchema.optional(),
  status:      z.enum(['active', 'delete']).optional(),
});

// ── Query params ──────────────────────────────────────────────

export const listUsersQuerySchema = z.object({
  search:    z.string().optional(),
  branch:    z.string().optional(),
  role:      z.string().optional(),
  status:    z.enum(['active', 'delete', 'all']).optional(),
  sortBy:    z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page:      z.coerce.number().int().min(1).default(1),
  limit:     z.coerce.number().int().min(1).max(10000).default(50),
});

export type CreateUserInput  = z.infer<typeof createUserSchema>;
export type UpdateUserInput  = z.infer<typeof updateUserSchema>;
export type ListUsersQuery   = z.infer<typeof listUsersQuerySchema>;
