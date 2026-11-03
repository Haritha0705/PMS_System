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
  netSalary: number;
  grossSalary: number;
  generatedAt: string;
  branch: string;
  designation: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    username: string;
    name: string;
    role: string;
  };
}

export interface UsersResponse {
  users: User[];
  total: number;
  page: number;
  totalPages: number;
  branches: string[];
  roles: string[];
}

export interface StatsResponse {
  totalUsers: number;
  activeUsers: number;
  deletedUsers: number;
  totalBranches: number;
  branches: string[];
  totalMonthlySalary: number;
}

export interface PayrollResponse {
  message: string;
  records: PayrollRecord[];
}

export interface PayrollHistoryResponse {
  records: PayrollRecord[];
  total: number;
}

export interface MonthlyPaysheet {
  id?: string;
  codeNo: string;
  payMonth: string;
  role: string;
  monthsOfService: number;

  // Input Fields
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

  // Calculated Results
  basicSalary?: number;
  assignedTarget?: number;
  achievementPct?: number;
  grossSalary?: number;
  achievedSalary?: number;
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

export interface PaysheetResponse {
  paysheets: MonthlyPaysheet[];
  total: number;
  page: number;
  totalPages: number;
}

export interface PaysheetDetailResponse {
  paysheet: MonthlyPaysheet;
}
