/**
 * Component: PaysheetList.tsx
 * Fetch, display, filter, callbacks (edit, view, delete)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../services/paysheetService', () => ({
  paysheetService: {
    getMonthPaysheets: vi.fn(),
    updatePaysheetStatus: vi.fn(),
    deletePaysheet: vi.fn(),
  },
}));
vi.mock('../../components/Toast', () => ({ showToast: vi.fn() }));
vi.mock('../../utils/format', () => ({ formatCurrency: (n: number) => `Rs.${n}` }));

import { paysheetService } from '../../services/paysheetService';
import { showToast } from '../../components/Toast';
import { PaysheetList } from '../../components/PaysheetList';

const mockGetMonthPaysheets = paysheetService.getMonthPaysheets as ReturnType<typeof vi.fn>;
const mockUpdateStatus = paysheetService.updatePaysheetStatus as ReturnType<typeof vi.fn>;
const mockDelete = paysheetService.deletePaysheet as ReturnType<typeof vi.fn>;

const fakePaysheet = {
  id: 'ps1',
  _id: 'ps1',
  codeNo: 'E001',
  firstName: 'John',
  lastName: 'Doe',
  payMonth: '2026-04',
  branch: 'Colombo',
  role: 'MANAGER',
  netSalary: 45000,
  basicSalary: 50000,
  status: 'active',
  epfEmployee: 5000,
  epfEmployer: 5000,
  etf: 2000,
  totalEarnings: 55000,
  totalDeductions: 10000,
  allowances: 5000,
  deductions: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetMonthPaysheets.mockResolvedValue({
    paysheets: [fakePaysheet],
    totalPages: 1,
    total: 1,
  });
  mockUpdateStatus.mockResolvedValue(undefined);
  mockDelete.mockResolvedValue(undefined);
});

describe('PaysheetList', () => {
  it('fetches and displays paysheets', async () => {
    render(<PaysheetList />);
    await waitFor(() => {
      expect(screen.getByText('E001')).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    mockGetMonthPaysheets.mockReturnValue(new Promise(() => {}));
    render(<PaysheetList />);
    expect(document.querySelector('.loading-spinner, .spinner')).not.toBeNull();
  });

  it('shows empty state when no paysheets', async () => {
    mockGetMonthPaysheets.mockResolvedValue({ paysheets: [], totalPages: 1, total: 0 });
    render(<PaysheetList />);
    await waitFor(() => {
      expect(screen.getByText(/no paysheets/i)).toBeInTheDocument();
    });
  });

  it('shows error toast when fetch fails', async () => {
    mockGetMonthPaysheets.mockRejectedValue(new Error('Network error'));
    render(<PaysheetList />);
    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('Network error', 'error');
    });
  });

  it('calls onView when View Paysheet button clicked', async () => {
    const onView = vi.fn();
    render(<PaysheetList onView={onView} />);
    await waitFor(() => expect(screen.getByText('E001')).toBeInTheDocument());

    const viewBtn = screen.getByTitle('View Paysheet');
    await userEvent.click(viewBtn);
    expect(onView).toHaveBeenCalledWith(expect.objectContaining({ codeNo: 'E001' }));
  });

  it('calls onEdit when Edit button clicked', async () => {
    const onEdit = vi.fn();
    render(<PaysheetList onEdit={onEdit} />);
    await waitFor(() => expect(screen.getByText('E001')).toBeInTheDocument());

    const editBtn = screen.getByTitle('Edit');
    await userEvent.click(editBtn);
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ codeNo: 'E001' }));
  });

  it('calls deletePaysheet on delete confirm', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<PaysheetList />);
    await waitFor(() => expect(screen.getByText('E001')).toBeInTheDocument());

    const deleteBtn = screen.getByTitle('Delete');
    await userEvent.click(deleteBtn);

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith('ps1');
    });
  });

  it('does NOT call deletePaysheet when confirm cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<PaysheetList />);
    await waitFor(() => expect(screen.getByText('E001')).toBeInTheDocument());

    await userEvent.click(screen.getByTitle('Delete'));
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('renders month filter', async () => {
    render(<PaysheetList />);
    const monthInputs = document.querySelectorAll('input[type="month"]');
    expect(monthInputs.length).toBeGreaterThan(0);
  });

  it('renders search input', async () => {
    render(<PaysheetList />);
    await waitFor(() => expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument());
  });
});
