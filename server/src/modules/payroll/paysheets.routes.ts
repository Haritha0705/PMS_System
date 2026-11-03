import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import {
  dbGetAllUsers, dbGetUser,
  dbCreatePaysheet, dbCreateManyPaysheets, dbUpdatePaysheet, dbUpdatePaysheetStatus,
  dbDeletePaysheet, dbGetAllPaysheets, dbGetPaysheetsByMonth, dbGetPaysheet,
} from '../../services/dbStore';
import { cacheGet, cacheSet, cacheDel, cacheInvalidatePrefix, CK } from '../../services/cache';
import { MonthlyPaysheetDTO } from '../../models';
import {
  calculatePaysheet,
  getRoleConfig,
  isSalesRole,
  SALES_BASED_ROLES,
  NON_TARGET_ROLES,
  type PaysheetInput,
  type PaysheetResult,
  type SalesRoleConfig,
  type NonTargetRoleConfig,
} from '../../engine/salary-calculator';
import {
  calculatePaysheetSchema,
  createPaysheetSchema,
  updatePaysheetSchema,
  updatePaysheetStatusSchema,
  bulkCreatePaysheetSchema,
  listPaysheetsQuerySchema,
  monthPaysheetsQuerySchema,
} from '../../validation/paysheets';

// ── Shared helper ────────────────────────────────────────────

function buildPaysheetInput(
  roleCode: string,
  roleConfig: SalesRoleConfig | NonTargetRoleConfig,
  fields: {
    monthsOfService: number;
    achieve: number; allowance: number; otherOffer: number;
    nopay: number; lateHours: number; lateMinutes: number;
    welfare: number; epfAvailability: boolean;
    customEarningAmount: number; customDeductionAmount: number;
  }
): PaysheetInput {
  if (isSalesRole(roleCode)) {
    return {
      role: roleConfig, monthsOfService: fields.monthsOfService,
      achievementAmount: fields.achieve, generalAllowance: fields.allowance,
      otherOffer: fields.otherOffer, nopayDays: fields.nopay,
      lateHours: fields.lateHours, lateMinutes: fields.lateMinutes,
      others: fields.welfare, epfAvailability: fields.epfAvailability,
      customEarningAmount: fields.customEarningAmount,
      customDeductionAmount: fields.customDeductionAmount,
    };
  }
  return {
    role: roleConfig, monthsOfService: fields.monthsOfService,
    otherOffer: fields.otherOffer, nopayDays: fields.nopay,
    lateHours: fields.lateHours, lateMinutes: fields.lateMinutes,
    others: fields.welfare, epfAvailability: fields.epfAvailability,
    customEarningAmount: fields.customEarningAmount,
    customDeductionAmount: fields.customDeductionAmount,
  };
}

export default async function paysheetRoutes(fastify: FastifyInstance): Promise<void> {

  // POST /calculate — Preview without saving
  fastify.post<{ Body: unknown }>('/calculate', async (request, reply) => {
    try {
      const parsed = calculatePaysheetSchema.safeParse(request.body);
      if (!parsed.success) {
        const errors = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
        return reply.code(400).send({ error: errors[0], details: errors });
      }
      const d = parsed.data;

      const roleConfig = getRoleConfig(d.role);
      if (!roleConfig) return reply.code(400).send({ error: `Invalid role code: ${d.role}` });

      const input = buildPaysheetInput(d.role, roleConfig, {
        monthsOfService: d.monthsOfService,
        achieve: d.achieve, allowance: d.allowance, otherOffer: d.otherOffer,
        nopay: d.nopay, lateHours: d.lateHours, lateMinutes: d.lateMinutes,
        welfare: d.welfare, epfAvailability: d.epfAvailability,
        customEarningAmount: d.customEarningAmount, customDeductionAmount: d.customDeductionAmount,
      });

      const result: PaysheetResult = calculatePaysheet(input);
      return reply.send({ message: 'Paysheet calculation completed', calculation: result });
    } catch (error) {
      console.error('Error calculating paysheet:', error);
      return reply.code(500).send({ error: 'Failed to calculate paysheet' });
    }
  });

  // POST /bulk-create
  fastify.post<{ Body: unknown }>('/bulk-create', async (request, reply) => {
    try {
      const parsed = bulkCreatePaysheetSchema.safeParse(request.body);
      if (!parsed.success) {
        const errors = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
        return reply.code(400).send({ error: errors[0], details: errors });
      }
      const { codeNos, payMonth } = parsed.data;

      const allUsers = await dbGetAllUsers();
      const existingPaysheets = await dbGetPaysheetsByMonth(payMonth);
      const existingKeys = new Set(existingPaysheets.map((p) => p.codeNo));

      const nameToCode: Record<string, string> = {};
      for (const [code, name] of Object.entries(SALES_BASED_ROLES)) nameToCode[name as string] = code;
      for (const [code, name] of Object.entries(NON_TARGET_ROLES)) nameToCode[name as string] = code;

      const toInsert: MonthlyPaysheetDTO[] = [];
      const errors: string[] = [];
      const now = new Date().toISOString();

      for (const codeNo of codeNos) {
        if (existingKeys.has(codeNo)) continue;

        const user = allUsers.find((u) => u.codeNo === codeNo);
        if (!user) { errors.push(`User not found: ${codeNo}`); continue; }

        const roleName = user.role || user.designation || '';
        const roleCode = nameToCode[roleName] || roleName;
        const roleConfig = getRoleConfig(roleCode);
        if (!roleConfig) { errors.push(`Unknown role for ${codeNo}: ${roleName}`); continue; }

        const input = buildPaysheetInput(roleCode, roleConfig, {
          monthsOfService: 1, achieve: 0, allowance: 0, nopay: 0,
          lateHours: 0, lateMinutes: 0, welfare: 0, otherOffer: 0,
          epfAvailability: true, customEarningAmount: 0, customDeductionAmount: 0,
        });

        const calculated: PaysheetResult = calculatePaysheet(input);
        toInsert.push({
          id: uuidv4(), codeNo, payMonth, role: roleCode, monthsOfService: 1,
          achieve: 0, allowance: 0, nopay: 0, late: 0, lateHours: 0, lateMinutes: 0,
          epfAvailability: true, etfAvailability: true,
          customEarningName: '', customEarningAmount: 0,
          customDeductionName: '', customDeductionAmount: 0,
          ...calculated, welfare: 0, otherOffer: 0,
          status: 'active', createdAt: now, updatedAt: now,
        });
      }

      // Single batch INSERT instead of N individual inserts
      await dbCreateManyPaysheets(toInsert);
      await cacheInvalidatePrefix('paysheets:');
      return reply.send({ message: `Created ${toInsert.length} paysheet(s)`, created: toInsert.length, errors });
    } catch (error) {
      console.error('Error in bulk-create:', error);
      return reply.code(500).send({ error: 'Failed to bulk-create paysheets' });
    }
  });

  // GET /month/:payMonth
  fastify.get<{
    Params: { payMonth: string };
    Querystring: Record<string, string>;
  }>('/month/:payMonth', async (request, reply) => {
    try {
      const parsed = monthPaysheetsQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.issues[0].message });
      }
      const { search, status, branch, role, page, limit } = parsed.data;

      const cacheKey = CK.PAYSHEETS_MONTH(request.params.payMonth);
      const cachedSheets = await cacheGet<MonthlyPaysheetDTO[]>(cacheKey);
      let paysheets: MonthlyPaysheetDTO[];
      if (cachedSheets) {
        paysheets = cachedSheets;
      } else {
        paysheets = await dbGetPaysheetsByMonth(request.params.payMonth);
        await cacheSet(cacheKey, paysheets, 300); // 5 min
      }

      if (status && status !== 'all') {
        paysheets = paysheets.filter((p) => (p.status || 'active') === status);
      } else if (!status) {
        paysheets = paysheets.filter((p) => (p.status || 'active') === 'active');
      }
      if (search) {
        const q = search.toLowerCase();
        paysheets = paysheets.filter(
          (p) => p.codeNo.toLowerCase().includes(q) || p.role.toLowerCase().includes(q)
        );
      }
      if (role) paysheets = paysheets.filter((p) => p.role === role);
      if (branch) {
        const users = await dbGetAllUsers();
        const userMap = new Map(users.map((u) => [u.codeNo, u]));
        paysheets = paysheets.filter((p) => userMap.get(p.codeNo)?.branch === branch);
      }

      paysheets.sort((a, b) => a.codeNo.localeCompare(b.codeNo));
      const total = paysheets.length;
      const startIndex = (page - 1) * limit;

      return reply.send({
        paysheets: paysheets.slice(startIndex, startIndex + limit),
        total, page, totalPages: Math.ceil(total / limit),
        month: request.params.payMonth,
      });
    } catch (error) {
      console.error('Error fetching paysheets for month:', error);
      return reply.code(500).send({ error: 'Failed to fetch paysheets for month' });
    }
  });

  // POST /
  fastify.post<{ Body: unknown }>('/', async (request, reply) => {
    try {
      const parsed = createPaysheetSchema.safeParse(request.body);
      if (!parsed.success) {
        const errors = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
        return reply.code(400).send({ error: errors[0], details: errors });
      }
      const d = parsed.data;

      const roleConfig = getRoleConfig(d.role);
      if (!roleConfig) return reply.code(400).send({ error: `Invalid role code: ${d.role}` });

      const user = await dbGetUser(d.codeNo);
      if (!user) return reply.code(400).send({ error: `User not found: ${d.codeNo}` });

      const existing = await dbGetPaysheetsByMonth(d.payMonth);
      if (existing.find((p) => p.codeNo === d.codeNo)) {
        return reply.code(400).send({ error: `Paysheet already exists for ${d.codeNo} in ${d.payMonth}` });
      }

      const input = buildPaysheetInput(d.role, roleConfig, {
        monthsOfService: d.monthsOfService,
        achieve: d.achieve, allowance: d.allowance, otherOffer: d.otherOffer,
        nopay: d.nopay, lateHours: d.lateHours, lateMinutes: d.lateMinutes,
        welfare: d.welfare, epfAvailability: d.epfAvailability,
        customEarningAmount: d.customEarningAmount, customDeductionAmount: d.customDeductionAmount,
      });
      const calculated: PaysheetResult = calculatePaysheet(input);
      const now = new Date().toISOString();

      const newPaysheet: MonthlyPaysheetDTO = {
        id: uuidv4(), codeNo: d.codeNo, payMonth: d.payMonth,
        role: d.role, monthsOfService: d.monthsOfService,
        achieve: d.achieve, allowance: d.allowance,
        nopay: d.nopay, late: 0, lateHours: d.lateHours, lateMinutes: d.lateMinutes,
        epfAvailability: d.epfAvailability, etfAvailability: d.etfAvailability,
        customEarningName: d.customEarningName, customEarningAmount: d.customEarningAmount,
        customDeductionName: d.customDeductionName, customDeductionAmount: d.customDeductionAmount,
        ...calculated, welfare: d.welfare, otherOffer: d.otherOffer,
        status: 'active', createdAt: now, updatedAt: now,
      };

      await dbCreatePaysheet(newPaysheet);
      await cacheInvalidatePrefix('paysheets:');
      return reply.code(201).send({ message: 'Monthly paysheet created successfully', paysheet: newPaysheet });
    } catch (error) {
      console.error('Error creating paysheet:', error);
      return reply.code(500).send({ error: 'Failed to create monthly paysheet' });
    }
  });

  // GET /
  fastify.get<{ Querystring: Record<string, string> }>('/', async (request, reply) => {
    try {
      const parsed = listPaysheetsQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.issues[0].message });
      }
      const { codeNo, payMonth, role, search, status, page, limit } = parsed.data;

      const cachedAll = await cacheGet<MonthlyPaysheetDTO[]>(CK.PAYSHEETS_ALL);
      let paysheets: MonthlyPaysheetDTO[];
      if (cachedAll) {
        paysheets = cachedAll;
      } else {
        paysheets = await dbGetAllPaysheets();
        await cacheSet(CK.PAYSHEETS_ALL, paysheets, 300); // 5 min
      }

      if (status && status !== 'all') {
        paysheets = paysheets.filter((p) => (p.status || 'active') === status);
      } else if (!status) {
        paysheets = paysheets.filter((p) => (p.status || 'active') === 'active');
      }
      if (codeNo) paysheets = paysheets.filter((p) => p.codeNo === codeNo);
      if (payMonth) paysheets = paysheets.filter((p) => p.payMonth === payMonth);
      if (role) paysheets = paysheets.filter((p) => p.role === role);
      if (search) {
        const q = search.toLowerCase();
        paysheets = paysheets.filter(
          (p) => p.codeNo.toLowerCase().includes(q) || p.role.toLowerCase().includes(q)
        );
      }

      paysheets.sort((a, b) => {
        const monthDiff = b.payMonth.localeCompare(a.payMonth);
        return monthDiff !== 0 ? monthDiff : a.codeNo.localeCompare(b.codeNo);
      });

      const total = paysheets.length;
      const startIndex = (page - 1) * limit;

      return reply.send({
        paysheets: paysheets.slice(startIndex, startIndex + limit),
        total, page, totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      console.error('Error fetching paysheets:', error);
      return reply.code(500).send({ error: 'Failed to fetch monthly paysheets' });
    }
  });

  // GET /:id
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    try {
      const paysheet = await dbGetPaysheet(request.params.id);
      if (!paysheet) return reply.code(404).send({ error: 'Paysheet not found' });
      return reply.send({ paysheet });
    } catch (error) {
      console.error('Error fetching paysheet:', error);
      return reply.code(500).send({ error: 'Failed to fetch paysheet' });
    }
  });

  // PUT /:id
  fastify.put<{ Params: { id: string }; Body: unknown }>('/:id', async (request, reply) => {
    try {
      const existing = await dbGetPaysheet(request.params.id);
      if (!existing) return reply.code(404).send({ error: 'Paysheet not found' });

      const parsed = updatePaysheetSchema.safeParse(request.body);
      if (!parsed.success) {
        const errors = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
        return reply.code(400).send({ error: errors[0], details: errors });
      }
      const d = parsed.data;

      const roleConfig = getRoleConfig(existing.role);
      if (!roleConfig) return reply.code(400).send({ error: `Invalid role code: ${existing.role}` });

      const user = await dbGetUser(existing.codeNo);
      if (!user) return reply.code(400).send({ error: `User not found: ${existing.codeNo}` });

      const achieve          = d.achieve          ?? existing.achieve;
      const allowance        = d.allowance        ?? existing.allowance;
      const nopay            = d.nopay            ?? existing.nopay;
      const lateHours        = d.lateHours        ?? existing.lateHours;
      const lateMinutes      = d.lateMinutes      ?? existing.lateMinutes;
      const monthsOfService  = d.monthsOfService  ?? existing.monthsOfService;
      const welfare          = d.welfare          ?? existing.welfare;
      const otherOffer       = d.otherOffer       ?? existing.otherOffer;
      const epfAvailability  = d.epfAvailability  ?? existing.epfAvailability;
      const etfAvailability  = d.etfAvailability  ?? existing.etfAvailability;
      const customEarningName    = d.customEarningName    ?? existing.customEarningName    ?? '';
      const customEarningAmount  = d.customEarningAmount  ?? existing.customEarningAmount  ?? 0;
      const customDeductionName  = d.customDeductionName  ?? existing.customDeductionName  ?? '';
      const customDeductionAmount = d.customDeductionAmount ?? existing.customDeductionAmount ?? 0;

      const input = buildPaysheetInput(existing.role, roleConfig, {
        monthsOfService, achieve, allowance, otherOffer, nopay, lateHours, lateMinutes,
        welfare, epfAvailability, customEarningAmount, customDeductionAmount,
      });
      const calculated: PaysheetResult = calculatePaysheet(input);

      const updated: MonthlyPaysheetDTO = {
        ...existing, achieve, allowance, nopay, late: 0, lateHours, lateMinutes,
        epfAvailability, etfAvailability, monthsOfService,
        customEarningName, customEarningAmount, customDeductionName, customDeductionAmount,
        ...calculated, welfare, otherOffer,
        updatedAt: new Date().toISOString(),
      };

      await dbUpdatePaysheet(request.params.id, updated);
      await cacheInvalidatePrefix('paysheets:');
      return reply.send({ message: 'Paysheet updated successfully', paysheet: updated });
    } catch (error) {
      console.error('Error updating paysheet:', error);
      return reply.code(500).send({ error: 'Failed to update paysheet' });
    }
  });

  // PATCH /:id/status
  fastify.patch<{ Params: { id: string }; Body: unknown }>('/:id/status', async (request, reply) => {
    try {
      const parsed = updatePaysheetStatusSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.issues[0].message });
      }
      const { status } = parsed.data;

      const paysheet = await dbGetPaysheet(request.params.id);
      if (!paysheet) return reply.code(404).send({ error: 'Paysheet not found' });

      await dbUpdatePaysheetStatus(request.params.id, status);
      await cacheInvalidatePrefix('paysheets:');
      paysheet.status = status;
      paysheet.updatedAt = new Date().toISOString();

      const action = status === 'delete' ? 'deactivated' : 'activated';
      return reply.send({ message: `Paysheet ${action} successfully`, paysheet });
    } catch (error) {
      console.error('Error updating paysheet status:', error);
      return reply.code(500).send({ error: 'Failed to update paysheet status' });
    }
  });

  // DELETE /:id
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    try {
      const paysheet = await dbGetPaysheet(request.params.id);
      if (!paysheet) return reply.code(404).send({ error: 'Paysheet not found' });
      await dbDeletePaysheet(request.params.id);
      await cacheInvalidatePrefix('paysheets:');
      return reply.send({ message: 'Paysheet deleted successfully', paysheet });
    } catch (error) {
      console.error('Error deleting paysheet:', error);
      return reply.code(500).send({ error: 'Failed to delete paysheet' });
    }
  });
}
