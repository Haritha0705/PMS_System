/**
 * Manual mock for services/dbStore — placed in __mocks__ so Vitest
 * auto-picks it when vi.mock('../../services/dbStore') is called without factory.
 *
 * All DB operations use in-memory Maps; no Prisma / Neon connection needed.
 */

import { vi } from 'vitest';
import type { User, PayrollRecord, MonthlyPaysheetDTO, AdminCredentials } from '../../models';

// ── Shared in-memory state ─────────────────────────────────────

export const _admin: AdminCredentials = {
  username: 'admin',
  // bcryptjs hash for "admin123" (salt rounds = 10)
  password: '$2a$10$OwwXma8w5zvwANxqCfR1vukmtd3wfpyw15PwpUDoRWeavmB.68hVi',
  name: 'Super Admin',
  role: 'super_admin',
};

export const _users = new Map<string, User>();
export const _payroll = new Map<string, PayrollRecord>();
export const _paysheets = new Map<string, MonthlyPaysheetDTO>();

// ── Admin ──────────────────────────────────────────────────────

export const dbGetAdmin = vi.fn(async (): Promise<AdminCredentials | null> => ({ ..._admin }));
export const dbSaveAdmin = vi.fn(async (admin: AdminCredentials): Promise<void> => {
  Object.assign(_admin, admin);
});

// ── Users ──────────────────────────────────────────────────────

export const dbGetAllUsers = vi.fn(async (): Promise<User[]> => Array.from(_users.values()));
export const dbGetUser = vi.fn(async (codeNo: string): Promise<User | null> => _users.get(codeNo) ?? null);
export const dbCreateUser = vi.fn(async (user: User): Promise<void> => { _users.set(user.codeNo, user); });
export const dbUpdateUser = vi.fn(async (_codeNo: string, user: User): Promise<void> => { _users.set(user.codeNo, user); });
export const dbDeleteUser = vi.fn(async (codeNo: string): Promise<void> => { _users.delete(codeNo); });

// ── Payroll ────────────────────────────────────────────────────

export const dbGetAllPayroll = vi.fn(async (): Promise<PayrollRecord[]> => Array.from(_payroll.values()));
export const dbGetPayroll = vi.fn(async (id: string): Promise<PayrollRecord | null> => _payroll.get(id) ?? null);
export const dbCreatePayroll = vi.fn(async (r: PayrollRecord): Promise<void> => { _payroll.set(r.id, r); });
export const dbDeletePayroll = vi.fn(async (id: string): Promise<void> => { _payroll.delete(id); });

// ── Monthly Paysheets ──────────────────────────────────────────

export const dbGetAllPaysheets = vi.fn(async (): Promise<MonthlyPaysheetDTO[]> => Array.from(_paysheets.values()));
export const dbGetPaysheetsByMonth = vi.fn(async (payMonth: string): Promise<MonthlyPaysheetDTO[]> =>
  Array.from(_paysheets.values()).filter((p) => p.payMonth === payMonth)
);
export const dbGetPaysheet = vi.fn(async (id: string): Promise<MonthlyPaysheetDTO | null> => _paysheets.get(id) ?? null);
export const dbCreatePaysheet = vi.fn(async (ps: MonthlyPaysheetDTO): Promise<void> => { _paysheets.set(ps.id!, ps); });
export const dbCreateManyPaysheets = vi.fn(async (psList: MonthlyPaysheetDTO[]): Promise<void> => {
  for (const ps of psList) _paysheets.set(ps.id!, ps);
});
export const dbUpdatePaysheet = vi.fn(async (id: string, ps: MonthlyPaysheetDTO): Promise<void> => {
  _paysheets.set(id, { ...ps, id });
});
export const dbUpdatePaysheetStatus = vi.fn(async (id: string, status: 'active' | 'delete'): Promise<void> => {
  const ps = _paysheets.get(id);
  if (ps) _paysheets.set(id, { ...ps, status });
});
export const dbDeletePaysheet = vi.fn(async (id: string): Promise<void> => { _paysheets.delete(id); });

// ── Test helpers ───────────────────────────────────────────────

/** Clear all in-memory state between tests */
export function __resetStore(): void {
  _users.clear();
  _payroll.clear();
  _paysheets.clear();
}

/** Seed a user */
export function __seedUser(user: User): void { _users.set(user.codeNo, user); }

/** Seed a payroll record */
export function __seedPayroll(r: PayrollRecord): void { _payroll.set(r.id, r); }

/** Seed a paysheet */
export function __seedPaysheet(ps: MonthlyPaysheetDTO): void { _paysheets.set(ps.id!, ps); }
