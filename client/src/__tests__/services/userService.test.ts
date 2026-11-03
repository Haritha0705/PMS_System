/**
 * Services: userService.ts
 * listUsers, getUser, createUser, updateUser, deleteUser, getStats
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { userService } from '../../services/userService';
import api from '../../services/api';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockApi = api as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
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

beforeEach(() => {
  vi.clearAllMocks();
});

// ── listUsers ─────────────────────────────────────────────────

describe('userService.listUsers', () => {
  it('calls GET /users and returns data', async () => {
    const responseData = { users: [sampleUser], total: 1, page: 1, totalPages: 1, branches: ['Colombo'], roles: ['RM'] };
    mockApi.get.mockResolvedValue({ data: responseData });

    const result = await userService.listUsers();

    expect(mockApi.get).toHaveBeenCalledWith('/users', { params: {} });
    expect(result).toEqual(responseData);
  });

  it('passes query params to GET /users', async () => {
    mockApi.get.mockResolvedValue({ data: { users: [], total: 0, page: 1, totalPages: 0, branches: [], roles: [] } });

    await userService.listUsers({ search: 'John', branch: 'Colombo', page: 2, limit: 10 });

    expect(mockApi.get).toHaveBeenCalledWith('/users', {
      params: { search: 'John', branch: 'Colombo', page: 2, limit: 10 },
    });
  });

  it('throws error with message on API failure', async () => {
    mockApi.get.mockRejectedValue(new Error('Network failure'));

    await expect(userService.listUsers()).rejects.toThrow('Network failure');
  });

  it('throws fallback message when error is not an Error instance', async () => {
    mockApi.get.mockRejectedValue('string error');

    await expect(userService.listUsers()).rejects.toThrow('Failed to fetch users');
  });
});

// ── getUser ───────────────────────────────────────────────────

describe('userService.getUser', () => {
  it('calls GET /users/:codeNo', async () => {
    mockApi.get.mockResolvedValue({ data: sampleUser });

    const result = await userService.getUser('EMP001');

    expect(mockApi.get).toHaveBeenCalledWith('/users/EMP001');
    expect(result).toEqual(sampleUser);
  });

  it('throws on API error', async () => {
    mockApi.get.mockRejectedValue(new Error('Not found'));

    await expect(userService.getUser('BAD001')).rejects.toThrow('Not found');
  });
});

// ── createUser ────────────────────────────────────────────────

describe('userService.createUser', () => {
  it('calls POST /users with user data', async () => {
    mockApi.post.mockResolvedValue({ data: sampleUser });

    const { createdAt, updatedAt, ...createData } = sampleUser;
    const result = await userService.createUser(createData);

    expect(mockApi.post).toHaveBeenCalledWith('/users', createData);
    expect(result).toEqual(sampleUser);
  });

  it('throws error on failure', async () => {
    mockApi.post.mockRejectedValue(new Error('Duplicate codeNo'));

    await expect(userService.createUser(sampleUser)).rejects.toThrow('Duplicate codeNo');
  });
});

// ── updateUser ────────────────────────────────────────────────

describe('userService.updateUser', () => {
  it('calls PUT /users/:codeNo with updates', async () => {
    const updated = { ...sampleUser, firstName: 'Jane' };
    mockApi.put.mockResolvedValue({ data: updated });

    const result = await userService.updateUser('EMP001', { firstName: 'Jane' });

    expect(mockApi.put).toHaveBeenCalledWith('/users/EMP001', { firstName: 'Jane' });
    expect(result.firstName).toBe('Jane');
  });

  it('throws error on failure', async () => {
    mockApi.put.mockRejectedValue(new Error('User not found'));

    await expect(userService.updateUser('BAD001', {})).rejects.toThrow('User not found');
  });
});

// ── deleteUser ────────────────────────────────────────────────

describe('userService.deleteUser', () => {
  it('calls DELETE /users/:codeNo', async () => {
    mockApi.delete.mockResolvedValue({ data: { message: 'Deleted', user: sampleUser } });

    const result = await userService.deleteUser('EMP001');

    expect(mockApi.delete).toHaveBeenCalledWith('/users/EMP001');
    expect(result.message).toBe('Deleted');
  });

  it('throws error on failure', async () => {
    mockApi.delete.mockRejectedValue(new Error('Cannot delete'));

    await expect(userService.deleteUser('EMP001')).rejects.toThrow('Cannot delete');
  });
});

// ── getStats ──────────────────────────────────────────────────

describe('userService.getStats', () => {
  it('calls GET /users/stats', async () => {
    const stats = { totalUsers: 100, activeUsers: 90, deletedUsers: 10, totalBranches: 5, branches: ['Colombo'], totalMonthlySalary: 5000000 };
    mockApi.get.mockResolvedValue({ data: stats });

    const result = await userService.getStats();

    expect(mockApi.get).toHaveBeenCalledWith('/users/stats');
    expect(result).toEqual(stats);
  });

  it('throws error on failure', async () => {
    mockApi.get.mockRejectedValue(new Error('Stats unavailable'));

    await expect(userService.getStats()).rejects.toThrow('Stats unavailable');
  });
});
