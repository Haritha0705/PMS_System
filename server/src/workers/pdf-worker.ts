import { parentPort } from 'worker_threads';
import puppeteer, { type Page } from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { renderPayslipHTML } from '../templates/payslip';
import { findChromePath } from '../utils/chromePath';
import type { WorkerTask, WorkerMessage, PayslipEmployee } from '../types/worker';

const MAX_RETRIES = 2;

async function renderPDF(
  page: Page,
  employee: PayslipEmployee,
  outputDir: string
): Promise<string> {
  const html = renderPayslipHTML(employee);
  await page.setContent(html, { waitUntil: 'domcontentloaded' });

  // Organize into branch/month subdirectories
  const branchFolder = (employee.branch || 'Unknown Branch').replace(/[^a-zA-Z0-9_ -]/g, '_');
  const monthFolder = employee.payMonth.replace(/[^a-zA-Z0-9_-]/g, '_');
  const subDir = path.join(outputDir, branchFolder, monthFolder);
  fs.mkdirSync(subDir, { recursive: true });

  const safeName = `${employee.codeNo}_${employee.firstName}_${employee.lastName}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filePath = path.join(subDir, `${safeName}.pdf`);

  await page.pdf({
    path: filePath,
    width: '210mm',
    height: '297mm',
    printBackground: true,
    margin: { top: '8mm', bottom: '8mm', left: '10mm', right: '10mm' },
  });

  return filePath;
}

async function processBatch(task: WorkerTask): Promise<void> {
  const { batch, outputDir, batchIndex } = task;
  const files: string[] = [];
  let completedCount = 0;

  fs.mkdirSync(outputDir, { recursive: true });

  const chromePath = findChromePath();
  const browser = await puppeteer.launch({
    headless: true,
    ...(chromePath ? { executablePath: chromePath } : {}),
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123 });

    for (const employee of batch) {
      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          const filePath = await renderPDF(page, employee, outputDir);
          files.push(filePath);
          lastError = null;
          break;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          if (attempt < MAX_RETRIES) {
            await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
          }
        }
      }

      if (lastError) {
        const msg: WorkerMessage = {
          type: 'error',
          message: `Failed to render payslip for ${employee.codeNo}: ${lastError.message}`,
          batchIndex,
          failedId: employee.codeNo,
        };
        parentPort?.postMessage(msg);
      }

      completedCount++;
      const progress: WorkerMessage = {
        type: 'progress',
        completed: completedCount,
        batchIndex,
      };
      parentPort?.postMessage(progress);
    }

    await page.close();
  } finally {
    await browser.close();
  }

  const done: WorkerMessage = { type: 'done', files, batchIndex };
  parentPort?.postMessage(done);
}

// Listen for tasks from main thread
parentPort?.on('message', (task: WorkerTask) => {
  if (task.type === 'render') {
    processBatch(task).catch((err) => {
      const msg: WorkerMessage = {
        type: 'error',
        message: `Worker crashed: ${err instanceof Error ? err.message : String(err)}`,
        batchIndex: task.batchIndex,
      };
      parentPort?.postMessage(msg);
    });
  }
});
