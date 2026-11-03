-- ============================================================
-- One-time data migration: sales (Category A) roles — Nov 2026
-- ============================================================
-- Run AFTER 2026-11-sales-annual-cycle.sql.
--
--   users.role              stores the role LABEL
--   monthly_paysheets.role  stores the role CODE
--
-- Old paysheets keep their saved amounts. Their cycle columns stay 0, so each
-- employee's first paysheet under the new system starts a fresh annual cycle.
--
-- Deputy Provincial Head (DPH), Senior Regional Manager (SRM) and
-- Business Development Executive (BDE) have no new equivalent and are left
-- untouched; the SELECTs at the bottom list them so HR can reassign them.
--
--   psql "$DATABASE_URL" -f server/prisma/migrations-manual/2026-11-sales-roles.sql
-- ============================================================

BEGIN;

-- ── 1. Employees: old label → new label, new monthly salary, no fixed allowance ──
UPDATE users AS u
SET role         = m.new_label,
    basic_salary = m.monthly_salary,
    allowances   = 0,
    updated_at   = NOW()
FROM (VALUES
  ('General Manager',           'Prestige General Manager',           700000),
  ('Assistant General Manager', 'Prestige Assistant General Manager', 625000),
  ('Provincial Head',           'Prestige Provincial Head',           550000),
  ('Regional Manager',          'Prestige Regional Manager',          350000),
  ('Branch Manager',            'Prestige Manager',                   150000)
) AS m(old_label, new_label, monthly_salary)
WHERE u.role = m.old_label;

-- ── 2. Paysheets: old code → new code (amounts unchanged) ───────────────────
UPDATE monthly_paysheets AS p
SET role       = m.new_code,
    updated_at = NOW()
FROM (VALUES
  ('GM',  'PGM'),
  ('AGM', 'PAGM'),
  ('PH',  'PPH'),
  ('RM',  'PRM'),
  ('BM',  'PM')
) AS m(old_code, new_code)
WHERE p.role = m.old_code;

COMMIT;

-- ── 3. Left over: no new equivalent — HR must reassign ──────────────────────
SELECT code_no, first_name, last_name, role, status
FROM users
WHERE role IN ('Deputy Provincial Head', 'Senior Regional Manager', 'Business Development Executive')
ORDER BY role, code_no;

SELECT role, COUNT(*) AS paysheets
FROM monthly_paysheets
WHERE role IN ('DPH', 'SRM', 'BDE')
GROUP BY role;
