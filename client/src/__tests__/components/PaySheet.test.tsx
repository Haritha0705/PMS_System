/**
 * Component: PaySheet.tsx
 * Renders payslip data, earnings, deductions, employee info
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../../utils/format', () => ({
  formatCurrency: (n: number) => `Rs.${n}`,
  formatMonth: (m: string) => m,
}));

import PaySheet from '../../components/PaySheet';

const fakePaysheet = {
  _id: 'ps1',
  id: 'ps1',
  codeNo: 'E001',
  payMonth: '2026-04',
  role: 'MANAGER',
  branch: 'Colombo',
  basicSalary: 50000,
  achievedSalary: 50000,
  netSalary: 45000,
  grossSalary: 55000,
  epfEmployee: 4000,
  epfEmployer: 5000,
  etf: 2000,
  totalEarnings: 55000,
  totalDeductions: 10000,
  allowances: 5000,
  deductions: 0,
  vehicleAllowance: 2000,
  fuelAllowance: 1000,
  orc: 0,
  otherOffer: 0,
  generalAllowance: 2000,
  nopayDeduction: 0,
  lateDeduction: 0,
  welfare: 1000,
  customEarningName: '',
  customEarningAmount: 0,
  customDeductionName: '',
  customDeductionAmount: 0,
  status: 'active',
  monthsOfService: 12,
  achieve: 0,
  allowance: 0,
  nopay: 0,
  late: 0,
  lateHours: 0,
  lateMinutes: 0,
  epfAvailability: true,
  etfAvailability: true,
};

const fakeEmployee = {
  codeNo: 'E001',
  firstName: 'John',
  lastName: 'Doe',
  branch: 'Colombo',
  role: 'MANAGER',
  designation: 'Branch Manager',
  email: 'john@test.com',
  phone: '0771234567',
  basicSalary: 50000,
  allowances: 5000,
  deductions: 0,
  status: 'active' as const,
  joinDate: '2022-01-01',
  bankAccount: '123456',
  bankName: 'BOC',
  createdAt: '2022-01-01T00:00:00Z',
  updatedAt: '2022-01-01T00:00:00Z',
};

describe('PaySheet component', () => {
  it('renders employee name when employee prop provided', () => {
    render(<PaySheet paysheet={fakePaysheet} employee={fakeEmployee} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('shows codeNo when no employee provided', () => {
    render(<PaySheet paysheet={fakePaysheet} />);
    const items = screen.getAllByText('E001');
    expect(items.length).toBeGreaterThan(0);
  });

  it('renders designation from employee', () => {
    render(<PaySheet paysheet={fakePaysheet} employee={fakeEmployee} />);
    expect(screen.getByText('Branch Manager')).toBeInTheDocument();
  });

  it('renders net salary', () => {
    render(<PaySheet paysheet={fakePaysheet} />);
    expect(screen.getByText('Rs.45000')).toBeInTheDocument();
  });

  it('renders gross salary', () => {
    render(<PaySheet paysheet={fakePaysheet} />);
    expect(screen.getByText('Rs.55000')).toBeInTheDocument();
  });

  it('renders pay month', () => {
    render(<PaySheet paysheet={fakePaysheet} />);
    expect(screen.getByText('2026-04')).toBeInTheDocument();
  });

  it('renders with a4 size', () => {
    const { container } = render(<PaySheet paysheet={fakePaysheet} size="a4" />);
    expect(container.firstChild).not.toBeNull();
  });

  it('renders with 2up size', () => {
    const { container } = render(<PaySheet paysheet={fakePaysheet} size="2up" />);
    expect(container.firstChild).not.toBeNull();
  });

  it('renders EPF employee deduction', () => {
    render(<PaySheet paysheet={fakePaysheet} />);
    expect(screen.getByText('Rs.4000')).toBeInTheDocument();
  });

  it('renders custom deduction label when provided', () => {
    const ps = { ...fakePaysheet, customDeductionName: 'Loan', customDeductionAmount: 500 };
    render(<PaySheet paysheet={ps} />);
    expect(screen.getByText('Loan')).toBeInTheDocument();
  });

  it('renders custom earning label when provided', () => {
    const ps = { ...fakePaysheet, customEarningName: 'Bonus', customEarningAmount: 2000 };
    render(<PaySheet paysheet={ps} />);
    expect(screen.getByText('Bonus')).toBeInTheDocument();
  });
});
