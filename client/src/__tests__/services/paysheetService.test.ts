/**
 * Services: paysheetService.ts
 * createPaysheet, listPaysheets, getPaysheet, updatePaysheet,
 * updatePaysheetStatus, deletePaysheet, getMonthPaysheets
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { paysheetService } from '../../services/paysheetService';
import api from '../../services/api';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockApi = api as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
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
  basicSalary: 50000,
  netSalary: 48000,
  status: 'active' as const,
  createdAt: '2026-04-01T00:00:00Z',
  updatedAt: '2026-04-01T00:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ── createPaysheet ────────────────────────────────────────────

describe('paysheetService.createPaysheet', () => {
  it('calls POST /paysheets and returns message + paysheet', async () => {
    mockApi.post.mockResolvedValue({ data: { message: 'Created', paysheet: samplePaysheet } });

    const { id, createdAt, updatedAt, ...createData } = samplePaysheet;
    const result = await paysheetService.createPaysheet(createData);

    expect(mockApi.post).toHaveBeenCalledWith('/paysheets', createData);
    expect(result.paysheet.codeNo).toBe('EMP001');
    expect(result.message).toBe('Created');
  });

  it('throws on failure', async () => {
    mockApi.post.mockRejectedValue(new Error('Duplicate paysheet'));

    await expect(paysheetService.createPaysheet(samplePaysheet)).rejects.toThrow('Duplicate paysheet');
  });

  it('throws fallback for non-Error rejections', async () => {
    mockApi.post.mockRejectedValue(undefined);

    await expect(paysheetService.createPaysheet(samplePaysheet)).rejects.toThrow('Failed to create paysheet');
  });
});

// ── listPaysheets ─────────────────────────────────────────────

describe('paysheetService.listPaysheets', () => {
  it('calls GET /paysheets with no params', async () => {
    mockApi.get.mockResolvedValue({ data: { paysheets: [samplePaysheet], total: 1, page: 1, totalPages: 1 } });

    const result = await paysheetService.listPaysheets();

    expect(mockApi.get).toHaveBeenCalledWith('/paysheets', { params: {} });
    expect(result.paysheets).toHaveLength(1);
  });

  it('passes filters as params', async () => {
    mockApi.get.mockResolvedValue({ data: { paysheets: [], total: 0, page: 1, totalPages: 0 } });

    await paysheetService.listPaysheets({ payMonth: '2026-04', role: 'RM', page: 2 });

    expect(mockApi.get).toHaveBeenCalledWith('/paysheets', {
      params: { payMonth: '2026-04', role: 'RM', page: 2 },
    });
  });

  it('throws on API error', async () => {
    mockApi.get.mockRejectedValue(new Error('Fetch failed'));

    await expect(paysheetService.listPaysheets()).rejects.toThrow('Fetch failed');
  });
});

// ── getPaysheet ───────────────────────────────────────────────

describe('paysheetService.getPaysheet', () => {
  it('calls GET /paysheets/:id', async () => {
    mockApi.get.mockResolvedValue({ data: { paysheet: samplePaysheet } });

    const result = await paysheetService.getPaysheet('ps-001');

    expect(mockApi.get).toHaveBeenCalledWith('/paysheets/ps-001');
    expect(result.paysheet.id).toBe('ps-001');
  });

  it('throws on failure', async () => {
    mockApi.get.mockRejectedValue(new Error('Not found'));

    await expect(paysheetService.getPaysheet('bad-id')).rejects.toThrow('Not found');
  });
});

// ── updatePaysheet ────────────────────────────────────────────

describe('paysheetService.updatePaysheet', () => {
  it('calls PUT /paysheets/:id with updates', async () => {
    const updated = { ...samplePaysheet, achieve: 90000 };
    mockApi.put.mockResolvedValue({ data: { message: 'Updated', paysheet: updated } });

    const result = await paysheetService.updatePaysheet('ps-001', { achieve: 90000 });

    expect(mockApi.put).toHaveBeenCalledWith('/paysheets/ps-001', { achieve: 90000 });
    expect(result.paysheet.achieve).toBe(90000);
  });

  it('throws on failure', async () => {
    mockApi.put.mockRejectedValue(new Error('Update failed'));

    await expect(paysheetService.updatePaysheet('ps-001', {})).rejects.toThrow('Update failed');
  });
});

// ── updatePaysheetStatus ──────────────────────────────────────

describe('paysheetService.updatePaysheetStatus', () => {
  it('calls PATCH /paysheets/:id/status', async () => {
    const deleted = { ...samplePaysheet, status: 'delete' as const };
    mockApi.patch.mockResolvedValue({ data: { message: 'Status updated', paysheet: deleted } });

    const result = await paysheetService.updatePaysheetStatus('ps-001', 'delete');

    expect(mockApi.patch).toHaveBeenCalledWith('/paysheets/ps-001/status', { status: 'delete' });
    expect(result.paysheet.status).toBe('delete');
  });

  it('throws on failure', async () => {
    mockApi.patch.mockRejectedValue(new Error('Status update failed'));

    await expect(paysheetService.updatePaysheetStatus('ps-001', 'active')).rejects.toThrow('Status update failed');
  });
});

// ── deletePaysheet ────────────────────────────────────────────

describe('paysheetService.deletePaysheet', () => {
  it('calls DELETE /paysheets/:id', async () => {
    mockApi.delete.mockResolvedValue({ data: { message: 'Deleted', paysheet: samplePaysheet } });

    const result = await paysheetService.deletePaysheet('ps-001');

    expect(mockApi.delete).toHaveBeenCalledWith('/paysheets/ps-001');
    expect(result.message).toBe('Deleted');
  });

  it('throws on failure', async () => {
    mockApi.delete.mockRejectedValue(new Error('Cannot delete'));

    await expect(paysheetService.deletePaysheet('ps-001')).rejects.toThrow('Cannot delete');
  });
});

// ── getMonthPaysheets ─────────────────────────────────────────

describe('paysheetService.getMonthPaysheets', () => {
  it('calls GET /paysheets/month/:payMonth', async () => {
    const response = { paysheets: [samplePaysheet], total: 1, page: 1, totalPages: 1, month: '2026-04' };
    mockApi.get.mockResolvedValue({ data: response });

    const result = await paysheetService.getMonthPaysheets('2026-04');

    expect(mockApi.get).toHaveBeenCalledWith('/paysheets/month/2026-04', { params: {} });
    expect(result.month).toBe('2026-04');
  });

  it('passes additional params', async () => {
    mockApi.get.mockResolvedValue({ data: { paysheets: [], total: 0, page: 1, totalPages: 0, month: '2026-04' } });

    await paysheetService.getMonthPaysheets('2026-04', { search: 'John', role: 'RM', page: 2 });

    expect(mockApi.get).toHaveBeenCalledWith('/paysheets/month/2026-04', {
      params: { search: 'John', role: 'RM', page: 2 },
    });
  });

  it('throws on failure', async () => {
    mockApi.get.mockRejectedValue(new Error('Month data unavailable'));

    await expect(paysheetService.getMonthPaysheets('2026-04')).rejects.toThrow('Month data unavailable');
  });
});
