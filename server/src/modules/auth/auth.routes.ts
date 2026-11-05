import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { dbGetAdmin, dbSaveAdmin } from '../../services/dbStore';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  storeRefreshHash,
  isRefreshTokenValid,
  revokeRefreshToken,
  revokeAllRefreshTokens,
  cleanupExpiredTokens,
  authMiddleware,
} from './auth.service';
import { AdminCredentials } from '../../models';
import { ENV } from '../../config/env';
import { loginSchema, refreshTokenSchema, changePasswordSchema } from '../../validation/auth';
import logger from '../../utils/logger';

// ── Rate limit ───────────────────────────────────────────────
// Off by default so refresh, /me and logout (used on every page load) never count.

export const authRateLimitOptions = {
  global: false,
  errorResponseBuilder: (_request: unknown, context: { statusCode: number }) => ({
    statusCode: context.statusCode,
    error: 'Too many attempts. Please try again in 15 minutes.',
  }),
};

const passwordRouteLimit = { rateLimit: { max: 5, timeWindow: '15 minutes' } };

// ── Initialize default admin on server startup ───────────────

export async function ensureAdmin(): Promise<void> {
  const admin = await dbGetAdmin();
  if (!admin) {
    if (!ENV.ADMIN_INITIAL_PASSWORD && ENV.NODE_ENV === 'production') {
      throw new Error('ADMIN_INITIAL_PASSWORD must be set to create the first admin in production');
    }
    const hashed = bcrypt.hashSync(ENV.ADMIN_INITIAL_PASSWORD || 'admin123', 10);
    const defaultAdmin: AdminCredentials = {
      username: 'admin',
      password: hashed,
      name: 'Super Admin',
      role: 'super_admin',
    };
    await dbSaveAdmin(defaultAdmin);
  }
}

export { authMiddleware as ensureAdmin_middleware };

export default async function authRoutes(fastify: FastifyInstance): Promise<void> {

  // POST /login
  fastify.post<{ Body: unknown }>('/login', { config: passwordRouteLimit }, async (request, reply) => {
    const ip = request.ip;
    try {
      const parsed = loginSchema.safeParse(request.body);
      if (!parsed.success) {
        logger.warn(`[auth] Invalid login payload from ${ip}: ${parsed.error.issues[0].message}`);
        return reply.code(400).send({ error: parsed.error.issues[0].message });
      }
      const { username, password } = parsed.data;

      const admin = await dbGetAdmin();
      if (!admin) {
        return reply.code(500).send({ error: 'Admin configuration not found.' });
      }

      if (username !== admin.username) {
        logger.warn(`[auth] Failed login — unknown username "${username}" from ${ip}`);
        return reply.code(401).send({ error: 'Invalid credentials.' });
      }

      const isMatch = bcrypt.compareSync(password, admin.password);
      if (!isMatch) {
        logger.warn(`[auth] Failed login — wrong password for "${username}" from ${ip}`);
        return reply.code(401).send({ error: 'Invalid credentials.' });
      }

      const tokenPayload = { username: admin.username, role: admin.role };
      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);
      await storeRefreshHash(refreshToken);
      cleanupExpiredTokens().catch((err) => logger.warn(`[auth] Token cleanup failed: ${err}`));

      logger.info(`[auth] Login success — "${username}" from ${ip}`);

      return reply.send({
        accessToken,
        refreshToken,
        user: { username: admin.username, name: admin.name, role: admin.role },
      });
    } catch (err) {
      logger.error(`[auth] Login error from ${ip}: ${err instanceof Error ? err.message : String(err)}`);
      return reply.code(500).send({ error: 'Login failed.' });
    }
  });

  // POST /refresh — rotate refresh token on each use
  fastify.post<{ Body: unknown }>('/refresh', async (request, reply) => {
    const ip = request.ip;
    try {
      const parsed = refreshTokenSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.issues[0].message });
      }
      const { refreshToken } = parsed.data;

      const isValid = await isRefreshTokenValid(refreshToken);
      if (!isValid) {
        logger.warn(`[auth] Invalid/expired refresh token used from ${ip}`);
        return reply.code(401).send({ error: 'Refresh token has been revoked or expired.' });
      }

      const decoded = verifyRefreshToken(refreshToken);

      // Token rotation — revoke old, issue new
      await revokeRefreshToken(refreshToken);
      const newRefreshToken = generateRefreshToken({ username: decoded.username, role: decoded.role });
      await storeRefreshHash(newRefreshToken);

      const accessToken = generateAccessToken({ username: decoded.username, role: decoded.role });

      logger.info(`[auth] Token refreshed for "${decoded.username}" from ${ip}`);

      return reply.send({ accessToken, refreshToken: newRefreshToken });
    } catch (err) {
      logger.warn(`[auth] Refresh token error from ${ip}: ${err instanceof Error ? err.message : String(err)}`);
      return reply.code(401).send({ error: 'Invalid or expired refresh token.' });
    }
  });

  // POST /logout
  fastify.post('/logout', async (request, reply) => {
    try {
      const parsed = refreshTokenSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.issues[0].message });
      }
      const { refreshToken } = parsed.data;

      await revokeRefreshToken(refreshToken);
      logger.info(`[auth] Logout from ${request.ip}`);
      return reply.send({ message: 'Logged out successfully.' });
    } catch {
      return reply.code(500).send({ error: 'Logout failed.' });
    }
  });

  // POST /change-password — protected; signs out every session on success
  fastify.post<{ Body: unknown }>(
    '/change-password',
    { preHandler: [authMiddleware], config: passwordRouteLimit },
    async (request, reply) => {
      try {
        const parsed = changePasswordSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.code(400).send({ error: parsed.error.issues[0].message });
        }
        const { currentPassword, newPassword } = parsed.data;

        const admin = await dbGetAdmin();
        if (!admin) {
          return reply.code(404).send({ error: 'Admin not found.' });
        }

        if (!(await bcrypt.compare(currentPassword, admin.password))) {
          logger.warn(`[auth] Change password failed — wrong current password from ${request.ip}`);
          return reply.code(400).send({ error: 'Current password is incorrect.' });
        }

        await dbSaveAdmin({ ...admin, password: await bcrypt.hash(newPassword, 10) });
        await revokeAllRefreshTokens();

        logger.info(`[auth] Password changed for "${admin.username}" from ${request.ip}`);
        return reply.send({ message: 'Password changed successfully.' });
      } catch (err) {
        logger.error(`[auth] Change password error: ${err instanceof Error ? err.message : String(err)}`);
        return reply.code(500).send({ error: 'Failed to change password.' });
      }
    }
  );

  // GET /me — protected
  fastify.get('/me', { preHandler: [authMiddleware] }, async (_request, reply) => {
    const admin = await dbGetAdmin();
    if (!admin) {
      return reply.code(404).send({ error: 'Admin not found.' });
    }
    return reply.send({ username: admin.username, name: admin.name, role: admin.role });
  });
}
