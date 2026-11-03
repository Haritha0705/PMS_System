/**
 * Auth service — token generation, verification, and refresh-token management.
 * Extracted from middleware/auth.ts so route handlers have a clean import target.
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthPayload } from '../../models';
import { ENV } from '../../config/env';
import { getPrisma } from '../../plugins/prisma';
import logger from '../../utils/logger';

// ── Fastify request augmentation ─────────────────────────────
declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthPayload;
  }
}

// ── Token generation ─────────────────────────────────────────

export function generateAccessToken(payload: Omit<AuthPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: ENV.ACCESS_TOKEN_EXPIRY });
}

export function generateRefreshToken(payload: Omit<AuthPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, ENV.REFRESH_SECRET, { expiresIn: ENV.REFRESH_TOKEN_EXPIRY });
}

export function verifyRefreshToken(token: string): AuthPayload {
  return jwt.verify(token, ENV.REFRESH_SECRET) as AuthPayload;
}

// ── Refresh token hash store (database-backed) ──────────

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Calculate token expiration time based on REFRESH_TOKEN_EXPIRY
 * Assumes format like "7d", "24h", etc.
 */
function calculateExpiresAt(): Date {
  const expiryStr = ENV.REFRESH_TOKEN_EXPIRY;
  const now = new Date();

  const match = expiryStr.match(/^(\d+)([dhms])$/);
  if (!match) {
    // Fallback to 7 days if format is unexpected
    now.setDate(now.getDate() + 7);
    return now;
  }

  const [, value, unit] = match;
  const num = parseInt(value, 10);

  switch (unit) {
    case 'd':
      now.setDate(now.getDate() + num);
      break;
    case 'h':
      now.setHours(now.getHours() + num);
      break;
    case 'm':
      now.setMinutes(now.getMinutes() + num);
      break;
    case 's':
      now.setSeconds(now.getSeconds() + num);
      break;
  }

  return now;
}

export async function storeRefreshHash(token: string): Promise<void> {
  const prisma = getPrisma();
  const hash = hashToken(token);
  const expiresAt = calculateExpiresAt();
  await prisma.refreshToken.create({ data: { hash, expiresAt } });
}

export async function isRefreshTokenValid(token: string): Promise<boolean> {
  const prisma = getPrisma();
  const hash = hashToken(token);
  const row = await prisma.refreshToken.findFirst({
    where: { hash, expiresAt: { gt: new Date() } },
    select: { id: true },
  });
  return row !== null;
}

export async function revokeRefreshToken(token?: string): Promise<void> {
  const prisma = getPrisma();
  if (token) {
    const hash = hashToken(token);
    await prisma.refreshToken.deleteMany({ where: { hash } });
  } else {
    await prisma.refreshToken.deleteMany({ where: { expiresAt: { lte: new Date() } } });
  }
}

export async function cleanupExpiredTokens(): Promise<void> {
  const prisma = getPrisma();
  await prisma.refreshToken.deleteMany({ where: { expiresAt: { lte: new Date() } } });
}

// ── Fastify preHandler middleware ─────────────────────────────

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization;
  const ip = request.ip;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn(`[auth] 401 No token — ${request.method} ${request.url} from ${ip}`);
    return reply.code(401).send({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as AuthPayload;

    if (decoded.role !== 'super_admin') {
      logger.warn(`[auth] 403 Forbidden — role "${decoded.role}" for ${request.method} ${request.url} from ${ip}`);
      return reply.code(403).send({ error: 'Forbidden. This application is strictly restricted to Super Admin access only.' });
    }

    request.user = decoded;
  } catch (err) {
    logger.warn(`[auth] 401 Invalid token — ${request.method} ${request.url} from ${ip}: ${err instanceof Error ? err.message : String(err)}`);
    return reply.code(401).send({ error: 'Invalid or expired token.' });
  }
}
