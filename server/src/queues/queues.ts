/**
 * BullMQ queue definitions.
 * Queues are only created when Redis is available.
 * Falls back to direct execution (synchronous inline) when Redis is absent.
 */

import { Queue, Worker, Job } from 'bullmq';
import { getRedis } from '../plugins/redis';
import logger from '../utils/logger';

// ── Queue names ───────────────────────────────────────────────

export const Q = {
  PAYSLIPS:       'payslips',
  EXCEL_EXPORT:   'excel-export',
  BULK_PAYSHEETS: 'bulk-paysheets',
} as const;

// ── Job data types ────────────────────────────────────────────

export interface PayslipJobData {
  jobId: string;
  payMonth: string;
  codeNos: string[] | undefined;
  concurrency: number;
}

export interface ExportJobData {
  type: 'users' | 'paysheets' | 'paysheets-role' | 'paysheets-branch';
  payMonth?: string;
  outputPath: string;
}

export interface BulkPaysheetsJobData {
  jobId: string;
  payMonth: string;
  codeNos: string[];
}

// ── Queue factory ─────────────────────────────────────────────

let _queues: Map<string, Queue> | null = null;

export function getQueue(name: string): Queue | null {
  const redis = getRedis();
  if (!redis) return null;

  if (!_queues) _queues = new Map();
  if (!_queues.has(name)) {
    const q = new Queue(name, {
      connection: redis,
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: 50,
        removeOnFail: 20,
      },
    });
    _queues.set(name, q);
  }
  return _queues.get(name)!;
}

// ── Worker registry ───────────────────────────────────────────

const _workers: Worker[] = [];

export function registerWorker<T>(
  name: string,
  processor: (job: Job<T>) => Promise<unknown>,
  concurrency = 2,
): void {
  const redis = getRedis();
  if (!redis) return;

  const worker = new Worker<T>(name, processor, {
    connection: redis,
    concurrency,
  });

  worker.on('completed', (job) => logger.info(`[queue:${name}] job ${job.id} completed`));
  worker.on('failed', (job, err) => logger.error(`[queue:${name}] job ${job?.id} failed: ${err?.message}`));

  _workers.push(worker);
}

export async function closeQueues(): Promise<void> {
  await Promise.all(_workers.map((w) => w.close()));
  if (_queues) await Promise.all([..._queues.values()].map((q) => q.close()));
}
