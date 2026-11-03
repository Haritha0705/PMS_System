import api from './api';
import type { PayrollRecord, PayrollResponse, PayrollHistoryResponse } from '../types';

interface PayrollGenerateRequest {
  codeNos?: string[];
  period: string;
}

interface PayrollHistoryParams {
  codeNo?: string;
  period?: string;
  search?: string;
}

function extractErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  return fallback;
}

export const payrollService = {
  async generatePayroll(request: PayrollGenerateRequest): Promise<PayrollResponse> {
    try {
      const response = await api.post<PayrollResponse>('/payroll/generate', request);
      return response.data;
    } catch (error: unknown) {
      throw new Error(extractErrorMessage(error, 'Failed to generate payroll'));
    }
  },

  async getPayrollHistory(filters: PayrollHistoryParams = {}): Promise<PayrollHistoryResponse> {
    try {
      const response = await api.get<PayrollHistoryResponse>('/payroll/history', { params: filters });
      return response.data;
    } catch (error: unknown) {
      throw new Error(extractErrorMessage(error, 'Failed to fetch payroll history'));
    }
  },

  async getPayroll(id: string): Promise<PayrollRecord> {
    try {
      const response = await api.get<PayrollRecord>(`/payroll/${id}`);
      return response.data;
    } catch (error: unknown) {
      throw new Error(extractErrorMessage(error, 'Failed to fetch payroll'));
    }
  },

  async deletePayroll(id: string): Promise<{ message: string }> {
    try {
      const response = await api.delete(`/payroll/${id}`);
      return response.data;
    } catch (error: unknown) {
      throw new Error(extractErrorMessage(error, 'Failed to delete payroll'));
    }
  },
};
