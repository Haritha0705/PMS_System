import { FastifyInstance } from 'fastify';
import { User } from '../../models';
import { getAllUsers, getUser, createUser, updateUser, deleteUser } from './users.service';
import { createUserSchema, updateUserSchema, listUsersQuerySchema } from '../../validation/users';

export default async function userRoutes(fastify: FastifyInstance): Promise<void> {

  // GET / — List all users with search, filter, sort, pagination
  fastify.get<{ Querystring: Record<string, string> }>('/', async (request, reply) => {
    try {
      const parsed = listUsersQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.issues[0].message });
      }
      const { search, branch, role, status, sortBy, sortOrder, page: pageNum, limit: limitNum } = parsed.data;

      const allUsers = await getAllUsers();
      let users = [...allUsers];

      if (search) {
        const q = search.toLowerCase();
        users = users.filter(
          (u) =>
            u.codeNo.toLowerCase().includes(q) ||
            u.firstName.toLowerCase().includes(q) ||
            u.lastName.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q) ||
            u.branch.toLowerCase().includes(q) ||
            u.role.toLowerCase().includes(q) ||
            u.designation.toLowerCase().includes(q)
        );
      }

      if (branch && branch !== 'all') users = users.filter((u) => u.branch.toLowerCase() === branch.toLowerCase());
      if (role && role !== 'all') users = users.filter((u) => u.role.toLowerCase() === role.toLowerCase());
      if (status && status !== 'all') users = users.filter((u) => u.status === status);

      const total = users.length;

      const sortField = sortBy || 'createdAt';
      const order = sortOrder || 'desc';
      users.sort((a, b) => {
        const aVal = (a as unknown as Record<string, unknown>)[sortField];
        const bVal = (b as unknown as Record<string, unknown>)[sortField];
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return order === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        return order === 'asc' ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
      });

      const startIndex = (pageNum - 1) * limitNum;
      const paginatedUsers = users.slice(startIndex, startIndex + limitNum);

      const branches = [...new Set(allUsers.map((u) => u.branch).filter(Boolean))];
      const roles = [...new Set(allUsers.map((u) => u.role).filter(Boolean))];

      return reply.send({
        users: paginatedUsers, total, page: pageNum,
        totalPages: Math.ceil(total / limitNum), branches, roles,
      });
    } catch {
      return reply.code(500).send({ error: 'Failed to fetch users.' });
    }
  });

  // GET /stats
  fastify.get('/stats', async (_request, reply) => {
    try {
      const users = await getAllUsers();
      const active = users.filter((u) => u.status === 'active').length;
      const deleted = users.filter((u) => u.status === 'delete').length;
      const branches = [...new Set(users.map((u) => u.branch).filter(Boolean))];
      const totalSalary = users
        .filter((u) => u.status === 'active')
        .reduce((sum, u) => sum + u.basicSalary + u.allowances - u.deductions, 0);

      return reply.send({
        totalUsers: users.length, activeUsers: active, deletedUsers: deleted,
        totalBranches: branches.length, branches, totalMonthlySalary: totalSalary,
      });
    } catch {
      return reply.code(500).send({ error: 'Failed to fetch stats.' });
    }
  });

  // GET /:codeNo
  fastify.get<{ Params: { codeNo: string } }>('/:codeNo', async (request, reply) => {
    try {
      const user = await getUser(request.params.codeNo);
      if (!user) return reply.code(404).send({ error: 'User not found.' });
      return reply.send(user);
    } catch {
      return reply.code(500).send({ error: 'Failed to fetch user.' });
    }
  });

  // POST /
  fastify.post<{ Body: unknown }>('/', async (request, reply) => {
    try {
      const parsed = createUserSchema.safeParse(request.body);
      if (!parsed.success) {
        const errors = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
        return reply.code(400).send({ error: errors[0], details: errors });
      }
      const data = parsed.data;

      if (await getUser(data.codeNo)) {
        return reply.code(409).send({ error: 'A user with this CodeNo already exists.' });
      }

      const allUsers = await getAllUsers();
      if (allUsers.find((u) => u.email && u.email.toLowerCase() === data.email.toLowerCase())) {
        return reply.code(409).send({ error: 'A user with this email already exists.' });
      }

      const now = new Date().toISOString();
      const newUser: User = {
        ...data,
        joinDate: data.joinDate || now.split('T')[0],
        createdAt: now,
        updatedAt: now,
      };

      await createUser(newUser);
      return reply.code(201).send(newUser);
    } catch {
      return reply.code(500).send({ error: 'Failed to create user.' });
    }
  });

  // PUT /:codeNo
  fastify.put<{ Params: { codeNo: string }; Body: unknown }>('/:codeNo', async (request, reply) => {
    try {
      const parsed = updateUserSchema.safeParse(request.body);
      if (!parsed.success) {
        const errors = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
        return reply.code(400).send({ error: errors[0], details: errors });
      }
      const data = parsed.data;

      const existing = await getUser(request.params.codeNo);
      if (!existing) return reply.code(404).send({ error: 'User not found.' });

      if (data.email) {
        const allUsers = await getAllUsers();
        const duplicate = allUsers.find(
          (u) => u.email.toLowerCase() === data.email!.toLowerCase() && u.codeNo !== request.params.codeNo
        );
        if (duplicate) return reply.code(409).send({ error: 'A user with this email already exists.' });
      }

      const updatedUser: User = {
        ...existing,
        ...data,
        codeNo: existing.codeNo,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString(),
      };

      await updateUser(request.params.codeNo, updatedUser);
      return reply.send(updatedUser);
    } catch {
      return reply.code(500).send({ error: 'Failed to update user.' });
    }
  });

  // DELETE /:codeNo
  fastify.delete<{ Params: { codeNo: string } }>('/:codeNo', async (request, reply) => {
    try {
      const existing = await getUser(request.params.codeNo);
      if (!existing) return reply.code(404).send({ error: 'User not found.' });
      await deleteUser(request.params.codeNo);
      return reply.send({ message: 'User deleted successfully.', user: existing });
    } catch {
      return reply.code(500).send({ error: 'Failed to delete user.' });
    }
  });
}
