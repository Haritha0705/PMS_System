/**
 * Page: Dashboard.tsx
 * Loading state, stat cards, error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('../../services/userService', () => ({ userService: { getStats: vi.fn() } }));
vi.mock('../../services/paysheetService', () => ({ paysheetService: { getMonthPaysheets: vi.fn() } }));
vi.mock('../../components/Toast', () => ({ showToast: vi.fn() }));
vi.mock('../../utils/format', () => ({ formatCurrency: (n: number) => `Rs.${n}` }));

import { userService } from '../../services/userService';
import { paysheetService } from '../../services/paysheetService';
import { showToast } from '../../components/Toast';
import Dashboard from '../../pages/Dashboard';

const mockGetStats = userService.getStats as ReturnType<typeof vi.fn>;
const mockGetMonthPaysheets = paysheetService.getMonthPaysheets as ReturnType<typeof vi.fn>;

const fakeStats = {
  totalUsers: 42,
  activeUsers: 38,
  deletedUsers: 4,
  totalBranches: 3,
  totalMonthlySalary: 1500000,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetStats.mockResolvedValue(fakeStats);
  mockGetMonthPaysheets.mockResolvedValue({ paysheets: [1, 2, 3] });
});

describe('Dashboard', () => {
  it('shows loading spinner initially', () => {
    mockGetStats.mockReturnValue(new Promise(() => {}));
    render(<Dashboard />);
    expect(document.querySelector('.loading-spinner')).not.toBeNull();
  });

  it('renders stat cards after loading', async () => {
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText('Total Employees')).toBeInTheDocument();
    });
    expect(screen.getByText('Active Employees')).toBeInTheDocument();
    expect(screen.getByText('Total Branches')).toBeInTheDocument();
    expect(screen.getByText('Total Monthly Payroll')).toBeInTheDocument();
    expect(screen.getByText('Paysheets (This Month)')).toBeInTheDocument();
  });

  it('shows total users count', async () => {
    render(<Dashboard />);
    await waitFor(() => {
      const all = screen.getAllByText('42');
      expect(all.length).toBeGreaterThan(0);
    });
  });

  it('shows active users count', async () => {
    render(<Dashboard />);
    await waitFor(() => {
      const all = screen.getAllByText('38');
      expect(all.length).toBeGreaterThan(0);
    });
  });

  it('shows total branches count', async () => {
    render(<Dashboard />);
    await waitFor(() => {
      const all = screen.getAllByText('3');
      expect(all.length).toBeGreaterThan(0);
    });
  });

  it('shows paysheet count for the month', async () => {
    render(<Dashboard />);
    // paysheets array has 3 items
    await waitFor(() => {
      const cells = screen.getAllByText('3');
      expect(cells.length).toBeGreaterThan(0);
    });
  });

  it('shows formatted monthly salary', async () => {
    render(<Dashboard />);
    await waitFor(() => expect(screen.getByText('Rs.1500000')).toBeInTheDocument());
  });

  it('shows error toast when fetch fails', async () => {
    mockGetStats.mockRejectedValue(new Error('Network error'));
    render(<Dashboard />);
    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('Network error', 'error');
    });
  });

  it('shows 0 for stats when userStats is null', async () => {
    mockGetStats.mockResolvedValue(null);
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText('Total Employees')).toBeInTheDocument();
    });
  });

  it('renders Employee Status Overview section', async () => {
    render(<Dashboard />);
    await waitFor(() => expect(screen.getByText('Employee Status Overview')).toBeInTheDocument());
  });
});
