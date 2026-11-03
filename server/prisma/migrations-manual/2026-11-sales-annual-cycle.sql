-- ============================================================
-- Schema migration: sales (Category A) annual-cycle columns — Nov 2026
-- ============================================================
-- Run this FIRST, before 2026-11-sales-roles.sql and before deploying the new code.
-- Safe to run more than once.
--
--   psql "$DATABASE_URL" -f server/prisma/migrations-manual/2026-11-sales-annual-cycle.sql
-- ============================================================

BEGIN;

-- Wider amounts: a PGM annual target is 8.1 billion (NUMERIC(12,2) tops out just under 10 billion)
ALTER TABLE monthly_paysheets ALTER COLUMN achieve         TYPE NUMERIC(15,2);
ALTER TABLE monthly_paysheets ALTER COLUMN assigned_target TYPE NUMERIC(15,2);

-- Annual-cycle values for each month (cycle = 0 means "no cycle data")
ALTER TABLE monthly_paysheets ADD COLUMN IF NOT EXISTS cycle                   INTEGER       DEFAULT 0 NOT NULL;
ALTER TABLE monthly_paysheets ADD COLUMN IF NOT EXISTS cycle_month             INTEGER       DEFAULT 0 NOT NULL;
ALTER TABLE monthly_paysheets ADD COLUMN IF NOT EXISTS prev_carry_forward      NUMERIC(15,2) DEFAULT 0 NOT NULL;
ALTER TABLE monthly_paysheets ADD COLUMN IF NOT EXISTS carry_forward           NUMERIC(15,2) DEFAULT 0 NOT NULL;
ALTER TABLE monthly_paysheets ADD COLUMN IF NOT EXISTS total_achieved          NUMERIC(15,2) DEFAULT 0 NOT NULL;
ALTER TABLE monthly_paysheets ADD COLUMN IF NOT EXISTS total_salary_paid       NUMERIC(15,2) DEFAULT 0 NOT NULL;
ALTER TABLE monthly_paysheets ADD COLUMN IF NOT EXISTS remaining_target        NUMERIC(15,2) DEFAULT 0 NOT NULL;
ALTER TABLE monthly_paysheets ADD COLUMN IF NOT EXISTS remaining_salary        NUMERIC(15,2) DEFAULT 0 NOT NULL;
ALTER TABLE monthly_paysheets ADD COLUMN IF NOT EXISTS annual_target_completed BOOLEAN       DEFAULT false NOT NULL;

COMMIT;
