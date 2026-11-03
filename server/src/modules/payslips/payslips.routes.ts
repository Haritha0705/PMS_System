import { FastifyInstance } from 'fastify';
import fs from 'fs';
import { generatePayslipsSchema, printPayslipsSchema } from '../../validation/payslip';
import { startPayslipGeneration, getJob, printPayslips, generateSinglePdf } from '../../services/payslipService';
import logger from '../../utils/logger';

export default async function payslipRoutes(fastify: FastifyInstance): Promise<void> {

  // POST /generate
  fastify.post<{ Body: unknown }>('/generate', async (request, reply) => {
    try {
      const parsed = generatePayslipsSchema.safeParse(request.body);
      if (!parsed.success) {
        const errors = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
        return reply.code(400).send({ error: 'Validation failed', details: errors });
      }

      const { payMonth, codeNos, concurrency } = parsed.data;
      const { job, skipped } = await startPayslipGeneration(payMonth, codeNos, concurrency);

      return reply.code(202).send({
        message: 'Payslip generation started',
        jobId: job.id,
        total: job.total,
        skipped,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start generation';
      logger.error('Generate payslips failed', { error: message });
      return reply.code(409).send({ error: message });
    }
  });

  // GET /progress/:jobId
  fastify.get<{ Params: { jobId: string } }>('/progress/:jobId', async (request, reply) => {
    const job = await getJob(request.params.jobId);
    if (!job) return reply.code(404).send({ error: 'Job not found' });

    return reply.send({
      id: job.id, status: job.status, total: job.total,
      completed: job.completed, failed: job.failed,
      progress: job.progress, error: job.error, createdAt: job.createdAt,
    });
  });

  // GET /download/:jobId
  fastify.get<{ Params: { jobId: string } }>('/download/:jobId', async (request, reply) => {
    const job = await getJob(request.params.jobId);
    if (!job) return reply.code(404).send({ error: 'Job not found' });

    if (job.status !== 'completed' || !job.zipPath) {
      return reply.code(400).send({ error: 'ZIP not ready', status: job.status, progress: job.progress });
    }

    if (!fs.existsSync(job.zipPath)) {
      return reply.code(410).send({ error: 'ZIP file has been cleaned up' });
    }

    const filename = `payslips_${job.id.slice(0, 8)}.zip`;
    const stat = fs.statSync(job.zipPath);

    reply.header('Content-Type', 'application/zip');
    reply.header('Content-Disposition', `attachment; filename="${filename}"`);
    reply.header('Content-Length', String(stat.size));

    return reply.send(fs.createReadStream(job.zipPath));
  });

  // POST /print
  fastify.post<{ Body: unknown }>('/print', async (request, reply) => {
    try {
      const parsed = printPayslipsSchema.safeParse(request.body);
      if (!parsed.success) {
        const errors = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
        return reply.code(400).send({ error: 'Validation failed', details: errors });
      }

      const { jobId, printerName, copies } = parsed.data;
      const result = await printPayslips(jobId, printerName, copies);
      return reply.send({ message: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Print failed';
      logger.error('PDF print failed', { error: message });
      return reply.code(500).send({ error: message });
    }
  });

  // GET /pdf/:paysheetId
  fastify.get<{ Params: { paysheetId: string } }>('/pdf/:paysheetId', async (request, reply) => {
    try {
      const pdfBuffer = await generateSinglePdf(request.params.paysheetId);
      reply.header('Content-Type', 'application/pdf');
      reply.header('Content-Disposition', `attachment; filename="payslip_${request.params.paysheetId}.pdf"`);
      reply.header('Content-Length', String(pdfBuffer.length));
      return reply.send(pdfBuffer);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'PDF generation failed';
      logger.error('Single PDF generation failed', { error: message, paysheetId: request.params.paysheetId });
      const code = error instanceof Error && error.message === 'Paysheet not found' ? 404 : 500;
      return reply.code(code).send({ error: message });
    }
  });
}
