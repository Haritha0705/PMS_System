/**
 * Page: Export.tsx
 * Export buttons, loading states, success/error toasts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../services/exportService', () => ({
  exportService: {
    downloadUsersExcel: vi.fn(),
    downloadPaysheetsByRoleExcel: vi.fn(),
    downloadPaysheetsByBranchExcel: vi.fn(),
  },
}));
vi.mock('../../components/Toast', () => ({ showToast: vi.fn() }));

import { exportService } from '../../services/exportService';
import { showToast } from '../../components/Toast';
import Export from '../../pages/Export';

const mockDownloadUsers = exportService.downloadUsersExcel as ReturnType<typeof vi.fn>;
const mockDownloadByRole = exportService.downloadPaysheetsByRoleExcel as ReturnType<typeof vi.fn>;
const mockDownloadByBranch = exportService.downloadPaysheetsByBranchExcel as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockDownloadUsers.mockResolvedValue(undefined);
  mockDownloadByRole.mockResolvedValue(undefined);
  mockDownloadByBranch.mockResolvedValue(undefined);
});

describe('Export page', () => {
  it('renders all three export cards', () => {
    render(<Export />);
    expect(screen.getByText('Employees Data')).toBeInTheDocument();
    expect(screen.getByText('Paysheets by Role')).toBeInTheDocument();
    expect(screen.getByText('Paysheets by Branch')).toBeInTheDocument();
  });

  it('renders three Export to Excel buttons', () => {
    render(<Export />);
    const buttons = screen.getAllByRole('button', { name: /export to excel/i });
    expect(buttons).toHaveLength(3);
  });

  it('calls downloadUsersExcel and shows success toast', async () => {
    render(<Export />);
    const buttons = screen.getAllByRole('button', { name: /export to excel/i });
    await userEvent.click(buttons[0]);
    await waitFor(() => {
      expect(mockDownloadUsers).toHaveBeenCalled();
      expect(showToast).toHaveBeenCalledWith('Employees export successful', 'success');
    });
  });

  it('shows "Exporting..." while users export is in progress', async () => {
    mockDownloadUsers.mockReturnValue(new Promise(() => {}));
    render(<Export />);
    const buttons = screen.getAllByRole('button', { name: /export to excel/i });
    await userEvent.click(buttons[0]);
    expect(screen.getByText('Exporting...')).toBeInTheDocument();
  });

  it('calls downloadPaysheetsByRoleExcel and shows success toast', async () => {
    render(<Export />);
    const buttons = screen.getAllByRole('button', { name: /export to excel/i });
    await userEvent.click(buttons[1]);
    await waitFor(() => {
      expect(mockDownloadByRole).toHaveBeenCalled();
      expect(showToast).toHaveBeenCalledWith('Monthly paysheets by role export successful', 'success');
    });
  });

  it('calls downloadPaysheetsByBranchExcel and shows success toast', async () => {
    render(<Export />);
    const buttons = screen.getAllByRole('button', { name: /export to excel/i });
    await userEvent.click(buttons[2]);
    await waitFor(() => {
      expect(mockDownloadByBranch).toHaveBeenCalled();
      expect(showToast).toHaveBeenCalledWith('Monthly paysheets by branch export successful', 'success');
    });
  });

  it('shows error toast when users export fails', async () => {
    mockDownloadUsers.mockRejectedValue(new Error('Server error'));
    render(<Export />);
    const buttons = screen.getAllByRole('button', { name: /export to excel/i });
    await userEvent.click(buttons[0]);
    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('Server error', 'error');
    });
  });

  it('shows error toast when role export fails', async () => {
    mockDownloadByRole.mockRejectedValue(new Error('Failed'));
    render(<Export />);
    const buttons = screen.getAllByRole('button', { name: /export to excel/i });
    await userEvent.click(buttons[1]);
    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('Failed', 'error');
    });
  });

  it('re-enables button after failed export', async () => {
    mockDownloadUsers.mockRejectedValue(new Error('err'));
    render(<Export />);
    const buttons = screen.getAllByRole('button', { name: /export to excel/i });
    await userEvent.click(buttons[0]);
    await waitFor(() => {
      const btns = screen.getAllByRole('button', { name: /export to excel/i });
      expect(btns[0]).not.toBeDisabled();
    });
  });
});
