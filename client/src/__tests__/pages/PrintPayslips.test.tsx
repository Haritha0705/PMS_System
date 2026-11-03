/**
 * Page: PrintPayslips.tsx
 * Select employees + month, load payslips, preview, print / download PDF.
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
  paysheetService: { getMonthPaysheets: vi.fn() },
}));
vi.mock('../../services/api', () => ({ default: { get: vi.fn() } }));
vi.mock('../../components/Toast', () => ({ showToast: vi.fn() }));
vi.mock('react-to-print', () => ({ useReactToPrint: () => vi.fn() }));
vi.mock('../../components/PaySheet', () => ({
  default: ({ paysheet }: { paysheet: { codeNo: string } }) => (
    <div data-testid="paysheet">{paysheet.codeNo}</div>
  ),
}));
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
      <span data-testid="selector-title">{title}</span>
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

import { userService } from '../../services/userService';
import { paysheetService } from '../../services/paysheetService';
import { showToast } from '../../components/Toast';
import PrintPayslips from '../../pages/PrintPayslips';

const mockListUsers = userService.listUsers as ReturnType<typeof vi.fn>;
const mockGetMonthPaysheets = paysheetService.getMonthPaysheets as ReturnType<typeof vi.fn>;

const paysheet = { id: 'p1', codeNo: 'E001', payMonth: '2026-04', achievedSalary: 50000 };

beforeEach(() => {
  vi.clearAllMocks();
  mockListUsers.mockResolvedValue({ users: [] });
  mockGetMonthPaysheets.mockResolvedValue({ paysheets: [paysheet] });
});

function renderPage() {
  return render(<MemoryRouter><PrintPayslips /></MemoryRouter>);
}

describe('PrintPayslips page', () => {
  it('renders EmployeeSelector with correct title', () => {
    renderPage();
    expect(screen.getByTestId('selector-title').textContent).toMatch(/select employees/i);
  });

  it('renders month input via EmployeeSelector', () => {
    renderPage();
    expect(screen.getByTestId('month-input')).toBeInTheDocument();
  });

  it('shows empty state before any payslip is loaded', () => {
    renderPage();
    expect(screen.getByText(/select employees and click/i)).toBeInTheDocument();
  });

  it('disables Load Payslips and does not load when no employee is selected', async () => {
    renderPage();
    const loadBtn = screen.getByRole('button', { name: /load payslips/i });
    expect(loadBtn).toBeDisabled();
    await userEvent.click(loadBtn);
    expect(mockGetMonthPaysheets).not.toHaveBeenCalled();
  });

  it('loads and previews payslips for the selected employee', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /select employee/i }));
    await userEvent.click(screen.getByRole('button', { name: /load payslips/i }));
    await waitFor(() => {
      expect(screen.getByTestId('paysheet')).toBeInTheDocument();
    });
    expect(screen.getByText('Payslip Preview (1)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /print \/ save as pdf/i })).toBeInTheDocument();
  });

  it('shows error toast when loading payslips fails', async () => {
    mockGetMonthPaysheets.mockRejectedValue(new Error('Server error'));
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /select employee/i }));
    await userEvent.click(screen.getByRole('button', { name: /load payslips/i }));
    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('Server error', 'error');
    });
  });
});
