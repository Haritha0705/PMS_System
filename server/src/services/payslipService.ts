import { Worker } from 'worker_threads';
import { execFile } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';
import logger from '../utils/logger';
import { dbGetAllPaysheets, dbGetAllUsers, dbGetPaysheet, dbGetUser } from './dbStore';
import { cacheGet, cacheSet, CK } from './cache';

import puppeteer from 'puppeteer';
import { renderPayslipHTML } from '../templates/payslip';
import { findChromePath } from '../utils/chromePath';
import type {
  Job,
  PayslipEmployee,
  WorkerTask,
  WorkerMessage,
} from '../types/worker';

// ── Job store (in-memory) ───────────────────────────────────

const jobs = new Map<string, Job>();
const TEMP_DIR = process.env.TEMP_DIR || path.join(__dirname, '..', '..', 'temp');
const OUTPUT_DIR = process.env.OUTPUT_DIR || path.join(__dirname, '..', '..', 'exports');

function ensureDirs(): void {
  for (const dir of [TEMP_DIR, OUTPUT_DIR]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}

// ── Job persistence helpers ─────────────────────────────────

async function persistJob(job: Job): Promise<void> {
  await cacheSet(CK.JOB(job.id), job, 86400); // 24 h
}

// ── Public API ──────────────────────────────────────────────

export async function getJob(jobId: string): Promise<Job | undefined> {
  // In-memory first (fast path)
  const local = jobs.get(jobId);
  if (local) return local;
  // Fall back to Redis (survives restarts / multi-instance)
  const cached = await cacheGet<Job>(CK.JOB(jobId));
  if (cached) { jobs.set(jobId, cached); return cached; }
  return undefined;
}

export function getActiveJob(): Job | undefined {
  for (const job of jobs.values()) {
    if (job.status === 'processing' || job.status === 'zipping' || job.status === 'pending') {
      return job;
    }
  }
  return undefined;
}

export async function startPayslipGeneration(
  payMonth: string,
  codeNos: string[] | undefined,
  concurrency: number
): Promise<{ job: Job; skipped: string[] }> {
  // Prevent duplicate concurrent jobs
  const active = getActiveJob();
  if (active) {
    throw new Error(`A generation job is already in progress (ID: ${active.id})`);
  }

  // Gather data
  const { employees, skipped } = await buildPayslipData(payMonth, codeNos);
  if (employees.length === 0) {
    if (skipped.length > 0) {
      throw new Error(`All paysheets have achievedSalary = 0. Cannot generate.`);
    }
    throw new Error(`No paysheets found for ${payMonth}`);
  }

  // Create job
  const job: Job = {
    id: uuidv4(),
    status: 'pending',
    total: employees.length,
    completed: 0,
    failed: 0,
    progress: 0,
    zipPath: null,
    error: null,
    createdAt: new Date().toISOString(),
  };
  jobs.set(job.id, job);
  await persistJob(job);

  logger.info(`Payslip job ${job.id} created for ${employees.length} employees (month: ${payMonth})${skipped.length > 0 ? `, skipped ${skipped.length} with zero salary` : ''}`);

  // Start processing in background (non-blocking)
  processJob(job, employees, concurrency).catch((err) => {
    job.status = 'failed';
    job.error = err instanceof Error ? err.message : String(err);
    persistJob(job).catch(() => {});
    logger.error(`Job ${job.id} failed`, { error: job.error });
  });

  return { job, skipped };
}

/**
 * Called by BullMQ worker — resumes/drives a job that was already created
 * and stored in Redis (job data was persisted before enqueueing).
 */
export async function processJobById(
  jobId: string,
  payMonth: string,
  codeNos: string[] | undefined,
  concurrency: number,
): Promise<void> {
  const { employees } = await buildPayslipData(payMonth, codeNos);
  let job = await getJob(jobId);
  if (!job) {
    job = {
      id: jobId, status: 'pending', total: employees.length,
      completed: 0, failed: 0, progress: 0,
      zipPath: null, error: null, createdAt: new Date().toISOString(),
    };
    jobs.set(jobId, job);
  }
  await processJob(job, employees, concurrency);
}

// ── Data assembly ───────────────────────────────────────────

async function buildPayslipData(
  payMonth: string,
  codeNos: string[] | undefined
): Promise<{ employees: PayslipEmployee[]; skipped: string[] }> {
  const paysheets = await dbGetAllPaysheets();
  const users = await dbGetAllUsers();
  const userMap = new Map(users.map((u) => [u.codeNo, u]));

  let filtered = paysheets.filter((p) => p.payMonth === payMonth);
  if (codeNos && codeNos.length > 0) {
    const codeSet = new Set(codeNos);
    filtered = filtered.filter((p) => codeSet.has(p.codeNo));
  }

  // Skip paysheets where achievedSalary is 0
  const skipped: string[] = [];
  const valid = filtered.filter((p) => {
    if (!p.achievedSalary || p.achievedSalary === 0) {
      const user = userMap.get(p.codeNo);
      const name = user ? `${user.firstName} ${user.lastName} (${p.codeNo})` : p.codeNo;
      skipped.push(name);
      return false;
    }
    return true;
  });

  const employees = valid.map((p): PayslipEmployee => {
    const user = userMap.get(p.codeNo);
    return {
      id: p.id || p.codeNo,
      codeNo: p.codeNo,
      firstName: user?.firstName || p.codeNo,
      lastName: user?.lastName || '',
      designation: user?.designation || p.role,
      branch: user?.branch || '',
      bankName: user?.bankName || '',
      bankAccount: user?.bankAccount || '',
      payMonth: p.payMonth,
      basicSalary: p.basicSalary || 0,
      vehicleAllowance: p.vehicleAllowance || 0,
      fuelAllowance: p.fuelAllowance || 0,
      generalAllowance: p.generalAllowance || 0,
      orc: p.orc || 0,
      otherOffer: p.otherOffer || 0,
      customEarningName: p.customEarningName || '',
      customEarningAmount: p.customEarningAmount || 0,
      grossSalary: p.grossSalary || 0,
      epfEmployee: p.epfEmployee || 0,
      epfEmployer: p.epfEmployer || 0,
      etf: p.etf || 0,
      nopayDeduction: p.nopayDeduction || 0,
      lateDeduction: p.lateDeduction || 0,
      welfare: p.welfare || 0,
      customDeductionName: p.customDeductionName || '',
      customDeductionAmount: p.customDeductionAmount || 0,
      netSalary: p.netSalary || 0,
      achievementPct: p.achievementPct || 0,
      assignedTarget: p.assignedTarget || 0,
      createdAt: p.createdAt || new Date().toISOString(),
    };
  });

  return { employees, skipped };
}

// ── Job processing ──────────────────────────────────────────

async function processJob(
  job: Job,
  employees: PayslipEmployee[],
  concurrency: number
): Promise<void> {
  ensureDirs();

  const jobDir = path.join(TEMP_DIR, job.id);
  fs.mkdirSync(jobDir, { recursive: true });

  job.status = 'processing';
  await persistJob(job);

  // Split into batches
  const batchSize = Math.ceil(employees.length / concurrency);
  const batches: PayslipEmployee[][] = [];
  for (let i = 0; i < employees.length; i += batchSize) {
    batches.push(employees.slice(i, i + batchSize));
  }

  const actualConcurrency = batches.length;
  logger.info(`Job ${job.id}: ${employees.length} payslips in ${actualConcurrency} batches`);

  // Resolve worker script path — use .ts in dev (ts-node), .js in production (compiled dist/)
  const ext = __filename.endsWith('.ts') ? '.ts' : '.js';
  const workerPath = path.join(__dirname, '..', 'workers', `pdf-worker${ext}`);

  try {
    await runWorkers(job, batches, jobDir, workerPath);
  } catch (err) {
    job.status = 'failed';
    job.error = err instanceof Error ? err.message : String(err);
    logger.error(`Job ${job.id} worker phase failed`, { error: job.error });
    cleanup(jobDir);
    return;
  }

  // ZIP phase
  job.status = 'zipping';
  await persistJob(job);
  logger.info(`Job ${job.id}: zipping ${job.completed} PDFs`);

  try {
    const zipPath = await createZip(jobDir, job.id);
    job.zipPath = zipPath;
    job.status = 'completed';
    job.progress = 100;
    await persistJob(job);
    logger.info(`Job ${job.id}: completed. ZIP at ${zipPath}`);
  } catch (err) {
    job.status = 'failed';
    job.error = `ZIP creation failed: ${err instanceof Error ? err.message : String(err)}`;
    await persistJob(job);
    logger.error(`Job ${job.id} zip failed`, { error: job.error });
  } finally {
    cleanup(jobDir);
  }
}

function runWorkers(
  job: Job,
  batches: PayslipEmployee[][],
  jobDir: string,
  workerPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    let finishedWorkers = 0;
    let hasRejected = false;
    const workers: Worker[] = [];

    for (let i = 0; i < batches.length; i++) {
      const worker = new Worker(workerPath);
      workers.push(worker);

      worker.on('message', (msg: WorkerMessage) => {
        if (hasRejected) return;

        switch (msg.type) {
          case 'progress':
            job.completed++;
            job.progress = Math.floor((job.completed / job.total) * 95); // 0-95%, last 5% for zipping
            break;

          case 'error':
            job.failed++;
            logger.warn(`Job ${job.id}: payslip failed - ${msg.message}`, {
              failedId: msg.failedId,
            });
            break;

          case 'done':
            finishedWorkers++;
            logger.info(`Job ${job.id}: batch ${msg.batchIndex} done (${msg.files.length} files)`);
            if (finishedWorkers === batches.length) {
              resolve();
            }
            break;
        }
      });

      worker.on('error', (err) => {
        if (hasRejected) return;
        hasRejected = true;
        logger.error(`Worker ${i} crashed`, { error: err.message });
        terminateAll(workers);
        reject(err);
      });

      worker.on('exit', (code) => {
        if (code !== 0 && !hasRejected) {
          // Worker exited without sending 'done' - count it as finished to avoid hanging
          finishedWorkers++;
          logger.warn(`Worker ${i} exited with code ${code}`);
          if (finishedWorkers === batches.length) {
            resolve();
          }
        }
      });

      // Send task
      const task: WorkerTask = {
        type: 'render',
        batch: batches[i],
        outputDir: jobDir,
        batchIndex: i,
      };
      worker.postMessage(task);
    }
  });
}

function terminateAll(workers: Worker[]): void {
  for (const w of workers) {
    try {
      w.terminate();
    } catch {
      // ignore
    }
  }
}

// ── ZIP creation ────────────────────────────────────────────

function createZip(sourceDir: string, jobId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    ensureDirs();
    const zipPath = path.join(OUTPUT_DIR, `payslips_${jobId}.zip`);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 6 } });

    output.on('close', () => resolve(zipPath));
    archive.on('error', (err) => reject(err));
    archive.on('warning', (err) => {
      if (err.code !== 'ENOENT') reject(err);
    });

    archive.pipe(output);

    // Recursively add branch/month subdirectories with PDFs into the ZIP
    const branches = fs.readdirSync(sourceDir, { withFileTypes: true });
    for (const branch of branches) {
      if (branch.isDirectory()) {
        const branchPath = path.join(sourceDir, branch.name);
        archive.directory(branchPath, branch.name);
      } else if (branch.name.endsWith('.pdf')) {
        // Fallback: add any loose PDFs at root level
        archive.file(path.join(sourceDir, branch.name), { name: branch.name });
      }
    }

    archive.finalize();
  });
}

// ── Print PDFs ─────────────────────────────────────────────

export async function printPayslips(
  jobId: string,
  printerName?: string,
  copies: number = 1
): Promise<string> {
  const job = jobs.get(jobId);
  if (!job) throw new Error('Job not found');
  if (job.status !== 'completed' || !job.zipPath) {
    throw new Error('ZIP not ready for printing');
  }
  if (!fs.existsSync(job.zipPath)) {
    throw new Error('ZIP file has been cleaned up');
  }

  // Extract ZIP to temp dir for printing
  const printDir = path.join(TEMP_DIR, `print_${jobId}`);
  fs.mkdirSync(printDir, { recursive: true });

  // Use archiver's unzip equivalent — read ZIP and extract PDFs
  const AdmZip = await import('adm-zip');
  const zip = new AdmZip.default(job.zipPath);
  zip.extractAllTo(printDir, true);

  // Collect PDFs recursively from branch/month subdirectories
  const pdfFiles: string[] = [];
  function collectPdfs(dir: string, prefix: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        collectPdfs(path.join(dir, entry.name), prefix ? `${prefix}/${entry.name}` : entry.name);
      } else if (entry.name.endsWith('.pdf')) {
        pdfFiles.push(prefix ? `${prefix}/${entry.name}` : entry.name);
      }
    }
  }
  collectPdfs(printDir, '');

  if (pdfFiles.length === 0) {
    cleanup(printDir);
    throw new Error('No PDF files found in ZIP');
  }

  logger.info(`Printing ${pdfFiles.length} PDFs (${copies} copies) to ${printerName || 'default printer'}`, { jobId });

  try {
    if (process.platform === 'win32') {
      await printPdfsWindows(printDir, pdfFiles, printerName, copies);
    } else {
      await printPdfsUnix(printDir, pdfFiles, printerName, copies);
    }

    const msg = `Sent ${pdfFiles.length} payslips (${copies} copies) to ${printerName || 'default printer'}`;
    logger.info(msg, { jobId });
    return msg;
  } finally {
    cleanup(printDir);
  }
}

async function printPdfsWindows(
  dir: string,
  files: string[],
  printerName?: string,
  copies: number = 1
): Promise<void> {
  // Use pdf-to-printer (bundles SumatraPDF) for silent PDF printing.
  // Works on any Windows machine without needing a registered PDF viewer.
  const { print } = await import('pdf-to-printer');

  for (const file of files) {
    const filePath = path.join(dir, file);
    const options: Record<string, string | boolean> = {};
    if (printerName) options.printer = printerName;

    for (let c = 0; c < copies; c++) {
      await print(filePath, options);
    }
  }
}

function printPdfsUnix(
  dir: string,
  files: string[],
  printerName?: string,
  copies: number = 1
): Promise<void> {
  return new Promise((resolve, reject) => {
    let completed = 0;
    let hasError = false;

    for (const file of files) {
      const filePath = path.join(dir, file);
      const args = [filePath];
      if (printerName) args.push('-d', printerName);
      if (copies > 1) args.push('-n', String(copies));

      execFile('lp', args, (err) => {
        if (hasError) return;
        if (err) {
          hasError = true;
          reject(new Error(`Print failed for ${file}: ${err.message}`));
          return;
        }
        completed++;
        if (completed === files.length) resolve();
      });
    }
  });
}

// ── Single PDF generation ──────────────────────────────────

export async function generateSinglePdf(paysheetId: string): Promise<Buffer> {
  const paysheet = await dbGetPaysheet(paysheetId);
  if (!paysheet) throw new Error('Paysheet not found');

  const user = await dbGetUser(paysheet.codeNo);

  const emp: PayslipEmployee = {
    id: paysheet.id || paysheet.codeNo,
    codeNo: paysheet.codeNo,
    firstName: user?.firstName || paysheet.codeNo,
    lastName: user?.lastName || '',
    designation: user?.designation || paysheet.role,
    branch: user?.branch || '',
    bankName: user?.bankName || '',
    bankAccount: user?.bankAccount || '',
    payMonth: paysheet.payMonth,
    basicSalary: paysheet.basicSalary || 0,
    vehicleAllowance: paysheet.vehicleAllowance || 0,
    fuelAllowance: paysheet.fuelAllowance || 0,
    generalAllowance: paysheet.generalAllowance || 0,
    orc: paysheet.orc || 0,
    otherOffer: paysheet.otherOffer || 0,
    customEarningName: paysheet.customEarningName || '',
    customEarningAmount: paysheet.customEarningAmount || 0,
    grossSalary: paysheet.grossSalary || 0,
    epfEmployee: paysheet.epfEmployee || 0,
    epfEmployer: paysheet.epfEmployer || 0,
    etf: paysheet.etf || 0,
    nopayDeduction: paysheet.nopayDeduction || 0,
    lateDeduction: paysheet.lateDeduction || 0,
    welfare: paysheet.welfare || 0,
    customDeductionName: paysheet.customDeductionName || '',
    customDeductionAmount: paysheet.customDeductionAmount || 0,
    netSalary: paysheet.netSalary || 0,
    achievementPct: paysheet.achievementPct || 0,
    assignedTarget: paysheet.assignedTarget || 0,
    createdAt: paysheet.createdAt || new Date().toISOString(),
  };

  const html = renderPayslipHTML(emp);

  const chromePath = findChromePath();
  const browser = await puppeteer.launch({
    headless: true,
    ...(chromePath ? { executablePath: chromePath } : {}),
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123 });
    await page.setContent(html, { waitUntil: 'domcontentloaded' });

    const pdfBuffer = await page.pdf({
      width: '210mm',
      height: '297mm',
      printBackground: true,
      margin: { top: '8mm', bottom: '8mm', left: '10mm', right: '10mm' },
    });

    await page.close();
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

// ── Cleanup ─────────────────────────────────────────────────

function cleanup(dir: string): void {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (err) {
    logger.warn(`Failed to clean up temp dir: ${dir}`, {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
