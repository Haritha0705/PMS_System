/**
 * BullMQ job processors — the actual work done for each queue.
 * Import this once at startup to register all workers.
 */

import { Job } from 'bullmq';
import {
  Q, registerWorker, PayslipJobData, ExportJobData, BulkPaysheetsJobData,
} from './queues';
import { cacheSet, cacheInvalidatePrefix, CK } from '../services/cache';
import logger from '../utils/logger';

// ── Payslip PDF generation ────────────────────────────────────

async function payslipProcessor(job: Job<PayslipJobData>): Promise<void> {
  const { jobId, payMonth, codeNos, concurrency } = job.data;
  logger.info(`[queue:payslips] processing job ${jobId} for ${payMonth}`);

  // Dynamic import avoids circular dep issues at module load time
  const { processJobById } = await import('../services/payslipService');
  await processJobById(jobId, payMonth, codeNos, concurrency);
}

// ── Excel export ──────────────────────────────────────────────

async function exportProcessor(job: Job<ExportJobData>): Promise<string> {
  const { type, outputPath } = job.data;
  logger.info(`[queue:excel-export] processing ${type} export`);

  const fs = await import('fs');
  const path = await import('path');
  const { dbGetAllUsers, dbGetAllPaysheets } = await import('../services/dbStore');
  const {
    exportUsersToExcel,
    exportMonthlyPaysheetsToExcel,
    exportMonthlyPaysheetsByRoleToExcel,
    exportMonthlyPaysheetsByBranchToExcel,
  } = await import('../utils/excelExport');

  let buffer: Buffer;
  if (type === 'users') {
    buffer = await exportUsersToExcel(await dbGetAllUsers());
  } else {
    const [records, users] = await Promise.all([dbGetAllPaysheets(), dbGetAllUsers()]);
    switch (type) {
      case 'paysheets':        buffer = await exportMonthlyPaysheetsToExcel(records, users); break;
      case 'paysheets-role':   buffer = await exportMonthlyPaysheetsByRoleToExcel(records, users); break;
      case 'paysheets-branch': buffer = await exportMonthlyPaysheetsByBranchToExcel(records, users); break;
      default: throw new Error(`Unknown export type: ${type}`);
    }
  }

  // Persist to the requested path so the finished file can be fetched later.
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, buffer);
  return outputPath;
}

// ── Bulk paysheet creation ────────────────────────────────────

async function bulkPaysheetsProcessor(job: Job<BulkPaysheetsJobData>): Promise<void> {
  const { jobId, payMonth, codeNos } = job.data;
  logger.info(`[queue:bulk-paysheets] processing ${codeNos.length} paysheets for ${payMonth}`);

  // Store progress in cache so client can poll
  await cacheSet(CK.JOB(jobId), { status: 'processing', total: codeNos.length, done: 0 }, 3600);

  const { dbGetUser, dbGetPaysheetsByMonth, dbCreatePaysheet, dbUpdatePaysheet } = await import('../services/dbStore');
  const { calculatePaysheet, getRoleConfig, isSalesRole, SALES_BASED_ROLES, NON_TARGET_ROLES } =
    await import('../engine/salary-calculator');
  const { buildPaysheetInput, getPreviousState, recalcPaysheet, recalcFollowingMonths, toPaysheetFields } =
    await import('../services/salesCycle');
  const { v4: uuidv4 } = await import('uuid');

  // users.role stores the role LABEL; paysheets store the CODE
  const nameToCode: Record<string, string> = {};
  for (const [code, name] of Object.entries({ ...SALES_BASED_ROLES, ...NON_TARGET_ROLES })) nameToCode[name] = code;

  const existing = await dbGetPaysheetsByMonth(payMonth);
  const existingMap = new Map(existing.map((p) => [p.codeNo, p]));

  let done = 0;
  for (const codeNo of codeNos) {
    try {
      const user = await dbGetUser(codeNo);
      if (!user) continue;

      const ex = existingMap.get(codeNo);
      const roleCode = ex?.role ?? (nameToCode[user.role || user.designation || ''] || user.role);
      if (!getRoleConfig(roleCode)) {
        logger.warn(`[bulk-paysheets] unknown role for ${codeNo}: ${user.role}`);
        continue;
      }
      const previousState = await getPreviousState(codeNo, payMonth, roleCode);

      if (ex) {
        // Recalculate from the paysheet's own saved inputs (never wipe entered figures)
        const next = recalcPaysheet(ex, previousState);
        if (next) await dbUpdatePaysheet(ex.id!, next);
      } else {
        const fields = {
          achieve: 0, allowance: 0, nopay: 0, lateHours: 0, lateMinutes: 0,
          welfare: 0, otherOffer: 0, epfAvailability: true,
          customEarningAmount: 0, customDeductionAmount: 0,
        };
        const roleConfig = getRoleConfig(roleCode)!;
        const result = toPaysheetFields(calculatePaysheet(buildPaysheetInput(roleCode, roleConfig, fields, previousState)));
        const now = new Date().toISOString();
        await dbCreatePaysheet({
          id: uuidv4(), codeNo, payMonth, role: roleCode, monthsOfService: 0,
          late: 0, etfAvailability: true,
          customEarningName: '', customDeductionName: '',
          ...fields, ...result,
          status: 'active', createdAt: now, updatedAt: now,
        });
      }
      if (isSalesRole(roleCode)) await recalcFollowingMonths(codeNo, payMonth);

      done++;
      await job.updateProgress(Math.round((done / codeNos.length) * 100));
      await cacheSet(CK.JOB(jobId), { status: 'processing', total: codeNos.length, done }, 3600);
    } catch (err) {
      logger.error(`[bulk-paysheets] failed for ${codeNo}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  await cacheSet(CK.JOB(jobId), { status: 'completed', total: codeNos.length, done }, 3600);
  await cacheInvalidatePrefix('paysheets:');
}

// ── Register all workers ──────────────────────────────────────

export function registerAllWorkers(): void {
  registerWorker<PayslipJobData>(Q.PAYSLIPS, payslipProcessor, 1);
  registerWorker<ExportJobData>(Q.EXCEL_EXPORT, exportProcessor, 2);
  registerWorker<BulkPaysheetsJobData>(Q.BULK_PAYSHEETS, bulkPaysheetsProcessor, 1);
}
