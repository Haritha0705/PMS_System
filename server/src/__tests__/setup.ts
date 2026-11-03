/**
 * Global test setup — runs once before all test files.
 * Sets NODE_ENV to test so JWT secrets use dev fallbacks (not throw).
 */

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-vitest';
process.env.REFRESH_SECRET = 'test-refresh-secret-key-for-vitest';
process.env.DATABASE_URL = 'postgresql://test:test@localhost/test';