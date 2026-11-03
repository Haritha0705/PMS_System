import { PayrollRecord, User } from '../models';

interface TaxBracket {
  min: number;
  max: number;
  rate: number;
}

const TAX_BRACKETS: TaxBracket[] = [
  { min: 0, max: 30000, rate: 0 },
  { min: 30001, max: 60000, rate: 0.05 },
  { min: 60001, max: 100000, rate: 0.10 },
  { min: 100001, max: 200000, rate: 0.15 },
  { min: 200001, max: Infinity, rate: 0.20 },
];

export function calculateTax(grossSalary: number): number {
  let tax = 0;
  let remaining = grossSalary;

  for (const bracket of TAX_BRACKETS) {
    if (remaining <= 0) break;
    const taxableInBracket = Math.min(remaining, bracket.max - bracket.min + 1);
    tax += taxableInBracket * bracket.rate;
    remaining -= taxableInBracket;
  }

  return Math.round(tax * 100) / 100;
}

export function generatePaySheet(user: User, period: string): Omit<PayrollRecord, 'id' | 'generatedAt'> {
  const grossSalary = user.basicSalary + user.allowances;
  const tax = calculateTax(grossSalary);
  const netSalary = grossSalary - user.deductions - tax;

  return {
    codeNo: user.codeNo,
    userName: `${user.firstName} ${user.lastName}`,
    period,
    basicSalary: user.basicSalary,
    allowances: user.allowances,
    deductions: user.deductions,
    tax,
    grossSalary,
    netSalary: Math.max(0, netSalary),
    branch: user.branch,
    designation: user.designation,
  };
}
