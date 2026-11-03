/**
 * Auth helpers — get a valid JWT by calling the login endpoint.
 * The dbStore and prisma mocks must be active when this is called.
 */

import type { FastifyInstance } from 'fastify';

export async function getAccessToken(app: FastifyInstance): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { username: 'admin', password: 'admin123' },
  });
  const body = JSON.parse(res.body);
  if (!body.accessToken) {
    throw new Error(`Login failed in test helper: ${res.body}`);
  }
  return body.accessToken as string;
}

export function authHeader(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}
