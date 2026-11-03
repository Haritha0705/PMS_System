/**
 * Hook: usePayroll.ts
 * Initial fetch, skip, deleteRecord, refreshRecords, error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePayroll } from '../../hooks/usePayroll';
import { payrollService } from '../../services/payrollService';

vi.mock('../../services/payrollService', () => ({
  payrollService: {
    getPayrollHistory: vi.fn(),
    deletePayroll: vi.fn(),
  },
}));

const mockPayrollService = payrollService as unknown as {
  getPayrollHistory: ReturnType<typeof vi.fn>;
  deletePayroll: ReturnType<typeof vi.fn>;
};

const sampleRecord = {
  id: 'payroll-001',
  codeNo: 'EMP001',
  userName: 'John Doe',
  period: '2026-01',
  basicSalary: 50000,
  allowances: 5000,
  deductions: 1000,
  tax: 2000,
  grossSalary: 55000,
  netSalary: 52000,
  branch: 'Colombo',
  designation: 'Regional Manager',
  generatedAt: '2026-01-31T00:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockPayrollService.getPayrollHistory.mockResolvedValue({ records: [sampleRecord], total: 1 });
});

// ── initial fetch ─────────────────────────────────────────────

describe('usePayroll — initial fetch', () => {
  it('fetches payroll records on mount', async () => {
    const { result } = renderHook(() => usePayroll());

    await waitFor(() => {
      expect(result.current.records).toHaveLength(1);
    });

    expect(mockPayrollService.getPayrollHistory).toHaveBeenCalledOnce();
    expect(result.current.records[0].id).toBe('payroll-001');
    expect(result.current.error).toBeNull();
  });

  it('passes options to getPayrollHistory', async () => {
    renderHook(() => usePayroll({ codeNo: 'EMP001', period: '2026-01', search: 'John' }));

    await waitFor(() => expect(mockPayrollService.getPayrollHistory).toHaveBeenCalled());

    expect(mockPayrollService.getPayrollHistory).toHaveBeenCalledWith(
      expect.objectContaining({ codeNo: 'EMP001', period: '2026-01', search: 'John' })
    );
  });

  it('sets error on fetch failure', async () => {
    mockPayrollService.getPayrollHistory.mockRejectedValue(new Error('Fetch failed'));

    const { result } = renderHook(() => usePayroll());

    await waitFor(() => {
      expect(result.current.error).toBe('Fetch failed');
    });
    expect(result.current.records).toHaveLength(0);
  });

  it('sets generic error for non-Error rejections', async () => {
    mockPayrollService.getPayrollHistory.mockRejectedValue(42);

    const { result } = renderHook(() => usePayroll());

    await waitFor(() => {
      expect(result.current.error).toBe('Failed to fetch payroll');
    });
  });
});

// ── skip option ───────────────────────────────────────────────

describe('usePayroll — skip', () => {
  it('does not fetch when skip=true', async () => {
    renderHook(() => usePayroll({ skip: true }));

    await act(async () => await new Promise((r) => setTimeout(r, 50)));
    expect(mockPayrollService.getPayrollHistory).not.toHaveBeenCalled();
  });
});

// ── deleteRecord ──────────────────────────────────────────────

describe('usePayroll — deleteRecord', () => {
  it('removes record from list after deletion', async () => {
    mockPayrollService.deletePayroll.mockResolvedValue({ message: 'Deleted' });

    const { result } = renderHook(() => usePayroll());
    await waitFor(() => expect(result.current.records).toHaveLength(1));

    await act(async () => {
      await result.current.deleteRecord('payroll-001');
    });

    expect(result.current.records).toHaveLength(0);
    expect(mockPayrollService.deletePayroll).toHaveBeenCalledWith('payroll-001');
  });

  it('propagates error if delete fails', async () => {
    mockPayrollService.deletePayroll.mockRejectedValue(new Error('Cannot delete'));

    const { result } = renderHook(() => usePayroll());
    await waitFor(() => expect(result.current.records).toHaveLength(1));

    await expect(
      act(async () => { await result.current.deleteRecord('payroll-001'); })
    ).rejects.toThrow('Cannot delete');
  });
});

// ── refreshRecords ────────────────────────────────────────────

describe('usePayroll — refreshRecords', () => {
  it('re-fetches and updates records', async () => {
    const { result } = renderHook(() => usePayroll());
    await waitFor(() => expect(result.current.records).toHaveLength(1));

    const record2 = { ...sampleRecord, id: 'payroll-002' };
    mockPayrollService.getPayrollHistory.mockResolvedValue({ records: [sampleRecord, record2], total: 2 });

    await act(async () => {
      await result.current.refreshRecords();
    });

    expect(result.current.records).toHaveLength(2);
  });

  it('sets error on refresh failure', async () => {
    const { result } = renderHook(() => usePayroll());
    await waitFor(() => expect(result.current.records).toHaveLength(1));

    mockPayrollService.getPayrollHistory.mockRejectedValue(new Error('Refresh failed'));

    await act(async () => {
      await result.current.refreshRecords();
    });

    expect(result.current.error).toBe('Refresh failed');
  });
});
