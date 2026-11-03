/**
 * Component: MonthlyPaysheetForm.tsx
 * Create/edit form, validation, submit, cancel
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../services/paysheetService', () => ({
  paysheetService: { createPaysheet: vi.fn(), updatePaysheet: vi.fn() },
}));
vi.mock('../../services/userService', () => ({
  userService: { listUsers: vi.fn() },
}));
vi.mock('../../components/Toast', () => ({ showToast: vi.fn() }));

import { paysheetService } from '../../services/paysheetService';
import { userService } from '../../services/userService';
import { showToast } from '../../components/Toast';
import { MonthlyPaysheetForm } from '../../components/MonthlyPaysheetForm';

const mockCreatePaysheet = paysheetService.createPaysheet as ReturnType<typeof vi.fn>;
const mockUpdatePaysheet = paysheetService.updatePaysheet as ReturnType<typeof vi.fn>;
const mockListUsers = userService.listUsers as ReturnType<typeof vi.fn>;
const mockShowToast = showToast as ReturnType<typeof vi.fn>;

const fakeUser = {
  codeNo: 'E001',
  firstName: 'Alice',
  lastName: 'Smith',
  branch: 'Colombo',
  role: 'MANAGER',
  designation: 'Manager',
  status: 'active',
  basicSalary: 50000,
};

const fakePaysheet = {
  id: 'ps1',
  _id: 'ps1',
  codeNo: 'E001',
  payMonth: '2026-04',
  role: 'GM',
  monthsOfService: 12,
  achieve: 0,
  allowance: 0,
  nopay: 0,
  late: 0,
  lateHours: 0,
  lateMinutes: 0,
  epfAvailability: true,
  etfAvailability: true,
  welfare: 0,
  otherOffer: 0,
  customEarningName: '',
  customEarningAmount: 0,
  customDeductionName: '',
  customDeductionAmount: 0,
  branch: 'Colombo',
  basicSalary: 50000,
  netSalary: 45000,
  grossSalary: 55000,
  epfEmployee: 4000,
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
  mockListUsers.mockResolvedValue({ users: [fakeUser] });
  mockCreatePaysheet.mockResolvedValue({ id: 'new1' });
  mockUpdatePaysheet.mockResolvedValue({});
});

describe('MonthlyPaysheetForm — create mode', () => {
  it('renders Code No. label', () => {
    render(<MonthlyPaysheetForm />);
    expect(screen.getByText(/code no/i)).toBeInTheDocument();
  });

  it('renders pay month input', () => {
    render(<MonthlyPaysheetForm />);
    const monthInputs = document.querySelectorAll('input[type="month"]');
    expect(monthInputs.length).toBeGreaterThan(0);
  });

  it('renders Create Paysheet submit button', () => {
    render(<MonthlyPaysheetForm />);
    expect(screen.getByRole('button', { name: /create paysheet/i })).toBeInTheDocument();
  });

  it('renders Cancel button', () => {
    render(<MonthlyPaysheetForm />);
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('calls onCancel when Cancel button clicked', async () => {
    const onCancel = vi.fn();
    render(<MonthlyPaysheetForm onCancel={onCancel} />);
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('shows codeNo validation error when submitting empty form', async () => {
    render(<MonthlyPaysheetForm />);
    // Use fireEvent.submit which properly triggers React form submit handler
    const form = document.querySelector('form')!;
    fireEvent.submit(form);
    await waitFor(() => {
      expect(screen.getByText('Code No is required')).toBeInTheDocument();
    });
  });

  it('does not call createPaysheet when form is invalid', async () => {
    render(<MonthlyPaysheetForm />);
    const form = document.querySelector('form')!;
    fireEvent.submit(form);
    await waitFor(() => {
      expect(mockCreatePaysheet).not.toHaveBeenCalled();
    });
  });
});

describe('MonthlyPaysheetForm — edit mode', () => {
  it('renders Update Paysheet button in edit mode', () => {
    render(<MonthlyPaysheetForm initialData={fakePaysheet} isEditMode />);
    expect(screen.getByRole('button', { name: /update paysheet/i })).toBeInTheDocument();
  });

  it('disables Code No. input in edit mode', () => {
    render(<MonthlyPaysheetForm initialData={fakePaysheet} isEditMode />);
    const codeInput = document.querySelector('input[name="codeNo"]') as HTMLInputElement;
    expect(codeInput).not.toBeNull();
    expect(codeInput.disabled).toBe(true);
  });

  it('pre-fills codeNo value in edit mode', () => {
    render(<MonthlyPaysheetForm initialData={fakePaysheet} isEditMode />);
    const codeInput = document.querySelector('input[name="codeNo"]') as HTMLInputElement;
    expect(codeInput.value).toBe('E001');
  });

  it('calls updatePaysheet on submit in edit mode', async () => {
    render(<MonthlyPaysheetForm initialData={fakePaysheet} isEditMode />);
    // Wait for listUsers to resolve so validation can find E001
    await waitFor(() => expect(mockListUsers).toHaveBeenCalled());

    fireEvent.submit(document.querySelector('form')!);

    await waitFor(() => {
      expect(mockUpdatePaysheet).toHaveBeenCalledWith('ps1', expect.objectContaining({ codeNo: 'E001' }));
    });
  });

  it('shows success toast on successful update', async () => {
    render(<MonthlyPaysheetForm initialData={fakePaysheet} isEditMode />);
    await waitFor(() => expect(mockListUsers).toHaveBeenCalled());

    fireEvent.submit(document.querySelector('form')!);

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Paysheet updated successfully', 'success');
    });
  });

  it('calls onSuccess after successful update', async () => {
    const onSuccess = vi.fn();
    render(<MonthlyPaysheetForm initialData={fakePaysheet} isEditMode onSuccess={onSuccess} />);
    await waitFor(() => expect(mockListUsers).toHaveBeenCalled());

    fireEvent.submit(document.querySelector('form')!);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('shows error toast when updatePaysheet fails', async () => {
    mockUpdatePaysheet.mockRejectedValue(new Error('Update failed'));
    render(<MonthlyPaysheetForm initialData={fakePaysheet} isEditMode />);
    await waitFor(() => expect(mockListUsers).toHaveBeenCalled());

    fireEvent.submit(document.querySelector('form')!);

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Update failed', 'error');
    });
  });
});
