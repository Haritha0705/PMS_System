// Centralised environment configuration
// All env-var reads happen here; the rest of the app imports from this module.

function require_env(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required environment variable: ${key}`);
  return val;
}

export const ENV = {
  // ── Server ──────────────────────────────────────────────────
  PORT: Number(process.env.PORT) || 4500,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // ── Cache / Queue ────────────────────────────────────────────
  REDIS_URL: process.env.REDIS_URL || '',   // optional — in-memory fallback if not set

  // ── Database ─────────────────────────────────────────────────
  DATABASE_URL:
    process.env.DATABASE_URL ||
    'postgresql://neondb_owner:npg_3UeVGMk6lDEF@ep-delicate-water-ahwvsfhl-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',

  // ── Auth — secrets MUST be set via environment variables ─────
  // Never rely on these fallbacks in production. Set JWT_SECRET and
  // REFRESH_SECRET in your .env / deployment environment.
  JWT_SECRET:      process.env.JWT_SECRET      || (() => { if (process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET must be set in production'); return 'dev-jwt-secret-change-me'; })(),
  REFRESH_SECRET:  process.env.REFRESH_SECRET  || (() => { if (process.env.NODE_ENV === 'production') throw new Error('REFRESH_SECRET must be set in production'); return 'dev-refresh-secret-change-me'; })(),
  ACCESS_TOKEN_EXPIRY:  '1d',
  REFRESH_TOKEN_EXPIRY: '7d',

  // ── File paths ───────────────────────────────────────────────
  OUTPUT_DIR:  process.env.OUTPUT_DIR  || '',
  TEMP_DIR:    process.env.TEMP_DIR    || '',
  CLIENT_PATH: process.env.CLIENT_PATH || '',

  // ── CORS ─────────────────────────────────────────────────────
  // Prefer CORS_ORIGINS from the environment. The default list is a fallback
  // that includes local dev origins and the production frontend so the app
  // keeps working even if the env var is not set on the host (e.g. Render).
  ALLOWED_ORIGINS: (
    process.env.CORS_ORIGINS ||
    'http://localhost:5173,http://localhost:3000,https://pms-prestige-glamour-group-of-compa.vercel.app'
  )
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
} as const;