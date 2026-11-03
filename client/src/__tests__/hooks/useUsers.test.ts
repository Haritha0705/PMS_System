/**
 * Hook: useUsers.ts
 * Initial fetch, skip, createUser, updateUser, deleteUser, refreshUsers, error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useUsers } from '../../hooks/useUsers';
import { userService } from '../../services/userService';

vi.mock('../../services/userService', () => ({
  userService: {
    listUsers: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
    getStats: vi.fn(),
  },
}));

const mockUserService = userService as unknown as {
  listUsers: ReturnType<typeof vi.fn>;
  createUser: ReturnType<typeof vi.fn>;
  updateUser: ReturnType<typeof vi.fn>;
  deleteUser: ReturnType<typeof vi.fn>;
  getStats: ReturnType<typeof vi.fn>;
};

const sampleUser = {
  codeNo: 'EMP001',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@test.com',
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
  status: 'active' as const,
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
};

const defaultResponse = {
  users: [sampleUser],
  total: 1,
  page: 1,
  totalPages: 1,
  branches: ['Colombo'],
  roles: ['RM'],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUserService.listUsers.mockResolvedValue(defaultResponse);
});

// ── initial fetch ─────────────────────────────────────────────

describe('useUsers — initial fetch', () => {
  it('starts with loading=false, empty users, then fetches', async () => {
    const { result } = renderHook(() => useUsers());

    // Initially loading is false before useEffect fires
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.users).toHaveLength(1);
    });

    expect(mockUserService.listUsers).toHaveBeenCalledOnce();
    expect(result.current.users[0].codeNo).toBe('EMP001');
    expect(result.current.error).toBeNull();
  });

  it('passes options as params to listUsers', async () => {
    renderHook(() => useUsers({ search: 'John', branch: 'Colombo', page: 2, limit: 10 }));

    await waitFor(() => expect(mockUserService.listUsers).toHaveBeenCalled());

    expect(mockUserService.listUsers).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'John', branch: 'Colombo', page: 2, limit: 10 })
    );
  });

  it('sets error state on fetch failure', async () => {
    mockUserService.listUsers.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useUsers());

    await waitFor(() => {
      expect(result.current.error).toBe('Network error');
    });
    expect(result.current.users).toHaveLength(0);
  });

  it('sets generic error for non-Error rejections', async () => {
    mockUserService.listUsers.mockRejectedValue('unknown');

    const { result } = renderHook(() => useUsers());

    await waitFor(() => {
      expect(result.current.error).toBe('Failed to fetch users');
    });
  });
});

// ── skip option ───────────────────────────────────────────────

describe('useUsers — skip option', () => {
  it('does NOT fetch when skip=true', async () => {
    renderHook(() => useUsers({ skip: true }));

    // Wait a tick then verify
    await act(async () => await new Promise((r) => setTimeout(r, 50)));
    expect(mockUserService.listUsers).not.toHaveBeenCalled();
  });
});

// ── createUser ────────────────────────────────────────────────

describe('useUsers — createUser', () => {
  it('calls userService.createUser and appends to list', async () => {
    const newUser = { ...sampleUser, codeNo: 'EMP002', firstName: 'Jane' };
    mockUserService.createUser.mockResolvedValue(newUser);

    const { result } = renderHook(() => useUsers());
    await waitFor(() => expect(result.current.users).toHaveLength(1));

    await act(async () => {
      await result.current.createUser(newUser);
    });

    expect(result.current.users).toHaveLength(2);
    expect(result.current.users[1].codeNo).toBe('EMP002');
  });

  it('propagates error from createUser', async () => {
    mockUserService.createUser.mockRejectedValue(new Error('Duplicate'));

    const { result } = renderHook(() => useUsers());
    await waitFor(() => expect(result.current.users).toHaveLength(1));

    await expect(
      act(async () => { await result.current.createUser(sampleUser); })
    ).rejects.toThrow('Duplicate');
  });
});

// ── updateUser ────────────────────────────────────────────────

describe('useUsers — updateUser', () => {
  it('updates matching user in list', async () => {
    const updated = { ...sampleUser, firstName: 'Johnny' };
    mockUserService.updateUser.mockResolvedValue(updated);

    const { result } = renderHook(() => useUsers());
    await waitFor(() => expect(result.current.users).toHaveLength(1));

    await act(async () => {
      await result.current.updateUser('EMP001', { firstName: 'Johnny' });
    });

    expect(result.current.users[0].firstName).toBe('Johnny');
  });

  it('propagates error from updateUser', async () => {
    mockUserService.updateUser.mockRejectedValue(new Error('Not found'));

    const { result } = renderHook(() => useUsers());
    await waitFor(() => expect(result.current.users).toHaveLength(1));

    await expect(
      act(async () => { await result.current.updateUser('BAD', {}); })
    ).rejects.toThrow('Not found');
  });
});

// ── deleteUser ────────────────────────────────────────────────

describe('useUsers — deleteUser', () => {
  it('removes user from list after delete', async () => {
    mockUserService.deleteUser.mockResolvedValue({ message: 'Deleted', user: sampleUser });

    const { result } = renderHook(() => useUsers());
    await waitFor(() => expect(result.current.users).toHaveLength(1));

    await act(async () => {
      await result.current.deleteUser('EMP001');
    });

    expect(result.current.users).toHaveLength(0);
  });

  it('propagates error from deleteUser', async () => {
    mockUserService.deleteUser.mockRejectedValue(new Error('Cannot delete'));

    const { result } = renderHook(() => useUsers());
    await waitFor(() => expect(result.current.users).toHaveLength(1));

    await expect(
      act(async () => { await result.current.deleteUser('EMP001'); })
    ).rejects.toThrow('Cannot delete');
  });
});

// ── refreshUsers ──────────────────────────────────────────────

describe('useUsers — refreshUsers', () => {
  it('re-fetches and updates list', async () => {
    const { result } = renderHook(() => useUsers());
    await waitFor(() => expect(result.current.users).toHaveLength(1));

    const newUser2 = { ...sampleUser, codeNo: 'EMP002' };
    mockUserService.listUsers.mockResolvedValue({ ...defaultResponse, users: [sampleUser, newUser2], total: 2 });

    await act(async () => {
      await result.current.refreshUsers();
    });

    expect(result.current.users).toHaveLength(2);
  });

  it('sets error on refresh failure', async () => {
    const { result } = renderHook(() => useUsers());
    await waitFor(() => expect(result.current.users).toHaveLength(1));

    mockUserService.listUsers.mockRejectedValue(new Error('Refresh failed'));

    await act(async () => {
      await result.current.refreshUsers();
    });

    expect(result.current.error).toBe('Refresh failed');
  });
});
