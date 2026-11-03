import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { getAllUsers, createPayroll, getAllPayroll, getPayroll, deletePayroll } from './payroll.service';
import { generatePaySheet } from '../../services/payrollCalc';
import { PayrollRecord } from '../../models';
import { generatePayrollSchema, listPayrollQuerySchema } from '../../validation/payroll';

export default async function payrollRoutes(fastify: FastifyInstance): Promise<void> {

  // POST /generate
  fastify.post<{ Body: unknown }>('/generate', async (request, reply) => {
    try {
      const parsed = generatePayrollSchema.safeParse(request.body);
      if (!parsed.success) {
        const errors = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
        return reply.code(400).send({ error: errors[0], details: errors });
      }
      const { codeNos, period } = parsed.data;

      const allUsers = await getAllUsers();
      const existingRecords = await getAllPayroll();
      const generatedRecords: PayrollRecord[] = [];

      const targetCodeNos: string[] =
        codeNos && codeNos.length > 0
          ? codeNos
          : allUsers.filter((u) => u.status === 'active').map((u) => u.codeNo);

      for (const codeNo of targetCodeNos) {
        const user = allUsers.find((u) => u.codeNo === codeNo);
        if (!user) continue;

        const existing = existingRecords.find((r) => r.codeNo === codeNo && r.period === period);
        if (existing) {
          generatedRecords.push(existing);
          continue;
        }

        const payData = generatePaySheet(user, period);
        const record: PayrollRecord = { ...payData, id: uuidv4(), generatedAt: new Date().toISOString() };

        await createPayroll(record);
        generatedRecords.push(record);
      }

      return reply.send({
        message: `Generated ${generatedRecords.length} payroll record(s).`,
        records: generatedRecords,
      });
    } catch {
      return reply.code(500).send({ error: 'Failed to generate payroll.' });
    }
  });

  // GET /history
  fastify.get<{ Querystring: Record<string, string> }>('/history', async (request, reply) => {
    try {
      const parsed = listPayrollQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.issues[0].message });
      }
      let records = await getAllPayroll();
      const { codeNo, period, search } = parsed.data;

      if (codeNo) records = records.filter((r) => r.codeNo === codeNo);
      if (period) records = records.filter((r) => r.period === period);
      if (search) {
        const q = search.toLowerCase();
        records = records.filter(
          (r) =>
            r.userName.toLowerCase().includes(q) ||
            r.branch.toLowerCase().includes(q) ||
            r.codeNo.toLowerCase().includes(q)
        );
      }

      records.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
      return reply.send({ records, total: records.length });
    } catch {
      return reply.code(500).send({ error: 'Failed to fetch payroll history.' });
    }
  });

  // GET /:id
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    try {
      const record = await getPayroll(request.params.id);
      if (!record) return reply.code(404).send({ error: 'Payroll record not found.' });
      return reply.send(record);
    } catch {
      return reply.code(500).send({ error: 'Failed to fetch payroll record.' });
    }
  });

  // DELETE /:id
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    try {
      const record = await getPayroll(request.params.id);
      if (!record) return reply.code(404).send({ error: 'Payroll record not found.' });
      await deletePayroll(request.params.id);
      return reply.send({ message: 'Payroll record deleted.' });
    } catch {
      return reply.code(500).send({ error: 'Failed to delete payroll record.' });
    }
  });
}
