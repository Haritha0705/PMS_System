-- ============================================================
-- One-time data migration: Non-Target (Category B) roles — Nov 2026
-- ============================================================
-- Moves employees and paysheets from the old Category B role list to the new one.
--
--   users.role              stores the role LABEL (e.g. 'Admin Manager')
--   monthly_paysheets.role  stores the role CODE  (e.g. 'ADMIN_MANAGER')
--
-- Saved paysheet amounts are NOT changed. A paysheet is only recalculated
-- (at the new rates) if someone edits it after this migration.
--
-- Roles with no match in the new list (CCI, HR & Finance Head,
-- Senior Executive – Finance, Coordinator) are left untouched; the SELECT
-- at the bottom lists those employees so HR can reassign them by hand.
--
-- Review first, then run against the database (PostgreSQL), e.g.:
--   psql "$DATABASE_URL" -f server/prisma/migrations-manual/2026-11-update-non-target-roles.sql
-- ============================================================

BEGIN;

-- ── 1. Employees: old label → new label, new basic + allowance ──────────────
UPDATE users AS u
SET role         = m.new_label,
    basic_salary = m.basic,
    allowances   = m.allowance,
    updated_at   = NOW()
FROM (VALUES
  ('Manager Admin',               'Admin Manager',               75000,  5000),
  ('Senior Executive – HR',       'Senior Executive HR',         42500, 15000),
  ('Assistant HR Executive',      'Executive Assistant HR',      35000,  5000),
  ('Assistant Finance Executive', 'Executive Assistant Finance', 35000,     0),
  ('Micro Finance Manager',       'Head of Micro Finance',       80000, 50000),
  ('Micro Finance Executive',     'Executive Micro Finance 1',   35000,  5000),
  ('Legal Officer',               'Legal Manager',               75000,     0),
  ('Gemologist',                  'Gemologist',                 200000,180000)
) AS m(old_label, new_label, basic, allowance)
WHERE u.role = m.old_label;

-- ── 2. Paysheets: old code → new code (amounts unchanged) ───────────────────
UPDATE monthly_paysheets AS p
SET role       = m.new_code,
    updated_at = NOW()
FROM (VALUES
  ('MANAGER_ADMIN',     'ADMIN_MANAGER'),
  ('ASST_HR_EXEC',      'EXEC_ASST_HR'),
  ('ASST_FIN_EXEC',     'EXEC_ASST_FIN'),
  ('MICRO_FIN_MANAGER', 'HEAD_MICRO_FIN'),
  ('MICRO_FIN_EXEC',    'EXEC_MICRO_FIN_1'),
  ('LEGAL_OFFICER',     'LEGAL_MANAGER')
  -- SR_EXEC_HR and GEMO keep the same code.
) AS m(old_code, new_code)
WHERE p.role = m.old_code;

COMMIT;

-- ── 3. Left over: employees / paysheets on roles with no new equivalent ─────
SELECT code_no, first_name, last_name, role, status
FROM users
WHERE role IN ('CCI (Collections/Call Center)', 'HR & Finance Head',
               'Senior Executive – Finance', 'Coordinator')
ORDER BY role, code_no;

SELECT role, COUNT(*) AS paysheets
FROM monthly_paysheets
WHERE role IN ('CCI', 'HR_FIN_HEAD', 'SR_EXEC_FINANCE', 'COORD')
GROUP BY role;
