import { z } from 'zod';

const payPeriodSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Period must be YYYY-MM format');

export const generatePayrollSchema = z.object({
  period:  payPeriodSchema,
  codeNos: z
    .array(z.string().min(1))
    .optional()
    .describe('Employee codes to generate for. Omit to generate for all active employees.'),
});

export const listPayrollQuerySchema = z.object({
  codeNo: z.string().optional(),
  period: payPeriodSchema.optional(),
  search: z.string().optional(),
});

export type GeneratePayrollInput = z.infer<typeof generatePayrollSchema>;
export type ListPayrollQuery     = z.infer<typeof listPayrollQuerySchema>;
