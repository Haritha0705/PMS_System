/**
 * dbStore — all database operations via Prisma.
 * Every function returns plain TypeScript types (models/index.ts),
 * converting Prisma's Decimal fields to numbers on the way out.
 */

import { getPrisma } from '../plugins/prisma';
import type {
  User as PrismaUser,
  PayrollRecord as PrismaPayrollRecord,
  MonthlyPaysheet as PrismaMonthlyPaysheet,
} from '@prisma/client';
import type {
  User, AdminCredentials, PayrollRecord, MonthlyPaysheetDTO,
} from '../models';

// ── Decimal → number helper ───────────────────────────────────

function d(v: unknown): number {
  if (v === null || v === undefined) return 0;
  return typeof v === 'object' ? parseFloat(String(v)) : Number(v);
}

// ══════════════════════════════════════════════════════════════
// Admin
// ══════════════════════════════════════════════════════════════

export async function dbGetAdmin(): Promise<AdminCredentials | null> {
  const prisma = getPrisma();
  const row = await prisma.admin.findFirst();
  if (!row) return null;
  return { username: row.username, password: row.password, name: row.name, role: row.role };
}

export async function dbSaveAdmin(admin: AdminCredentials): Promise<void> {
  const prisma = getPrisma();
  await prisma.admin.upsert({
    where: { username: admin.username },
    update: { password: admin.password, name: admin.name, role: admin.role },
    create: { username: admin.username, password: admin.password, name: admin.name, role: admin.role },
  });
}

// ══════════════════════════════════════════════════════════════
// Users
// ══════════════════════════════════════════════════════════════

function toUser(row: PrismaUser): User {
  return {
    codeNo:      row.codeNo,
    firstName:   row.firstName,
    lastName:    row.lastName,
    email:       row.email,
    phone:       row.phone,
    branch:      row.branch,
    role:        row.role,
    designation: row.designation,
    joinDate:    row.joinDate,
    bankAccount: row.bankAccount,
    bankName:    row.bankName,
    basicSalary: d(row.basicSalary),
    allowances:  d(row.allowances),
    deductions:  d(row.deductions),
    status:      row.status as 'active' | 'delete',
    createdAt:   row.createdAt.toISOString(),
    updatedAt:   row.updatedAt.toISOString(),
  };
}

export async function dbGetAllUsers(): Promise<User[]> {
  const prisma = getPrisma();
  const rows = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
  return rows.map(toUser);
}

export async function dbGetUser(codeNo: string): Promise<User | null> {
  const prisma = getPrisma();
  const row = await prisma.user.findUnique({ where: { codeNo } });
  return row ? toUser(row) : null;
}

export async function dbCreateUser(user: User): Promise<void> {
  const prisma = getPrisma();
  await prisma.user.create({
    data: {
      codeNo:      user.codeNo,
      firstName:   user.firstName,
      lastName:    user.lastName,
      email:       user.email,
      phone:       user.phone,
      branch:      user.branch,
      role:        user.role,
      designation: user.designation,
      joinDate:    user.joinDate,
      bankAccount: user.bankAccount,
      bankName:    user.bankName,
      basicSalary: user.basicSalary,
      allowances:  user.allowances,
      deductions:  user.deductions,
      status:      user.status,
      createdAt:   new Date(user.createdAt),
      updatedAt:   new Date(user.updatedAt),
    },
  });
}

export async function dbUpdateUser(codeNo: string, user: User): Promise<void> {
  const prisma = getPrisma();
  await prisma.user.update({
    where: { codeNo },
    data: {
      firstName:   user.firstName,
      lastName:    user.lastName,
      email:       user.email,
      phone:       user.phone,
      branch:      user.branch,
      role:        user.role,
      designation: user.designation,
      joinDate:    user.joinDate,
      bankAccount: user.bankAccount,
      bankName:    user.bankName,
      basicSalary: user.basicSalary,
      allowances:  user.allowances,
      deductions:  user.deductions,
      status:      user.status,
      updatedAt:   new Date(user.updatedAt),
    },
  });
}

export async function dbDeleteUser(codeNo: string): Promise<void> {
  const prisma = getPrisma();
  await prisma.user.delete({ where: { codeNo } });
}

// ══════════════════════════════════════════════════════════════
// Payroll Records
// ══════════════════════════════════════════════════════════════

function toPayrollRecord(row: PrismaPayrollRecord): PayrollRecord {
  return {
    id:          row.id,
    codeNo:      row.codeNo,
    userName:    row.userName,
    period:      row.period,
    basicSalary: d(row.basicSalary),
    allowances:  d(row.allowances),
    deductions:  d(row.deductions),
    tax:         d(row.tax),
    grossSalary: d(row.grossSalary),
    netSalary:   d(row.netSalary),
    branch:      row.branch,
    designation: row.designation,
    generatedAt: row.generatedAt.toISOString(),
  };
}

export async function dbGetAllPayroll(): Promise<PayrollRecord[]> {
  const prisma = getPrisma();
  const rows = await prisma.payrollRecord.findMany({ orderBy: { generatedAt: 'desc' } });
  return rows.map(toPayrollRecord);
}

export async function dbGetPayroll(id: string): Promise<PayrollRecord | null> {
  const prisma = getPrisma();
  const row = await prisma.payrollRecord.findUnique({ where: { id } });
  return row ? toPayrollRecord(row) : null;
}

export async function dbCreatePayroll(record: PayrollRecord): Promise<void> {
  const prisma = getPrisma();
  await prisma.payrollRecord.create({
    data: {
      id:          record.id,
      codeNo:      record.codeNo,
      userName:    record.userName,
      period:      record.period,
      basicSalary: record.basicSalary,
      allowances:  record.allowances,
      deductions:  record.deductions,
      tax:         record.tax,
      grossSalary: record.grossSalary,
      netSalary:   record.netSalary,
      branch:      record.branch,
      designation: record.designation,
      generatedAt: new Date(record.generatedAt),
    },
  });
}

export async function dbDeletePayroll(id: string): Promise<void> {
  const prisma = getPrisma();
  await prisma.payrollRecord.delete({ where: { id } });
}

// ══════════════════════════════════════════════════════════════
// Monthly Paysheets
// ══════════════════════════════════════════════════════════════

function toPaysheet(row: PrismaMonthlyPaysheet): MonthlyPaysheetDTO {
  return {
    id:                   row.id,
    codeNo:               row.codeNo,
    payMonth:             row.payMonth,
    role:                 row.role,
    monthsOfService:      row.monthsOfService,
    achieve:              d(row.achieve),
    allowance:            d(row.allowance),
    nopay:                d(row.nopay),
    late:                 d(row.late),
    lateHours:            row.lateHours,
    lateMinutes:          row.lateMinutes,
    epfAvailability:      row.epfAvailability,
    etfAvailability:      row.etfAvailability,
    welfare:              d(row.welfare),
    otherOffer:           d(row.otherOffer),
    customEarningName:    row.customEarningName,
    customEarningAmount:  d(row.customEarningAmount),
    customDeductionName:  row.customDeductionName,
    customDeductionAmount: d(row.customDeductionAmount),
    basicSalary:          d(row.basicSalary),
    achievedSalary:       d(row.achievedSalary),
    assignedTarget:       d(row.assignedTarget),
    achievementPct:       d(row.achievementPct),
    grossSalary:          d(row.grossSalary),
    vehicleAllowance:     d(row.vehicleAllowance),
    fuelAllowance:        d(row.fuelAllowance),
    generalAllowance:     d(row.generalAllowance),
    orc:                  d(row.orc),
    subTotal:             d(row.subTotal),
    nopayDeduction:       d(row.nopayDeduction),
    lateDeduction:        d(row.lateDeduction),
    epfEmployee:          d(row.epfEmployee),
    epfEmployer:          d(row.epfEmployer),
    etf:                  d(row.etf),
    netSalary:            d(row.netSalary),
    status:               (row.status as 'active' | 'delete') || 'active',
    createdAt:            row.createdAt.toISOString(),
    updatedAt:            row.updatedAt.toISOString(),
  };
}

export async function dbGetAllPaysheets(): Promise<MonthlyPaysheetDTO[]> {
  const prisma = getPrisma();
  const rows = await prisma.monthlyPaysheet.findMany({
    orderBy: [{ payMonth: 'desc' }, { codeNo: 'asc' }],
  });
  return rows.map(toPaysheet);
}

export async function dbGetPaysheetsByMonth(payMonth: string): Promise<MonthlyPaysheetDTO[]> {
  const prisma = getPrisma();
  const rows = await prisma.monthlyPaysheet.findMany({
    where: { payMonth },
    orderBy: { codeNo: 'asc' },
  });
  return rows.map(toPaysheet);
}

export async function dbGetPaysheet(id: string): Promise<MonthlyPaysheetDTO | null> {
  const prisma = getPrisma();
  const row = await prisma.monthlyPaysheet.findUnique({ where: { id } });
  return row ? toPaysheet(row) : null;
}

export async function dbCreatePaysheet(ps: MonthlyPaysheetDTO): Promise<void> {
  if (!ps.id) throw new Error('Paysheet id is required');
  const prisma = getPrisma();
  await prisma.monthlyPaysheet.create({
    data: {
      id:                   ps.id,
      codeNo:               ps.codeNo,
      payMonth:             ps.payMonth,
      role:                 ps.role,
      monthsOfService:      ps.monthsOfService,
      achieve:              ps.achieve,
      allowance:            ps.allowance,
      nopay:                ps.nopay,
      late:                 ps.late ?? 0,
      lateHours:            ps.lateHours,
      lateMinutes:          ps.lateMinutes,
      epfAvailability:      ps.epfAvailability,
      etfAvailability:      ps.etfAvailability,
      welfare:              ps.welfare,
      otherOffer:           ps.otherOffer,
      customEarningName:    ps.customEarningName,
      customEarningAmount:  ps.customEarningAmount,
      customDeductionName:  ps.customDeductionName,
      customDeductionAmount: ps.customDeductionAmount,
      basicSalary:          ps.basicSalary,
      achievedSalary:       ps.achievedSalary,
      assignedTarget:       ps.assignedTarget,
      achievementPct:       ps.achievementPct,
      grossSalary:          ps.grossSalary,
      vehicleAllowance:     ps.vehicleAllowance,
      fuelAllowance:        ps.fuelAllowance,
      generalAllowance:     ps.generalAllowance,
      orc:                  ps.orc,
      subTotal:             ps.subTotal,
      nopayDeduction:       ps.nopayDeduction,
      lateDeduction:        ps.lateDeduction,
      epfEmployee:          ps.epfEmployee,
      epfEmployer:          ps.epfEmployer,
      etf:                  ps.etf,
      netSalary:            ps.netSalary,
      status:               ps.status ?? 'active',
      createdAt:            ps.createdAt ? new Date(ps.createdAt) : new Date(),
      updatedAt:            ps.updatedAt ? new Date(ps.updatedAt) : new Date(),
    },
  });
}

/** Batch insert — replaces N individual dbCreatePaysheet() calls. */
export async function dbCreateManyPaysheets(psList: MonthlyPaysheetDTO[]): Promise<void> {
  if (psList.length === 0) return;
  const prisma = getPrisma();
  await prisma.monthlyPaysheet.createMany({
    data: psList.map((ps) => ({
      id:                   ps.id!,
      codeNo:               ps.codeNo,
      payMonth:             ps.payMonth,
      role:                 ps.role,
      monthsOfService:      ps.monthsOfService,
      achieve:              ps.achieve,
      allowance:            ps.allowance,
      nopay:                ps.nopay,
      late:                 ps.late ?? 0,
      lateHours:            ps.lateHours,
      lateMinutes:          ps.lateMinutes,
      epfAvailability:      ps.epfAvailability,
      etfAvailability:      ps.etfAvailability,
      welfare:              ps.welfare,
      otherOffer:           ps.otherOffer,
      customEarningName:    ps.customEarningName,
      customEarningAmount:  ps.customEarningAmount,
      customDeductionName:  ps.customDeductionName,
      customDeductionAmount: ps.customDeductionAmount,
      basicSalary:          ps.basicSalary,
      achievedSalary:       ps.achievedSalary,
      assignedTarget:       ps.assignedTarget,
      achievementPct:       ps.achievementPct,
      grossSalary:          ps.grossSalary,
      vehicleAllowance:     ps.vehicleAllowance,
      fuelAllowance:        ps.fuelAllowance,
      generalAllowance:     ps.generalAllowance,
      orc:                  ps.orc,
      subTotal:             ps.subTotal,
      nopayDeduction:       ps.nopayDeduction,
      lateDeduction:        ps.lateDeduction,
      epfEmployee:          ps.epfEmployee,
      epfEmployer:          ps.epfEmployer,
      etf:                  ps.etf,
      netSalary:            ps.netSalary,
      status:               ps.status ?? 'active',
      createdAt:            ps.createdAt ? new Date(ps.createdAt) : new Date(),
      updatedAt:            ps.updatedAt ? new Date(ps.updatedAt) : new Date(),
    })),
    skipDuplicates: true,
  });
}

export async function dbUpdatePaysheet(id: string, ps: MonthlyPaysheetDTO): Promise<void> {
  const prisma = getPrisma();
  await prisma.monthlyPaysheet.update({
    where: { id },
    data: {
      monthsOfService:      ps.monthsOfService,
      achieve:              ps.achieve,
      allowance:            ps.allowance,
      nopay:                ps.nopay,
      late:                 ps.late ?? 0,
      lateHours:            ps.lateHours,
      lateMinutes:          ps.lateMinutes,
      epfAvailability:      ps.epfAvailability,
      etfAvailability:      ps.etfAvailability,
      welfare:              ps.welfare,
      otherOffer:           ps.otherOffer,
      customEarningName:    ps.customEarningName,
      customEarningAmount:  ps.customEarningAmount,
      customDeductionName:  ps.customDeductionName,
      customDeductionAmount: ps.customDeductionAmount,
      basicSalary:          ps.basicSalary,
      achievedSalary:       ps.achievedSalary,
      assignedTarget:       ps.assignedTarget,
      achievementPct:       ps.achievementPct,
      grossSalary:          ps.grossSalary,
      vehicleAllowance:     ps.vehicleAllowance,
      fuelAllowance:        ps.fuelAllowance,
      generalAllowance:     ps.generalAllowance,
      orc:                  ps.orc,
      subTotal:             ps.subTotal,
      nopayDeduction:       ps.nopayDeduction,
      lateDeduction:        ps.lateDeduction,
      epfEmployee:          ps.epfEmployee,
      epfEmployer:          ps.epfEmployer,
      etf:                  ps.etf,
      netSalary:            ps.netSalary,
      updatedAt:            ps.updatedAt ? new Date(ps.updatedAt) : new Date(),
    },
  });
}

export async function dbUpdatePaysheetStatus(id: string, status: 'active' | 'delete'): Promise<void> {
  const prisma = getPrisma();
  if (status === 'delete') {
    await prisma.monthlyPaysheet.delete({ where: { id } });
  } else {
    await prisma.monthlyPaysheet.update({
      where: { id },
      data: { status, updatedAt: new Date() },
    });
  }
}

export async function dbDeletePaysheet(id: string): Promise<void> {
  const prisma = getPrisma();
  await prisma.monthlyPaysheet.delete({ where: { id } });
}
