/**
 * Bulk payslip jobs with fake worker threads: a crashed batch must fail the job
 * (not hang it), workers must be stopped, and old ZIPs must be removed.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventEmitter } from 'events';
import fs from 'fs';
import os from 'os';
import path from 'path';

const dirs = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const base = require('fs').mkdtempSync(require('path').join(require('os').tmpdir(), 'pms-jobs-'));
  process.env.TEMP_DIR = `${base}/temp`;
  process.env.OUTPUT_DIR = `${base}/exports`;
  return { output: process.env.OUTPUT_DIR as string };
});

type Behaviour = (worker: FakeWorker, task: { batch: unknown[]; batchIndex: number }) => void;

const state = vi.hoisted(() => ({
  behaviour: null as unknown as Behaviour,
  workers: [] as FakeWorker[],
}));

class FakeWorker extends EventEmitter {
  terminated = false;
  constructor() {
    super();
    state.workers.push(this);
  }
  postMessage(task: { batch: unknown[]; batchIndex: number }) {
    setImmediate(() => state.behaviour(this, task));
  }
  terminate() {
    this.terminated = true;
    setImmediate(() => this.emit('exit', 1));
    return Promise.resolve(1);
  }
}

vi.mock('worker_threads', () => ({
  Worker: class {
    constructor() {
      return new (globalThis as unknown as { FakeWorker: typeof FakeWorker }).FakeWorker();
    }
  },
}));
(globalThis as unknown as { FakeWorker: typeof FakeWorker }).FakeWorker = FakeWorker;

vi.mock('../services/dbStore');
vi.mock('../services/cache');
vi.mock('../plugins/prisma');

import { __resetStore, __seedPaysheet } from '../services/dbStore';
import { startPayslipGeneration, getJob } from '../services/payslipService';
import { makePaysheet } from './helpers/fixtures';

const succeed: Behaviour = (w, task) => {
  for (let i = 0; i < task.batch.length; i++) w.emit('message', { type: 'progress', completed: i + 1, batchIndex: task.batchIndex });
  w.emit('message', { type: 'done', files: [], batchIndex: task.batchIndex });
};

const crash: Behaviour = (w, task) => {
  w.emit('message', { type: 'error', message: 'Worker crashed: Chrome would not start', batchIndex: task.batchIndex });
};

async function runJob(behaviour: Behaviour) {
  state.behaviour = behaviour;
  state.workers.length = 0;
  const { job } = await startPayslipGeneration('2026-04', undefined, 2);
  await vi.waitFor(async () => {
    expect(['completed', 'failed']).toContain((await getJob(job.id))?.status);
  });
  return (await getJob(job.id))!;
}

beforeEach(() => {
  __resetStore();
  __seedPaysheet(makePaysheet({ id: 'p1', codeNo: 'E1' }));
  __seedPaysheet(makePaysheet({ id: 'p2', codeNo: 'E2' }));
});

describe('bulk payslip jobs', () => {
  it('fails the job when a batch crashes, instead of hanging', async () => {
    const job = await runJob(crash);

    expect(job.status).toBe('failed');
    expect(job.error).toMatch(/chrome would not start/i);
    expect(state.workers.every((w) => w.terminated)).toBe(true);
  });

  it('allows a new job after a crashed one', async () => {
    await runJob(crash);
    expect((await runJob(succeed)).status).toBe('completed');
  });

  it('fails the job when a worker exits without finishing', async () => {
    const job = await runJob((w) => w.emit('exit', 1));

    expect(job.status).toBe('failed');
    expect(job.error).toMatch(/stopped before finishing/i);
  });

  it('stops every worker after a successful job', async () => {
    const job = await runJob(succeed);

    expect(job.status).toBe('completed');
    expect(state.workers).toHaveLength(2);
    expect(state.workers.every((w) => w.terminated)).toBe(true);
  });

  it('removes ZIPs older than a day and keeps newer files', async () => {
    fs.mkdirSync(dirs.output, { recursive: true });
    const oldZip = path.join(dirs.output, 'payslips_old.zip');
    const otherFile = path.join(dirs.output, 'notes.txt');
    fs.writeFileSync(oldZip, 'x');
    fs.writeFileSync(otherFile, 'x');
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    fs.utimesSync(oldZip, twoDaysAgo, twoDaysAgo);
    fs.utimesSync(otherFile, twoDaysAgo, twoDaysAgo);

    const job = await runJob(succeed);

    expect(fs.existsSync(oldZip)).toBe(false);
    expect(fs.existsSync(otherFile)).toBe(true);
    expect(fs.existsSync(job.zipPath!)).toBe(true);
  });

  it('counts a failed PDF as failed, not completed', async () => {
    const job = await runJob((w, task) => {
      w.emit('message', { type: 'error', message: 'render failed', batchIndex: task.batchIndex, failedId: 'E1' });
      w.emit('message', { type: 'done', files: [], batchIndex: task.batchIndex });
    });

    expect(job.status).toBe('failed');
    expect(job.completed).toBe(0);
    expect(job.failed).toBe(2);
    expect(job.error).toMatch(/none of the payslips/i);
  });

  it('completes with the failed count when only some PDFs fail', async () => {
    const job = await runJob((w, task) => {
      if (task.batchIndex === 0) {
        w.emit('message', { type: 'error', message: 'render failed', batchIndex: 0, failedId: 'E1' });
      } else {
        w.emit('message', { type: 'progress', completed: 1, batchIndex: task.batchIndex });
      }
      w.emit('message', { type: 'done', files: [], batchIndex: task.batchIndex });
    });

    expect(job.status).toBe('completed');
    expect(job.completed).toBe(1);
    expect(job.failed).toBe(1);
  });

  it('uses a temp folder for this test run', () => {
    expect(dirs.output.startsWith(os.tmpdir())).toBe(true);
  });
});
