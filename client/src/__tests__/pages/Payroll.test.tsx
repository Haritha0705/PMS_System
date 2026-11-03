/**
 * Page: Payroll.tsx
 * Tab rendering, history fetch, bulk PDF tab
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../services/userService', () => ({
  userService: { listUsers: vi.fn() },
}));
vi.mock('../../services/paysheetService', () => ({
  paysheetService: {
    listPaysheets: vi.fn(),
    getMonthPaysheets: vi.fn(),
    generatePayroll: vi.fn(),
  },
}));
vi.mock('../../components/Toast', () => ({ showToast: vi.fn() }));
vi.mock('../../components/EmployeeSelector', () => ({
  default: ({
    onSelectionChange,
    payMonth,
    onPayMonthChange,
    title,
    actionButton,
  }: {
    onSelectionChange: (codes: Set<string>) => void;
    payMonth?: string;
    onPayMonthChange?: (m: string) => void;
    title?: string;
    actionButton?: React.ReactNode;
  }) => (
    <div data-testid="employee-selector">
      <span>{title}</span>
      {payMonth !== undefined && onPayMonthChange && (
        <input
          type="month"
          data-testid="month-input"
          value={payMonth}
          onChange={(e) => onPayMonthChange(e.target.value)}
        />
      )}
      <button onClick={() => onSelectionChange(new Set(['E001']))}>Select Employee</button>
      {actionButton}
    </div>
  ),
}));
vi.mock('../../components/PaySheet', () => ({
  default: () => <div data-testid="paysheet">PaySheet</div>,
}));
vi.mock('react-to-print', () => ({ useReactToPrint: () => vi.fn() }));
vi.mock('../../services/api', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

import { userService } from '../../services/userService';
import { paysheetService } from '../../services/paysheetService';
import Payroll from '../../pages/Payroll';

const mockListUsers = userService.listUsers as ReturnType<typeof vi.fn>;
const mockListPaysheets = paysheetService.listPaysheets as ReturnType<typeof vi.fn>;
const mockGetMonthPaysheets = paysheetService.getMonthPaysheets as ReturnType<typeof vi.fn>;

const fakePaysheet = {
  id: 'ps1',
  _id: 'ps1',
  codeNo: 'E001',
  firstName: 'John',
  lastName: 'Doe',
  payMonth: '2026-04',
  branch: 'Colombo',
  netSalary: 45000,
  basicSalary: 50000,
  grossSalary: 55000,
  role: 'MANAGER',
  epfEmployee: 5000,
  epfEmployer: 5000,
  etf: 2000,
  totalEarnings: 55000,
  totalDeductions: 10000,
  allowances: 5000,
  deductions: 0,
  status: 'active',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockListUsers.mockResolvedValue({ users: [] });
  mockListPaysheets.mockResolvedValue({ paysheets: [fakePaysheet] });
  mockGetMonthPaysheets.mockResolvedValue({ paysheets: [] });
});

function renderPayroll() {
  return render(<MemoryRouter><Payroll /></MemoryRouter>);
}

describe('Payroll page — tabs', () => {
  it('renders tab buttons', () => {
    renderPayroll();
    expect(screen.getByRole('button', { name: /preview & print/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /bulk print & export/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /history/i })).toBeInTheDocument();
  });

  it('shows generate/preview tab content by default', () => {
    renderPayroll();
    expect(screen.getByTestId('employee-selector')).toBeInTheDocument();
  });

  it('switches to History tab when clicked', async () => {
    renderPayroll();
    await userEvent.click(screen.getByRole('button', { name: /history/i }));
    await waitFor(() => {
      expect(mockListPaysheets).toHaveBeenCalled();
    });
  });

  it('switches to Bulk PDF tab when clicked', async () => {
    renderPayroll();
    await userEvent.click(screen.getByRole('button', { name: /bulk print & export/i }));
    await waitFor(() => {
      expect(screen.getByText('Bulk PDF Payslip Generation')).toBeInTheDocument();
    });
  });
});

describe('Payroll page — history tab', () => {
  it('loads and displays history records when history tab clicked', async () => {
    renderPayroll();
    await userEvent.click(screen.getByRole('button', { name: /history/i }));
    await waitFor(() => {
      expect(mockListPaysheets).toHaveBeenCalled();
    });
  });

  it('shows employee code in history list', async () => {
    renderPayroll();
    await userEvent.click(screen.getByRole('button', { name: /history/i }));
    await waitFor(() => {
      const items = screen.getAllByText('E001');
      expect(items.length).toBeGreaterThan(0);
    });
  });

  it('shows empty state when no history', async () => {
    mockListPaysheets.mockResolvedValue({ paysheets: [] });
    renderPayroll();
    await userEvent.click(screen.getByRole('button', { name: /history/i }));
    await waitFor(() => {
      expect(screen.getByText(/no paysheet records found/i)).toBeInTheDocument();
    });
  });

  it('shows search input in history tab', async () => {
    renderPayroll();
    await userEvent.click(screen.getByRole('button', { name: /history/i }));
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search by employee/i)).toBeInTheDocument();
    });
  });
});

describe('Payroll page — generate tab', () => {
  it('renders EmployeeSelector in generate tab', () => {
    renderPayroll();
    expect(screen.getByTestId('employee-selector')).toBeInTheDocument();
  });

  it('renders month input via EmployeeSelector', () => {
    renderPayroll();
    expect(screen.getByTestId('month-input')).toBeInTheDocument();
  });

  it('renders Load Pay Sheets button', () => {
    renderPayroll();
    expect(screen.getByRole('button', { name: /load pay sheets/i })).toBeInTheDocument();
  });
});

describe('Payroll page — bulk PDF tab', () => {
  it('renders Generate PDF Payslips button in bulk pdf tab', async () => {
    renderPayroll();
    await userEvent.click(screen.getByRole('button', { name: /bulk print & export/i }));
    expect(screen.getByRole('button', { name: /generate pdf payslips/i })).toBeInTheDocument();
  });

  it('renders month input in bulk pdf tab', async () => {
    renderPayroll();
    await userEvent.click(screen.getByRole('button', { name: /bulk print & export/i }));
    const monthInputs = document.querySelectorAll('input[type="month"]');
    expect(monthInputs.length).toBeGreaterThan(0);
  });
});
