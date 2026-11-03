/**
 * Seed script: Migrates existing JSON data into Neon PostgreSQL database.
 * Run: npx ts-node src/scripts/seed-db.ts
 */
try { require('dotenv/config'); } catch {}

import { initDatabase } from '../services/db';
import { readJSON, readSingleJSON } from '../services/jsonStore';
import {
  dbSaveAdmin, dbCreateUser, dbCreatePayroll, dbCreatePaysheet,
} from '../services/dbStore';
import { User, PayrollRecord, MonthlyPaysheetDTO, AdminCredentials } from '../models';

async function seed() {
  console.log('Initializing database tables...');
  await initDatabase();

  // 1. Seed admin
  console.log('Seeding admin...');
  const admin = readSingleJSON<AdminCredentials>('admin.json');
  if (admin) {
    await dbSaveAdmin(admin);
    console.log('  Admin seeded');
  }

  // 2. Seed users
  console.log('Seeding users...');
  const users = readJSON<User>('users.json');
  let userCount = 0;
  for (const user of users) {
    try {
      await dbCreateUser(user);
      userCount++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('duplicate') || msg.includes('already exists')) {
        console.log(`  Skipping duplicate user: ${user.codeNo}`);
      } else {
        console.error(`  Error seeding user ${user.codeNo}:`, msg);
      }
    }
  }
  console.log(`  ${userCount}/${users.length} users seeded`);

  // 3. Seed payroll records
  console.log('Seeding payroll records...');
  const payroll = readJSON<PayrollRecord>('payroll.json');
  let payrollCount = 0;
  for (const record of payroll) {
    try {
      await dbCreatePayroll(record);
      payrollCount++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('duplicate') || msg.includes('already exists')) {
        console.log(`  Skipping duplicate payroll: ${record.codeNo}/${record.period}`);
      } else {
        console.error(`  Error seeding payroll ${record.id}:`, msg);
      }
    }
  }
  console.log(`  ${payrollCount}/${payroll.length} payroll records seeded`);

  // 4. Seed monthly paysheets
  console.log('Seeding monthly paysheets...');
  const paysheets = readJSON<MonthlyPaysheetDTO>('monthly-paysheets.json');
  let paysheetCount = 0;
  for (const p of paysheets) {
    try {
      await dbCreatePaysheet(p);
      paysheetCount++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('duplicate') || msg.includes('already exists')) {
        console.log(`  Skipping duplicate paysheet: ${p.codeNo}/${p.payMonth}`);
      } else {
        console.error(`  Error seeding paysheet ${p.id}:`, msg);
      }
    }
  }
  console.log(`  ${paysheetCount}/${paysheets.length} paysheets seeded`);

  console.log('\nSeed completed successfully!');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
