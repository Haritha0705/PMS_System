/**
 * Test fixtures — sample data shapes used across test files.
 */

import type { User, PayrollRecord, MonthlyPaysheetDTO } from '../../models';

export const TEST_USER_CODE = 'TEST001';
export const TEST_USER_CODE_2 = 'TEST002';

export function makeUser(overrides: Partial<User> = {}): User {
  const now = new Date().toISOString();
  return {
    codeNo: TEST_USER_CODE,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@test.com',
    phone: '0771234567',
    branch: 'Colombo',
    role: 'RM',
    designation: 'Regional Manager',
    joinDate: '2023-01-01',
    bankAccount: '1234567890',
    bankName: 'BOC',
    basicSalary: 50000,
    allowances: 5000,
    deductions: 1000,
    status: 'active',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function makePayrollRecord(overrides: Partial<PayrollRecord> = {}): PayrollRecord {
  return {
    id: 'payroll-test-id-001',
    codeNo: TEST_USER_CODE,
    userName: 'John Doe',
    period: '2026-01',
    basicSalary: 50000,
    allowances: 5000,
    deductions: 1000,
    tax: 2000,
    grossSalary: 55000,
    netSalary: 52000,
    branch: 'Colombo',
    designation: 'Area Manager',
    generatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function makePaysheet(overrides: Partial<MonthlyPaysheetDTO> = {}): MonthlyPaysheetDTO {
  const now = new Date().toISOString();
  return {
    id: 'paysheet-test-id-001',
    codeNo: TEST_USER_CODE,
    payMonth: '2026-04',
    role: 'RM',
    monthsOfService: 12,
    achieve: 80000,
    allowance: 5000,
    nopay: 0,
    late: 0,
    lateHours: 0,
    lateMinutes: 0,
    epfAvailability: true,
    etfAvailability: true,
    welfare: 500,
    otherOffer: 0,
    customEarningName: '',
    customEarningAmount: 0,
    customDeductionName: '',
    customDeductionAmount: 0,
    basicSalary: 50000,
    achievedSalary: 80000,
    assignedTarget: 100000,
    achievementPct: 80,
    grossSalary: 55000,
    vehicleAllowance: 0,
    fuelAllowance: 0,
    generalAllowance: 5000,
    orc: 0,
    subTotal: 55000,
    nopayDeduction: 0,
    lateDeduction: 0,
    epfEmployee: 4400,
    epfEmployer: 5500,
    etf: 1650,
    netSalary: 50600,
    status: 'active',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}
