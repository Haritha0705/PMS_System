import { FastifyInstance, FastifyReply } from 'fastify';
import archiver from 'archiver';
import { z } from 'zod';
import { dbGetAllUsers, dbGetAllPaysheets, dbGetPaysheetsByMonth } from '../../services/dbStore';

const payMonthQuerySchema = z.object({
  payMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'payMonth must be in YYYY-MM format'),
});
import {
  exportUsersToExcel,
  exportMonthlyPaysheetsToExcel,
  exportMonthlyPaysheetsByBranchToExcel,
  exportMonthlyPaysheetsByRoleToExcel,
  exportPaysheetsToMonthBranchZip,
} from '../../utils/excelExport';

function sendBuffer(
  reply: FastifyReply,
  buffer: Buffer,
  filename: string,
  contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
): FastifyReply {
  const finalContentType = filename.endsWith('.zip') ? 'application/zip' : contentType;
  reply.header('Content-Type', finalContentType);
  reply.header('Content-Disposition', `attachment; filename="${filename}"`);
  reply.header('Content-Length', String(buffer.length));
  return reply.send(buffer);
}

export default async function exportRoutes(fastify: FastifyInstance): Promise<void> {

  // GET /users-excel
  fastify.get('/users-excel', async (_req, reply) => {
    try {
      const users = await dbGetAllUsers();
      if (users.length === 0) return reply.code(400).send({ error: 'No user data to export.' });
      const buffer = await exportUsersToExcel(users);
      return sendBuffer(reply, buffer, `users_export_${Date.now()}.xlsx`);
    } catch (error) {
      console.error('Export error:', error);
      return reply.code(500).send({ error: 'Failed to export users.' });
    }
  });

  // GET /paysheets-excel
  fastify.get('/paysheets-excel', async (_req, reply) => {
    try {
      const records = await dbGetAllPaysheets();
      if (records.length === 0) return reply.code(400).send({ error: 'No monthly paysheet data to export.' });
      const users = await dbGetAllUsers();
      const buffer = await exportMonthlyPaysheetsToExcel(records, users);
      return sendBuffer(reply, buffer, `monthly_paysheets_export_${Date.now()}.xlsx`);
    } catch (error) {
      console.error('Export error:', error);
      return reply.code(500).send({ error: 'Failed to export monthly paysheets.' });
    }
  });

  // GET /paysheets-excel-by-role
  fastify.get('/paysheets-excel-by-role', async (_req, reply) => {
    try {
      const records = await dbGetAllPaysheets();
      if (records.length === 0) return reply.code(400).send({ error: 'No monthly paysheet data to export.' });
      const users = await dbGetAllUsers();
      const buffer = await exportMonthlyPaysheetsByRoleToExcel(records, users);
      return sendBuffer(reply, buffer, `monthly_paysheets_role_export_${Date.now()}.xlsx`);
    } catch (error) {
      console.error('Export error:', error);
      return reply.code(500).send({ error: 'Failed to export monthly paysheets by role.' });
    }
  });

  // GET /paysheets-excel-by-branch
  fastify.get('/paysheets-excel-by-branch', async (_req, reply) => {
    try {
      const records = await dbGetAllPaysheets();
      if (records.length === 0) return reply.code(400).send({ error: 'No monthly paysheet data to export.' });
      const users = await dbGetAllUsers();
      const buffer = await exportPaysheetsToMonthBranchZip(records, users);
      return sendBuffer(reply, buffer, `paysheets_by_branch_${Date.now()}.zip`);
    } catch (error) {
      console.error('Export error:', error);
      return reply.code(500).send({ error: 'Failed to export monthly paysheets by branch.' });
    }
  });

  // GET /paysheets-json?payMonth=YYYY-MM
  fastify.get<{ Querystring: { payMonth?: string } }>('/paysheets-json', async (request, reply) => {
    try {
      const parsed = payMonthQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.issues[0].message });
      }
      const { payMonth } = parsed.data;

      const allForMonth = await dbGetPaysheetsByMonth(payMonth);
      const users = await dbGetAllUsers();
      const userMap = new Map(users.map((u) => [u.codeNo, u]));

      if (allForMonth.length === 0) {
        return reply.code(400).send({ error: `No paysheet data found for ${payMonth}` });
      }

      const skipped = allForMonth.filter((r) => !r.achievedSalary || r.achievedSalary === 0);
      const filtered = allForMonth.filter((r) => r.achievedSalary && r.achievedSalary > 0);
      if (filtered.length === 0) {
        return reply.code(400).send({ error: `All paysheets for ${payMonth} have achievedSalary = 0. Cannot export.` });
      }

      // Build one JSON entry per employee in memory — nothing is written to disk.
      const jsonEntries: { name: string; content: string }[] = [];

      for (const record of filtered) {
        const user = userMap.get(record.codeNo);
        const employeeName = user ? `${user.firstName} ${user.lastName}` : record.codeNo;

        const jsonData = {
          export: {
            generatedAt: new Date().toISOString(),
            payMonth: record.payMonth,
            exportType: 'monthly-paysheet',
            company: 'Prestige Glamour Working Capital Solutions (Pvt) Ltd',
          },
          employee: {
            codeNo: record.codeNo, name: employeeName,
            firstName: user?.firstName || '', lastName: user?.lastName || '',
            designation: user?.designation || record.role, branch: user?.branch || '',
            role: record.role, bankName: user?.bankName || '', bankAccount: user?.bankAccount || '',
            email: user?.email || '', phone: user?.phone || '',
          },
          paysheet: {
            payMonth: record.payMonth, monthsOfService: record.monthsOfService,
            basicSalary: record.basicSalary || 0, assignedTarget: record.assignedTarget || 0,
            achieve: record.achieve || 0, achievementPct: record.achievementPct || 0,
          },
          earnings: {
            basicOffers: record.achieve || 0, vehicleAllowance: record.vehicleAllowance || 0,
            fuelAllowance: record.fuelAllowance || 0, generalAllowance: record.generalAllowance || 0,
            orc: record.orc || 0, otherOffer: record.otherOffer || 0,
            customEarningName: record.customEarningName || '', customEarningAmount: record.customEarningAmount || 0,
            grossSalary: record.grossSalary || 0,
          },
          deductions: {
            epfEmployee: record.epfEmployee || 0, nopayDeduction: record.nopayDeduction || 0,
            lateDeduction: record.lateDeduction || 0, welfare: record.welfare || 0,
            customDeductionName: record.customDeductionName || '', customDeductionAmount: record.customDeductionAmount || 0,
          },
          employerContributions: {},
          summary: {
            grossSalary: record.grossSalary || 0,
            totalDeductions:
              (record.epfEmployee || 0) + (record.nopayDeduction || 0) +
              (record.lateDeduction || 0) + (record.welfare || 0) + (record.customDeductionAmount || 0),
            netSalary: record.netSalary || 0,
          },
        };

        const safeName = `${record.codeNo}_${employeeName.replace(/[^a-zA-Z0-9]/g, '_')}`;
        jsonEntries.push({ name: `${safeName}.json`, content: JSON.stringify(jsonData, null, 2) });
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="paysheets_json_${payMonth}.zip"`,
        'Access-Control-Expose-Headers': 'X-Skipped-Count, X-Skipped-Names',
      };
      if (skipped.length > 0) {
        const skippedNames = skipped.map((r) => {
          const u = userMap.get(r.codeNo);
          return u ? `${u.firstName} ${u.lastName} (${r.codeNo})` : r.codeNo;
        });
        headers['X-Skipped-Count'] = String(skipped.length);
        headers['X-Skipped-Names'] = encodeURIComponent(skippedNames.join(', '));
      }

      reply.hijack();
      reply.raw.writeHead(200, headers);

      await new Promise<void>((resolve, reject) => {
        const archive = archiver('zip', { zlib: { level: 6 } });
        archive.on('error', reject);
        archive.on('close', resolve);
        archive.pipe(reply.raw);
        for (const entry of jsonEntries) {
          archive.append(entry.content, { name: entry.name });
        }
        archive.finalize();
      });
    } catch (error) {
      console.error('JSON export error:', error);
      if (!reply.sent) {
        return reply.code(500).send({ error: 'Failed to export paysheets as JSON.' });
      }
    }
  });

  // POST /backup
  fastify.post('/backup', async (_request, reply) => {
    return reply.send({
      message: 'Google Drive backup feature requires OAuth2 setup. See README for configuration.',
      status: 'not_configured',
      instructions: [
        '1. Create a Google Cloud project',
        '2. Enable Google Drive API',
        '3. Create OAuth2 credentials',
        '4. Set environment variables: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET',
        '5. Complete the OAuth consent flow',
      ],
    });
  });
}
