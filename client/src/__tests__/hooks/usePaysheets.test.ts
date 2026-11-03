/**
 * Hook: usePaysheets.ts
 * Initial fetch, skip, createPaysheet, updatePaysheet, deletePaysheet, refreshPaysheets, error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePaysheets } from '../../hooks/usePaysheets';
import { paysheetService } from '../../services/paysheetService';

vi.mock('../../services/paysheetService', () => ({
  paysheetService: {
    listPaysheets: vi.fn(),
    createPaysheet: vi.fn(),
    updatePaysheet: vi.fn(),
    deletePaysheet: vi.fn(),
  },
}));

const mockService = paysheetService as unknown as {
  listPaysheets: ReturnType<typeof vi.fn>;
  createPaysheet: ReturnType<typeof vi.fn>;
  updatePaysheet: ReturnType<typeof vi.fn>;
  deletePaysheet: ReturnType<typeof vi.fn>;
};

const samplePaysheet = {
  id: 'ps-001',
  codeNo: 'EMP001',
  payMonth: '2026-04',
  role: 'RM',
  monthsOfService: 12,
  achieve: 80000,
  allowance: 5000,
  nopay: 0,
  late: 0,
  lateHours: 0,
  lateMinutes: 0,
  epfAvailability: true,
  etfAvailability: true,
  welfare: 500,
  otherOffer: 0,
  customEarningName: '',
  customEarningAmount: 0,
  customDeductionName: '',
  customDeductionAmount: 0,
  netSalary: 48000,
  status: 'active' as const,
  createdAt: '2026-04-01T00:00:00Z',
  updatedAt: '2026-04-01T00:00:00Z',
};

const defaultResponse = {
  paysheets: [samplePaysheet],
  total: 1,
  page: 1,
  totalPages: 1,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockService.listPaysheets.mockResolvedValue(defaultResponse);
});

// ── initial fetch ─────────────────────────────────────────────

describe('usePaysheets — initial fetch', () => {
  it('fetches paysheets on mount', async () => {
    const { result } = renderHook(() => usePaysheets());

    await waitFor(() => {
      expect(result.current.paysheets).toHaveLength(1);
    });

    expect(mockService.listPaysheets).toHaveBeenCalledOnce();
    expect(result.current.paysheets[0].id).toBe('ps-001');
    expect(result.current.error).toBeNull();
  });

  it('passes filter options to listPaysheets', async () => {
    renderHook(() => usePaysheets({ payMonth: '2026-04', role: 'RM', page: 2 }));

    await waitFor(() => expect(mockService.listPaysheets).toHaveBeenCalled());

    expect(mockService.listPaysheets).toHaveBeenCalledWith(
      expect.objectContaining({ payMonth: '2026-04', role: 'RM', page: 2 })
    );
  });

  it('sets error on fetch failure', async () => {
    mockService.listPaysheets.mockRejectedValue(new Error('API error'));

    const { result } = renderHook(() => usePaysheets());

    await waitFor(() => {
      expect(result.current.error).toBe('API error');
    });
    expect(result.current.paysheets).toHaveLength(0);
  });

  it('sets generic error for non-Error rejections', async () => {
    mockService.listPaysheets.mockRejectedValue(undefined);

    const { result } = renderHook(() => usePaysheets());

    await waitFor(() => {
      expect(result.current.error).toBe('Failed to fetch paysheets');
    });
  });

  it('stores full response in response state', async () => {
    const { result } = renderHook(() => usePaysheets());

    await waitFor(() => expect(result.current.response).not.toBeNull());

    expect(result.current.response?.total).toBe(1);
    expect(result.current.response?.totalPages).toBe(1);
  });
});

// ── skip option ───────────────────────────────────────────────

describe('usePaysheets — skip', () => {
  it('does not fetch when skip=true', async () => {
    renderHook(() => usePaysheets({ skip: true }));

    await act(async () => await new Promise((r) => setTimeout(r, 50)));
    expect(mockService.listPaysheets).not.toHaveBeenCalled();
  });
});

// ── createPaysheet ────────────────────────────────────────────

describe('usePaysheets — createPaysheet', () => {
  it('calls service.createPaysheet and appends to list', async () => {
    const newPaysheet = { ...samplePaysheet, id: 'ps-002', codeNo: 'EMP002' };
    mockService.createPaysheet.mockResolvedValue({ message: 'Created', paysheet: newPaysheet });

    const { result } = renderHook(() => usePaysheets());
    await waitFor(() => expect(result.current.paysheets).toHaveLength(1));

    await act(async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _id, createdAt: _ca, updatedAt: _ua, ...paysheetData } = samplePaysheet;
      const created = await result.current.createPaysheet(paysheetData);
      expect(created.id).toBe('ps-002');
    });

    expect(result.current.paysheets).toHaveLength(2);
  });

  it('propagates errors from createPaysheet', async () => {
    mockService.createPaysheet.mockRejectedValue(new Error('Duplicate'));

    const { result } = renderHook(() => usePaysheets());
    await waitFor(() => expect(result.current.paysheets).toHaveLength(1));

    await expect(
      act(async () => { await result.current.createPaysheet(samplePaysheet); })
    ).rejects.toThrow('Duplicate');
  });
});

// ── updatePaysheet ────────────────────────────────────────────

describe('usePaysheets — updatePaysheet', () => {
  it('updates matching paysheet in list', async () => {
    const updated = { ...samplePaysheet, achieve: 90000 };
    mockService.updatePaysheet.mockResolvedValue({ message: 'Updated', paysheet: updated });

    const { result } = renderHook(() => usePaysheets());
    await waitFor(() => expect(result.current.paysheets).toHaveLength(1));

    await act(async () => {
      await result.current.updatePaysheet('ps-001', { achieve: 90000 });
    });

    expect(result.current.paysheets[0].achieve).toBe(90000);
  });

  it('propagates errors from updatePaysheet', async () => {
    mockService.updatePaysheet.mockRejectedValue(new Error('Update failed'));

    const { result } = renderHook(() => usePaysheets());
    await waitFor(() => expect(result.current.paysheets).toHaveLength(1));

    await expect(
      act(async () => { await result.current.updatePaysheet('ps-001', {}); })
    ).rejects.toThrow('Update failed');
  });
});

// ── deletePaysheet ────────────────────────────────────────────

describe('usePaysheets — deletePaysheet', () => {
  it('removes paysheet from list after deletion', async () => {
    mockService.deletePaysheet.mockResolvedValue({ message: 'Deleted', paysheet: samplePaysheet });

    const { result } = renderHook(() => usePaysheets());
    await waitFor(() => expect(result.current.paysheets).toHaveLength(1));

    await act(async () => {
      await result.current.deletePaysheet('ps-001');
    });

    expect(result.current.paysheets).toHaveLength(0);
    expect(mockService.deletePaysheet).toHaveBeenCalledWith('ps-001');
  });

  it('propagates errors from deletePaysheet', async () => {
    mockService.deletePaysheet.mockRejectedValue(new Error('Cannot delete'));

    const { result } = renderHook(() => usePaysheets());
    await waitFor(() => expect(result.current.paysheets).toHaveLength(1));

    await expect(
      act(async () => { await result.current.deletePaysheet('ps-001'); })
    ).rejects.toThrow('Cannot delete');
  });
});

// ── refreshPaysheets ──────────────────────────────────────────

describe('usePaysheets — refreshPaysheets', () => {
  it('re-fetches and updates list', async () => {
    const { result } = renderHook(() => usePaysheets());
    await waitFor(() => expect(result.current.paysheets).toHaveLength(1));

    const ps2 = { ...samplePaysheet, id: 'ps-002', codeNo: 'EMP002' };
    mockService.listPaysheets.mockResolvedValue({ ...defaultResponse, paysheets: [samplePaysheet, ps2], total: 2 });

    await act(async () => {
      await result.current.refreshPaysheets();
    });

    expect(result.current.paysheets).toHaveLength(2);
  });

  it('sets error on refresh failure', async () => {
    const { result } = renderHook(() => usePaysheets());
    await waitFor(() => expect(result.current.paysheets).toHaveLength(1));

    mockService.listPaysheets.mockRejectedValue(new Error('Refresh failed'));

    await act(async () => {
      await result.current.refreshPaysheets();
    });

    expect(result.current.error).toBe('Refresh failed');
  });
});
