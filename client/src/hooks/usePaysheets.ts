import { useState, useEffect } from 'react';
import { paysheetService } from '../services/paysheetService';
import type { MonthlyPaysheet, PaysheetResponse } from '../types';

interface UsePaysheetOptions {
  codeNo?: string;
  payMonth?: string;
  role?: string;
  search?: string;
  page?: number;
  limit?: number;
  skip?: boolean;
}

export const usePaysheets = (options: UsePaysheetOptions = {}) => {
  const [paysheets, setPaysheets] = useState<MonthlyPaysheet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<PaysheetResponse | null>(null);

  useEffect(() => {
    if (options.skip) return;

    const fetchPaysheets = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await paysheetService.listPaysheets(options);
        setPaysheets(data.paysheets);
        setResponse(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to fetch paysheets');
      } finally {
        setLoading(false);
      }
    };

    fetchPaysheets();
  }, [options.codeNo, options.payMonth, options.role, options.search, options.page, options.limit, options.skip]);

  const createPaysheet = async (data: Omit<MonthlyPaysheet, 'id' | 'createdAt' | 'updatedAt'>) => {
    const result = await paysheetService.createPaysheet(data);
    setPaysheets([...paysheets, result.paysheet]);
    return result.paysheet;
  };

  const updatePaysheet = async (id: string, updates: Partial<MonthlyPaysheet>) => {
    const result = await paysheetService.updatePaysheet(id, updates);
    setPaysheets(paysheets.map((p) => (p.id === id ? result.paysheet : p)));
    return result.paysheet;
  };

  const deletePaysheet = async (id: string) => {
    await paysheetService.deletePaysheet(id);
    setPaysheets(paysheets.filter((p) => p.id !== id));
  };

  const refreshPaysheets = async () => {
    try {
      const data = await paysheetService.listPaysheets(options);
      setPaysheets(data.paysheets);
      setResponse(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch paysheets');
    }
  };

  return { paysheets, loading, error, response, createPaysheet, updatePaysheet, deletePaysheet, refreshPaysheets };
};
