// Centralised environment configuration
// All env-var reads happen here; the rest of the app imports from this module.

export const ENV = {
  // ── Server ──────────────────────────────────────────────────
  PORT: Number(process.env.PORT) || 4500,
  // The desktop app sets 127.0.0.1 so other computers on the network cannot reach it
  HOST: process.env.HOST || '0.0.0.0',
  NODE_ENV: process.env.NODE_ENV || 'development',

  // ── Cache / Queue ────────────────────────────────────────────
  REDIS_URL: process.env.REDIS_URL || '',   // optional — in-memory fallback if not set

  // ── Database ─────────────────────────────────────────────────
  // Set it in .env / the hosting settings. Never write the real value in code.
  DATABASE_URL: process.env.DATABASE_URL || '',

  // ── Proxy ────────────────────────────────────────────────────
  // How many proxies sit in front of the server, so request.ip is the real
  // visitor. Too low: all visitors share one login rate limit.
  TRUST_PROXY_HOPS: process.env.TRUST_PROXY_HOPS
    ? Number(process.env.TRUST_PROXY_HOPS)
    : process.env.NODE_ENV === 'production' ? 1 : 0,

  // ── Printing ─────────────────────────────────────────────────
  // Printing goes to the printer attached to the server, so it is off on hosted servers.
  SERVER_PRINT_ENABLED: process.env.SERVER_PRINT_ENABLED
    ? process.env.SERVER_PRINT_ENABLED === 'true'
    : process.env.NODE_ENV !== 'production',

  // ── First admin ──────────────────────────────────────────────
  // Password for the admin created on an empty database. Required in production.
  ADMIN_INITIAL_PASSWORD: process.env.ADMIN_INITIAL_PASSWORD || '',

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