import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { faker } from '@faker-js/faker';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Initialize Prisma with Neon adapter
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const adapter = new PrismaNeon({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

const BATCH_SIZE = 1000;
const BRANCHES = ['Colombo', 'Kandy', 'Jaffna', 'Galle', 'Matara'];
const ROLES = ['Sales Executive', 'Manager', 'Senior Manager', 'Coordinator', 'Assistant', 'Director'];
const DESIGNATIONS = ['Sales Executive', 'Team Lead', 'Manager', 'Senior Manager', 'Executive', 'Coordinator'];

async function generateMockUsers() {
  console.log(`Generating ${BATCH_SIZE} mock users...`);

  const users = [];
  for (let i = 0; i < BATCH_SIZE; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();

    users.push({
      codeNo: `EMP-${String(i + 1).padStart(5, '0')}`,
      firstName: firstName,
      lastName: lastName,
      email: faker.internet.email({ firstName, lastName }).toLowerCase(),
      phone: `+94 7${String(faker.number.int({ min: 0, max: 9 })).repeat(2)} ${String(faker.number.int({ min: 100000, max: 999999 }))}`,
      branch: faker.helpers.arrayElement(BRANCHES),
      role: faker.helpers.arrayElement(ROLES),
      designation: faker.helpers.arrayElement(DESIGNATIONS),
      joinDate: faker.date.past({ years: 5 }).toISOString().split('T')[0],
      bankAccount: faker.string.numeric(10),
      bankName: faker.company.name() + ' Bank',
      basicSalary: parseFloat((Math.random() * (150000 - 30000) + 30000).toFixed(2)),
      allowances: parseFloat((Math.random() * 50000).toFixed(2)),
      deductions: parseFloat((Math.random() * 20000).toFixed(2)),
      status: faker.helpers.arrayElement(['active', 'inactive', 'on_leave']),
    });
  }

  // Create users in batches
  for (let i = 0; i < users.length; i += 50) {
    const batch = users.slice(i, i + 50);
    await prisma.user.createMany({
      data: batch,
      skipDuplicates: true,
    });
    console.log(`✓ Created users ${i + 1} to ${Math.min(i + 50, users.length)}`);
  }

  return users;
}

async function generateMockPaysheets(users: any[]) {
  console.log(`Generating paysheets for ${users.length} users...`);

  const paysheets = [];
  const currentMonth = '2026-04'; // April 2026

  for (const user of users) {
    const payMonth = currentMonth;

    // Calculate months of service
    const joinDate = new Date(user.joinDate);
    const currentDate = new Date('2026-04-11');
    const monthsOfService = Math.floor(
      (currentDate.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
    );

    const basicSalary = parseFloat(user.basicSalary.toString());
    const achieve = parseFloat((Math.random() * 100000).toFixed(2));
    const allowance = parseFloat((Math.random() * 25000).toFixed(2));
    const nopay = parseFloat((Math.random() * 3).toFixed(2));
    const late = parseFloat((Math.random() * 2).toFixed(2));

    const grossSalary = basicSalary + achieve + allowance;
    const nopayDeduction = (basicSalary / 30) * nopay;
    const lateDeduction = (basicSalary / 30 / 8) * faker.number.int({ min: 0, max: 8 });

    const epfEmployee = grossSalary * 0.08;
    const epfEmployer = grossSalary * 0.12;
    const etf = grossSalary * 0.03;

    const subTotal = grossSalary - nopayDeduction - lateDeduction;
    const netSalary = subTotal - epfEmployee - etf;

    paysheets.push({
      id: uuidv4(),
      codeNo: user.codeNo,
      payMonth: payMonth,
      role: user.role,
      monthsOfService: Math.max(0, monthsOfService),
      achieve: achieve,
      allowance: allowance,
      nopay: nopay,
      late: late,
      lateHours: faker.number.int({ min: 0, max: 8 }),
      lateMinutes: faker.number.int({ min: 0, max: 59 }),
      epfAvailability: faker.datatype.boolean(0.9),
      etfAvailability: faker.datatype.boolean(0.9),
      welfare: parseFloat((Math.random() * 10000).toFixed(2)),
      otherOffer: parseFloat((Math.random() * 5000).toFixed(2)),
      customEarningName: '',
      customEarningAmount: 0,
      customDeductionName: '',
      customDeductionAmount: 0,
      basicSalary: basicSalary,
      achievedSalary: basicSalary * (1 + achieve / 100),
      assignedTarget: parseFloat((Math.random() * (5000000 - 500000) + 500000).toFixed(2)),
      achievementPct: parseFloat((Math.random() * (150 - 30) + 30).toFixed(2)),
      grossSalary: grossSalary,
      vehicleAllowance: parseFloat((Math.random() * 10000).toFixed(2)),
      fuelAllowance: parseFloat((Math.random() * 5000).toFixed(2)),
      generalAllowance: parseFloat((Math.random() * 10000).toFixed(2)),
      orc: parseFloat((Math.random() * 5000).toFixed(2)),
      subTotal: subTotal,
      nopayDeduction: nopayDeduction,
      lateDeduction: lateDeduction,
      epfEmployee: epfEmployee,
      epfEmployer: epfEmployer,
      etf: etf,
      netSalary: Math.max(0, netSalary),
      status: faker.helpers.arrayElement(['draft', 'active', 'finalized']),
    });
  }

  // Create paysheets in batches
  for (let i = 0; i < paysheets.length; i += 50) {
    const batch = paysheets.slice(i, i + 50);
    await prisma.monthlyPaysheet.createMany({
      data: batch,
      skipDuplicates: true,
    });
    console.log(`✓ Created paysheets ${i + 1} to ${Math.min(i + 50, paysheets.length)}`);
  }
}

async function main() {
  try {
    console.log('🌱 Starting mock data generation...\n');

    // Generate and create users
    const users = await generateMockUsers();
    console.log(`✅ Successfully created ${users.length} users\n`);

    // Generate and create paysheets
    await generateMockPaysheets(users);
    console.log(`✅ Successfully created paysheets for ${users.length} users\n`);

    console.log('🎉 Mock data generation completed successfully!');
  } catch (error) {
    console.error('Error generating mock data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

