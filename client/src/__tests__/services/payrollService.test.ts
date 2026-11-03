/**
 * Services: payrollService.ts
 * generatePayroll, getPayrollHistory, getPayroll, deletePayroll
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { payrollService } from '../../services/payrollService';
import api from '../../services/api';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockApi = api as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
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
});

// ── generatePayroll ───────────────────────────────────────────

describe('payrollService.generatePayroll', () => {
  it('calls POST /payroll/generate and returns records', async () => {
    const response = { message: 'Generated', records: [sampleRecord] };
    mockApi.post.mockResolvedValue({ data: response });

    const result = await payrollService.generatePayroll({ period: '2026-01' });

    expect(mockApi.post).toHaveBeenCalledWith('/payroll/generate', { period: '2026-01' });
    expect(result.records).toHaveLength(1);
  });

  it('accepts optional codeNos filter', async () => {
    mockApi.post.mockResolvedValue({ data: { message: 'Generated', records: [] } });

    await payrollService.generatePayroll({ period: '2026-01', codeNos: ['EMP001', 'EMP002'] });

    expect(mockApi.post).toHaveBeenCalledWith('/payroll/generate', {
      period: '2026-01',
      codeNos: ['EMP001', 'EMP002'],
    });
  });

  it('throws on API error', async () => {
    mockApi.post.mockRejectedValue(new Error('No active users'));

    await expect(payrollService.generatePayroll({ period: '2026-01' })).rejects.toThrow('No active users');
  });

  it('throws fallback message for non-Error rejections', async () => {
    mockApi.post.mockRejectedValue(null);

    await expect(payrollService.generatePayroll({ period: '2026-01' })).rejects.toThrow('Failed to generate payroll');
  });
});

// ── getPayrollHistory ─────────────────────────────────────────

describe('payrollService.getPayrollHistory', () => {
  it('calls GET /payroll/history with no params', async () => {
    mockApi.get.mockResolvedValue({ data: { records: [sampleRecord], total: 1 } });

    const result = await payrollService.getPayrollHistory();

    expect(mockApi.get).toHaveBeenCalledWith('/payroll/history', { params: {} });
    expect(result.records).toHaveLength(1);
  });

  it('passes filter params', async () => {
    mockApi.get.mockResolvedValue({ data: { records: [], total: 0 } });

    await payrollService.getPayrollHistory({ codeNo: 'EMP001', period: '2026-01', search: 'John' });

    expect(mockApi.get).toHaveBeenCalledWith('/payroll/history', {
      params: { codeNo: 'EMP001', period: '2026-01', search: 'John' },
    });
  });

  it('throws on API error', async () => {
    mockApi.get.mockRejectedValue(new Error('History unavailable'));

    await expect(payrollService.getPayrollHistory()).rejects.toThrow('History unavailable');
  });
});

// ── getPayroll ────────────────────────────────────────────────

describe('payrollService.getPayroll', () => {
  it('calls GET /payroll/:id', async () => {
    mockApi.get.mockResolvedValue({ data: sampleRecord });

    const result = await payrollService.getPayroll('payroll-001');

    expect(mockApi.get).toHaveBeenCalledWith('/payroll/payroll-001');
    expect(result.id).toBe('payroll-001');
  });

  it('throws on API error', async () => {
    mockApi.get.mockRejectedValue(new Error('Record not found'));

    await expect(payrollService.getPayroll('bad-id')).rejects.toThrow('Record not found');
  });
});

// ── deletePayroll ─────────────────────────────────────────────

describe('payrollService.deletePayroll', () => {
  it('calls DELETE /payroll/:id', async () => {
    mockApi.delete.mockResolvedValue({ data: { message: 'Deleted' } });

    const result = await payrollService.deletePayroll('payroll-001');

    expect(mockApi.delete).toHaveBeenCalledWith('/payroll/payroll-001');
    expect(result.message).toBe('Deleted');
  });

  it('throws on API error', async () => {
    mockApi.delete.mockRejectedValue(new Error('Cannot delete'));

    await expect(payrollService.deletePayroll('payroll-001')).rejects.toThrow('Cannot delete');
  });
});
