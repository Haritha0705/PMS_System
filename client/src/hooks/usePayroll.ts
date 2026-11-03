import { useState, useEffect } from 'react';
import { payrollService } from '../services/payrollService';
import type { PayrollRecord } from '../types';

interface UsePayrollOptions {
  codeNo?: string;
  period?: string;
  search?: string;
  skip?: boolean;
}

export const usePayroll = (options: UsePayrollOptions = {}) => {
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (options.skip) return;

    const fetchPayroll = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await payrollService.getPayrollHistory(options);
        setRecords(data.records);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to fetch payroll');
      } finally {
        setLoading(false);
      }
    };

    fetchPayroll();
  }, [options.codeNo, options.period, options.search, options.skip]);

  const deleteRecord = async (id: string) => {
    await payrollService.deletePayroll(id);
    setRecords(records.filter((r) => r.id !== id));
  };

  const refreshRecords = async () => {
    try {
      const data = await payrollService.getPayrollHistory(options);
      setRecords(data.records);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch payroll');
    }
  };

  return { records, loading, error, deleteRecord, refreshRecords };
};
