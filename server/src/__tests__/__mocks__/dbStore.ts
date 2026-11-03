/**
 * Vitest mock for services/dbStore — in-memory store so tests never hit the DB.
 * Import this by calling vi.mock('../../services/dbStore') at the top of each test file.
 */

import { vi } from 'vitest';
import type { User, PayrollRecord, MonthlyPaysheetDTO, AdminCredentials } from '../../models';

// ── In-memory state ────────────────────────────────────────────

let _admin: AdminCredentials = {
  username: 'admin',
  // bcryptjs hash for "admin123" with salt 10
  password: '$2a$10$OwwXma8w5zvwANxqCfR1vukmtd3wfpyw15PwpUDoRWeavmB.68hVi',
  name: 'Super Admin',
  role: 'super_admin',
};

const _users = new Map<string, User>();
const _payroll = new Map<string, PayrollRecord>();
const _paysheets = new Map<string, MonthlyPaysheetDTO>();

// ── Admin ──────────────────────────────────────────────────────

export const dbGetAdmin = vi.fn(async (): Promise<AdminCredentials | null> => _admin);
export const dbSaveAdmin = vi.fn(async (admin: AdminCredentials) => { _admin = admin; });

// ── Users ──────────────────────────────────────────────────────

export const dbGetAllUsers = vi.fn(async (): Promise<User[]> => Array.from(_users.values()));
export const dbGetUser = vi.fn(async (codeNo: string): Promise<User | null> => _users.get(codeNo) ?? null);
export const dbCreateUser = vi.fn(async (user: User) => { _users.set(user.codeNo, user); });
export const dbUpdateUser = vi.fn(async (_codeNo: string, user: User) => { _users.set(user.codeNo, user); });
export const dbDeleteUser = vi.fn(async (codeNo: string) => { _users.delete(codeNo); });

// ── Payroll ────────────────────────────────────────────────────

export const dbGetAllPayroll = vi.fn(async (): Promise<PayrollRecord[]> => Array.from(_payroll.values()));
export const dbGetPayroll = vi.fn(async (id: string): Promise<PayrollRecord | null> => _payroll.get(id) ?? null);
export const dbCreatePayroll = vi.fn(async (r: PayrollRecord) => { _payroll.set(r.id, r); });
export const dbDeletePayroll = vi.fn(async (id: string) => { _payroll.delete(id); });

// ── Monthly Paysheets ──────────────────────────────────────────

export const dbGetAllPaysheets = vi.fn(async (): Promise<MonthlyPaysheetDTO[]> => Array.from(_paysheets.values()));
export const dbGetPaysheetsByMonth = vi.fn(async (payMonth: string): Promise<MonthlyPaysheetDTO[]> =>
  Array.from(_paysheets.values()).filter((p) => p.payMonth === payMonth)
);
export const dbGetPaysheet = vi.fn(async (id: string): Promise<MonthlyPaysheetDTO | null> => _paysheets.get(id) ?? null);
export const dbCreatePaysheet = vi.fn(async (ps: MonthlyPaysheetDTO) => { _paysheets.set(ps.id!, ps); });
export const dbCreateManyPaysheets = vi.fn(async (psList: MonthlyPaysheetDTO[]) => {
  for (const ps of psList) _paysheets.set(ps.id!, ps);
});
export const dbUpdatePaysheet = vi.fn(async (id: string, ps: MonthlyPaysheetDTO) => { _paysheets.set(id, { ...ps, id }); });
export const dbUpdatePaysheetStatus = vi.fn(async (id: string, status: 'active' | 'delete') => {
  const ps = _paysheets.get(id);
  if (ps) {
    if (status === 'delete') {
      _paysheets.delete(id);
    } else {
      _paysheets.set(id, { ...ps, status });
    }
  }
});
export const dbDeletePaysheet = vi.fn(async (id: string) => { _paysheets.delete(id); });

// ── State helpers for tests ────────────────────────────────────

/** Clear all in-memory state between tests (preserves mock implementations) */
export function __resetStore() {
  _users.clear();
  _payroll.clear();
  _paysheets.clear();
  // Reset call counts only, not implementations
  vi.clearAllMocks();
  // Re-bind implementations after clearAllMocks wipes them
  dbGetAdmin.mockImplementation(async () => _admin);
  dbSaveAdmin.mockImplementation(async (admin: AdminCredentials) => { _admin = admin; });
  dbGetAllUsers.mockImplementation(async () => Array.from(_users.values()));
  dbGetUser.mockImplementation(async (codeNo: string) => _users.get(codeNo) ?? null);
  dbCreateUser.mockImplementation(async (user: User) => { _users.set(user.codeNo, user); });
  dbUpdateUser.mockImplementation(async (_codeNo: string, user: User) => { _users.set(user.codeNo, user); });
  dbDeleteUser.mockImplementation(async (codeNo: string) => { _users.delete(codeNo); });
  dbGetAllPayroll.mockImplementation(async () => Array.from(_payroll.values()));
  dbGetPayroll.mockImplementation(async (id: string) => _payroll.get(id) ?? null);
  dbCreatePayroll.mockImplementation(async (r: PayrollRecord) => { _payroll.set(r.id, r); });
  dbDeletePayroll.mockImplementation(async (id: string) => { _payroll.delete(id); });
  dbGetAllPaysheets.mockImplementation(async () => Array.from(_paysheets.values()));
  dbGetPaysheetsByMonth.mockImplementation(async (payMonth: string) => Array.from(_paysheets.values()).filter((p) => p.payMonth === payMonth));
  dbGetPaysheet.mockImplementation(async (id: string) => _paysheets.get(id) ?? null);
  dbCreatePaysheet.mockImplementation(async (ps: MonthlyPaysheetDTO) => { _paysheets.set(ps.id!, ps); });
  dbCreateManyPaysheets.mockImplementation(async (psList: MonthlyPaysheetDTO[]) => { for (const ps of psList) _paysheets.set(ps.id!, ps); });
  dbUpdatePaysheet.mockImplementation(async (id: string, ps: MonthlyPaysheetDTO) => { _paysheets.set(id, { ...ps, id }); });
  dbUpdatePaysheetStatus.mockImplementation(async (id: string, status: 'active' | 'delete') => {
    const ps = _paysheets.get(id);
    if (ps) {
      if (status === 'delete') {
        _paysheets.delete(id);
      } else {
        _paysheets.set(id, { ...ps, status });
      }
    }
  });
  dbDeletePaysheet.mockImplementation(async (id: string) => { _paysheets.delete(id); });
}

/** Seed a user directly */
export function __seedUser(user: User) { _users.set(user.codeNo, user); }

/** Seed a payroll record directly */
export function __seedPayroll(r: PayrollRecord) { _payroll.set(r.id, r); }

/** Seed a paysheet directly */
export function __seedPaysheet(ps: MonthlyPaysheetDTO) { _paysheets.set(ps.id!, ps); }
