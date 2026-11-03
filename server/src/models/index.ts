export interface User {
  codeNo: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  branch: string;
  role: string;
  designation: string;
  joinDate: string;
  bankAccount: string;
  bankName: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  status: 'active' | 'delete';
  createdAt: string;
  updatedAt: string;
}

export interface PayrollRecord {
  id: string;
  codeNo: string;
  userName: string;
  period: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  tax: number;
  grossSalary: number;
  netSalary: number;
  branch: string;
  designation: string;
  generatedAt: string;
}

export interface MonthlyPaysheetDTO {
  id?: string;
  codeNo: string;
  payMonth: string;
  role: string;
  monthsOfService: number;

  // Input fields
  achieve: number;
  allowance: number;
  nopay: number;
  late: number;
  lateHours: number;
  lateMinutes: number;
  epfAvailability: boolean;
  etfAvailability: boolean;
  welfare: number;
  otherOffer: number;
  customEarningName: string;
  customEarningAmount: number;
  customDeductionName: string;
  customDeductionAmount: number;

  // Calculated results
  basicSalary?: number;
  achievedSalary?: number;
  assignedTarget?: number;
  achievementPct?: number;
  grossSalary?: number;
  vehicleAllowance?: number;
  fuelAllowance?: number;
  generalAllowance?: number;
  orc?: number;
  subTotal?: number;
  nopayDeduction?: number;
  lateDeduction?: number;
  epfEmployee?: number;
  epfEmployer?: number;
  etf?: number;
  netSalary?: number;

  // Status
  status?: 'active' | 'delete';

  // Metadata
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminCredentials {
  username: string;
  password: string;
  name: string;
  role: string;
}

export interface AuthPayload {
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}
