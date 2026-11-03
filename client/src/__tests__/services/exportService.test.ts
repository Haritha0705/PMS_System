/**
 * Services: exportService.ts
 * downloadUsersExcel, downloadPaysheetsByRoleExcel, downloadPaysheetsByBranchExcel
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportService } from '../../services/exportService';
import api from '../../services/api';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

const mockApi = api as unknown as { get: ReturnType<typeof vi.fn> };

// Mock DOM blob/URL handling
const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
const mockRevokeObjectURL = vi.fn();
const mockAppendChild = vi.fn();
const mockClick = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  window.URL.createObjectURL = mockCreateObjectURL;
  window.URL.revokeObjectURL = mockRevokeObjectURL;
  document.body.appendChild = mockAppendChild;
  document.body.removeChild = mockRevokeObjectURL; // reuse mock
  // Mock createElement to return a clickable anchor
  vi.spyOn(document, 'createElement').mockReturnValue({
    href: '',
    setAttribute: vi.fn(),
    click: mockClick,
    parentNode: { removeChild: vi.fn() },
  } as unknown as HTMLElement);
});

// ── downloadUsersExcel ────────────────────────────────────────

describe('exportService.downloadUsersExcel', () => {
  it('calls GET /export/users-excel with blob responseType', async () => {
    mockApi.get.mockResolvedValue({ data: new Blob(['xlsx data']) });

    await exportService.downloadUsersExcel();

    expect(mockApi.get).toHaveBeenCalledWith('/export/users-excel', { responseType: 'blob' });
  });

  it('triggers a file download', async () => {
    mockApi.get.mockResolvedValue({ data: new Blob(['xlsx data']) });

    await exportService.downloadUsersExcel();

    expect(mockClick).toHaveBeenCalled();
  });

  it('uses correct filename prefix', async () => {
    const mockSetAttribute = vi.fn();
    vi.spyOn(document, 'createElement').mockReturnValue({
      href: '',
      setAttribute: mockSetAttribute,
      click: mockClick,
      parentNode: { removeChild: vi.fn() },
    } as unknown as HTMLElement);
    mockApi.get.mockResolvedValue({ data: new Blob(['xlsx data']) });

    await exportService.downloadUsersExcel();

    expect(mockSetAttribute).toHaveBeenCalledWith('download', expect.stringMatching(/^employees-\d{4}-\d{2}-\d{2}\.xlsx$/));
  });

  it('throws when API call fails', async () => {
    mockApi.get.mockRejectedValue(new Error('Export failed'));

    await expect(exportService.downloadUsersExcel()).rejects.toThrow('Export failed');
  });
});

// ── downloadPaysheetsByRoleExcel ──────────────────────────────

describe('exportService.downloadPaysheetsByRoleExcel', () => {
  it('calls GET /export/paysheets-excel-by-role', async () => {
    mockApi.get.mockResolvedValue({ data: new Blob(['xlsx data']) });

    await exportService.downloadPaysheetsByRoleExcel();

    expect(mockApi.get).toHaveBeenCalledWith('/export/paysheets-excel-by-role', { responseType: 'blob' });
  });

  it('throws on error', async () => {
    mockApi.get.mockRejectedValue(new Error('Download failed'));

    await expect(exportService.downloadPaysheetsByRoleExcel()).rejects.toThrow('Download failed');
  });
});

// ── downloadPaysheetsByBranchExcel ────────────────────────────

describe('exportService.downloadPaysheetsByBranchExcel', () => {
  it('calls GET /export/paysheets-excel-by-branch', async () => {
    mockApi.get.mockResolvedValue({ data: new Blob(['xlsx data']) });

    await exportService.downloadPaysheetsByBranchExcel();

    expect(mockApi.get).toHaveBeenCalledWith('/export/paysheets-excel-by-branch', { responseType: 'blob' });
  });

  it('throws on error', async () => {
    mockApi.get.mockRejectedValue(new Error('Branch export failed'));

    await expect(exportService.downloadPaysheetsByBranchExcel()).rejects.toThrow('Branch export failed');
  });
});
