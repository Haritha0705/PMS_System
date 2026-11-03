/**
 * Page: Users.tsx
 * Renders table, filters, actions (deactivate, activate, permanent delete)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../hooks/useUsers', () => ({ useUsers: vi.fn() }));
vi.mock('../../services/userService', () => ({ userService: { updateUser: vi.fn(), deleteUser: vi.fn() } }));
vi.mock('../../components/Toast', () => ({ showToast: vi.fn() }));
vi.mock('../../utils/format', () => ({ formatCurrency: (n: number) => `Rs.${n}` }));
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: vi.fn(() => vi.fn()) };
});

import { useUsers } from '../../hooks/useUsers';
import { userService } from '../../services/userService';
import { showToast } from '../../components/Toast';
import { useNavigate } from 'react-router-dom';
import Users from '../../pages/Users';

const mockUseUsers = useUsers as ReturnType<typeof vi.fn>;
const mockUpdateUser = userService.updateUser as ReturnType<typeof vi.fn>;
const mockDeleteUser = userService.deleteUser as ReturnType<typeof vi.fn>;
const mockNavigate = vi.fn();

const fakeUser = {
  codeNo: 'E001',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@test.com',
  phone: '0771234567',
  branch: 'Colombo',
  role: 'MANAGER',
  designation: 'Manager',
  basicSalary: 50000,
  status: 'active',
  joinDate: '2022-01-01',
  bankAccount: '1234567',
  bankName: 'BOC',
  allowances: 0,
  deductions: 0,
};

const defaultHookReturn = {
  users: [fakeUser],
  loading: false,
  error: null,
  response: { page: 1, totalPages: 1, total: 1 },
  refreshUsers: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUseUsers.mockReturnValue(defaultHookReturn);
  (useNavigate as ReturnType<typeof vi.fn>).mockReturnValue(mockNavigate);
  mockUpdateUser.mockResolvedValue(undefined);
  mockDeleteUser.mockResolvedValue(undefined);
});

function renderUsers() {
  return render(<MemoryRouter><Users /></MemoryRouter>);
}

describe('Users page — render', () => {
  it('renders Employees Management heading', () => {
    renderUsers();
    expect(screen.getByText('Employees Management')).toBeInTheDocument();
  });

  it('renders table with user data', () => {
    renderUsers();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('renders Add User button', () => {
    renderUsers();
    expect(screen.getByRole('button', { name: /add user/i })).toBeInTheDocument();
  });

  it('shows loading spinner when loading', () => {
    mockUseUsers.mockReturnValue({ ...defaultHookReturn, loading: true, users: [] });
    renderUsers();
    expect(document.querySelector('.loading-spinner')).not.toBeNull();
  });

  it('shows error state when error exists', () => {
    mockUseUsers.mockReturnValue({ ...defaultHookReturn, error: 'Failed to load', users: [] });
    renderUsers();
    expect(screen.getByText(/Failed to load/)).toBeInTheDocument();
  });

  it('shows empty state when no users', () => {
    mockUseUsers.mockReturnValue({ ...defaultHookReturn, users: [] });
    renderUsers();
    expect(screen.getByText(/no employees found/i)).toBeInTheDocument();
  });

  it('navigates to /users/new when Add User clicked', async () => {
    renderUsers();
    await userEvent.click(screen.getByRole('button', { name: /add user/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/users/new');
  });
});

describe('Users page — filters', () => {
  it('renders search input', () => {
    renderUsers();
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it('renders branch filter', () => {
    renderUsers();
    expect(screen.getByRole('option', { name: 'All Branches' })).toBeInTheDocument();
  });

  it('renders status filter', () => {
    renderUsers();
    expect(screen.getByRole('option', { name: 'All Statuses' })).toBeInTheDocument();
  });
});

describe('Users page — actions', () => {
  it('calls updateUser with status:delete on deactivate confirm', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderUsers();
    const deactivateBtn = screen.getByTitle('Deactivate');
    await userEvent.click(deactivateBtn);
    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith('E001', { status: 'delete' });
    });
  });

  it('does NOT call updateUser when confirm is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderUsers();
    await userEvent.click(screen.getByTitle('Deactivate'));
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('shows success toast after deactivation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderUsers();
    await userEvent.click(screen.getByTitle('Deactivate'));
    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/deactivated/i), 'success');
    });
  });

  it('shows error toast when deactivation fails', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    mockUpdateUser.mockRejectedValue(new Error('Server error'));
    renderUsers();
    await userEvent.click(screen.getByTitle('Deactivate'));
    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('Server error', 'error');
    });
  });

  it('shows Activate and Permanent Delete buttons for deleted users', () => {
    mockUseUsers.mockReturnValue({
      ...defaultHookReturn,
      users: [{ ...fakeUser, status: 'delete' }],
    });
    renderUsers();
    expect(screen.getByTitle('Activate')).toBeInTheDocument();
    expect(screen.getByTitle('Permanent Delete')).toBeInTheDocument();
  });

  it('calls updateUser with status:active when activating', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    mockUseUsers.mockReturnValue({
      ...defaultHookReturn,
      users: [{ ...fakeUser, status: 'delete' }],
    });
    renderUsers();
    await userEvent.click(screen.getByTitle('Activate'));
    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith('E001', { status: 'active' });
    });
  });

  it('calls deleteUser on permanent delete confirm', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    mockUseUsers.mockReturnValue({
      ...defaultHookReturn,
      users: [{ ...fakeUser, status: 'delete' }],
    });
    renderUsers();
    await userEvent.click(screen.getByTitle('Permanent Delete'));
    await waitFor(() => {
      expect(mockDeleteUser).toHaveBeenCalledWith('E001');
    });
  });

  it('navigates to edit page when Edit button clicked', async () => {
    renderUsers();
    await userEvent.click(screen.getByTitle('Edit'));
    expect(mockNavigate).toHaveBeenCalledWith('/users/E001');
  });
});

describe('Users page — pagination', () => {
  it('shows pagination when totalPages > 1', () => {
    mockUseUsers.mockReturnValue({
      ...defaultHookReturn,
      response: { page: 1, totalPages: 3, total: 30 },
    });
    renderUsers();
    expect(screen.getByText(/page 1 of 3/i)).toBeInTheDocument();
  });

  it('does not show pagination when totalPages = 1', () => {
    renderUsers();
    expect(screen.queryByText(/previous/i)).toBeNull();
  });
});
