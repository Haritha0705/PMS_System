import { neon, neonConfig, NeonQueryFunction } from '@neondatabase/serverless';
import ws from 'ws';
import logger from '../utils/logger';

neonConfig.webSocketConstructor = ws;

let sql: NeonQueryFunction<false, false> | null = null;

export function getDb(): NeonQueryFunction<false, false> {
  if (!sql) {
    const dbUrl = 'postgresql://neondb_owner:npg_3UeVGMk6lDEF@ep-delicate-water-ahwvsfhl-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
    if (!dbUrl) {
      throw new Error('DATABASE_URL environment variable is not set. A database connection is required.');
    }
    sql = neon(dbUrl);
  }
  return sql;
}

export async function initDatabase(): Promise<void> {
  const db = getDb();

  await db`
    CREATE TABLE IF NOT EXISTS admin (
      id SERIAL PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name VARCHAR(200) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'super_admin'
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS users (
      code_no VARCHAR(50) PRIMARY KEY,
      first_name VARCHAR(200) NOT NULL,
      last_name VARCHAR(200) NOT NULL,
      email VARCHAR(300) UNIQUE NOT NULL,
      phone VARCHAR(50) DEFAULT '',
      branch VARCHAR(200) DEFAULT '',
      role VARCHAR(100) DEFAULT '',
      designation VARCHAR(200) DEFAULT '',
      join_date VARCHAR(20) DEFAULT '',
      bank_account VARCHAR(100) DEFAULT '',
      bank_name VARCHAR(200) DEFAULT '',
      basic_salary NUMERIC(12,2) DEFAULT 0,
      allowances NUMERIC(12,2) DEFAULT 0,
      deductions NUMERIC(12,2) DEFAULT 0,
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS payroll_records (
      id VARCHAR(100) PRIMARY KEY,
      code_no VARCHAR(50) NOT NULL REFERENCES users(code_no) ON DELETE CASCADE,
      user_name VARCHAR(400) NOT NULL,
      period VARCHAR(20) NOT NULL,
      basic_salary NUMERIC(12,2) DEFAULT 0,
      allowances NUMERIC(12,2) DEFAULT 0,
      deductions NUMERIC(12,2) DEFAULT 0,
      tax NUMERIC(12,2) DEFAULT 0,
      gross_salary NUMERIC(12,2) DEFAULT 0,
      net_salary NUMERIC(12,2) DEFAULT 0,
      branch VARCHAR(200) DEFAULT '',
      designation VARCHAR(200) DEFAULT '',
      generated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(code_no, period)
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS monthly_paysheets (
      id VARCHAR(100) PRIMARY KEY,
      code_no VARCHAR(50) NOT NULL REFERENCES users(code_no) ON DELETE CASCADE,
      pay_month VARCHAR(10) NOT NULL,
      role VARCHAR(100) NOT NULL,
      months_of_service INTEGER DEFAULT 0,

      achieve NUMERIC(12,2) DEFAULT 0,
      allowance NUMERIC(12,2) DEFAULT 0,
      nopay NUMERIC(6,2) DEFAULT 0,
      late NUMERIC(6,2) DEFAULT 0,
      late_hours INTEGER DEFAULT 0,
      late_minutes INTEGER DEFAULT 0,
      epf_availability BOOLEAN DEFAULT true,
      etf_availability BOOLEAN DEFAULT true,
      welfare NUMERIC(12,2) DEFAULT 0,
      other_offer NUMERIC(12,2) DEFAULT 0,
      custom_earning_name VARCHAR(200) DEFAULT '',
      custom_earning_amount NUMERIC(12,2) DEFAULT 0,
      custom_deduction_name VARCHAR(200) DEFAULT '',
      custom_deduction_amount NUMERIC(12,2) DEFAULT 0,

      basic_salary NUMERIC(12,2) DEFAULT 0,
      achieved_salary NUMERIC(12,2) DEFAULT 0,
      assigned_target NUMERIC(12,2) DEFAULT 0,
      achievement_pct NUMERIC(8,4) DEFAULT 0,
      gross_salary NUMERIC(12,2) DEFAULT 0,
      vehicle_allowance NUMERIC(12,2) DEFAULT 0,
      fuel_allowance NUMERIC(12,2) DEFAULT 0,
      general_allowance NUMERIC(12,2) DEFAULT 0,
      orc NUMERIC(12,2) DEFAULT 0,
      sub_total NUMERIC(12,2) DEFAULT 0,
      nopay_deduction NUMERIC(12,2) DEFAULT 0,
      late_deduction NUMERIC(12,2) DEFAULT 0,
      epf_employee NUMERIC(12,2) DEFAULT 0,
      epf_employer NUMERIC(12,2) DEFAULT 0,
      etf NUMERIC(12,2) DEFAULT 0,
      net_salary NUMERIC(12,2) DEFAULT 0,

      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(code_no, pay_month)
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS refresh_tokens(
       id SERIAL PRIMARY KEY,
       hash TEXT NOT NULL,
       created_at TIMESTAMPTZ DEFAULT NOW(),
       expires_at TIMESTAMPTZ NOT NULL
    )
  `;

  logger.info('Database tables initialized successfully');
}
