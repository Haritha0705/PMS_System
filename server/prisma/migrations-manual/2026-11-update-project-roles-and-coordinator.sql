-- ============================================================
-- One-time data migration: Prestige → Project role names, Coordinator — Nov 2026
-- ============================================================
-- Run LAST of the 2026-11 files (after 2026-11-sales-roles.sql), together with deploying the new code:
-- employees still on a "Prestige ..." role are not recognised by the new code.
--
--   users.role              stores the role LABEL — renamed here
--   users.designation       free text shown on pay sheets — renamed here when it holds an old name
--   monthly_paysheets.role  stores the role CODE (PGM, ...) — unchanged, nothing to do
--
-- Saved paysheet amounts are NOT changed.
--
--   psql "$DATABASE_URL" -f server/prisma/migrations-manual/2026-11-update-project-roles-and-coordinator.sql
-- ============================================================

BEGIN;

-- ── 1. Sales roles: role and designation ────────────────────────────────────
UPDATE users
SET role       = 'Project ' || substr(role, length('Prestige ') + 1),
    updated_at = NOW()
WHERE role IN ('Prestige General Manager', 'Prestige Assistant General Manager',
               'Prestige Provincial Head', 'Prestige Regional Manager', 'Prestige Manager');

UPDATE users
SET designation = 'Project ' || substr(designation, length('Prestige ') + 1),
    updated_at  = NOW()
WHERE designation IN ('Prestige General Manager', 'Prestige Assistant General Manager',
                      'Prestige Provincial Head', 'Prestige Regional Manager', 'Prestige Manager');

-- ── 2. Coordinator: employees kept on the old role get the new basic ────────
UPDATE users
SET basic_salary = 35000,
    allowances   = 0,
    updated_at   = NOW()
WHERE role = 'Coordinator';

COMMIT;
