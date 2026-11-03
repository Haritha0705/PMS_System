import { useState, useEffect } from 'react';
import { userService } from '../services/userService';
import type { User, UsersResponse } from '../types';

interface UseUsersOptions {
  search?: string;
  branch?: string;
  role?: string;
  status?: 'active' | 'delete' | 'all';
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  skip?: boolean;
}

export const useUsers = (options: UseUsersOptions = {}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<UsersResponse | null>(null);

  useEffect(() => {
    if (options.skip) return;

    const fetchUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await userService.listUsers(options);
        setUsers(data.users);
        setResponse(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to fetch users');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [
    options.search, options.branch, options.role, options.status,
    options.page, options.limit, options.sortBy, options.sortOrder, options.skip,
  ]);

  const createUser = async (userData: Omit<User, 'createdAt' | 'updatedAt'>) => {
    const newUser = await userService.createUser(userData);
    setUsers([...users, newUser]);
    return newUser;
  };

  const updateUser = async (codeNo: string, updates: Partial<User>) => {
    const updated = await userService.updateUser(codeNo, updates);
    setUsers(users.map((u) => (u.codeNo === codeNo ? updated : u)));
    return updated;
  };

  const deleteUser = async (codeNo: string) => {
    await userService.deleteUser(codeNo);
    setUsers(users.filter((u) => u.codeNo !== codeNo));
  };

  const refreshUsers = async () => {
    try {
      const data = await userService.listUsers(options);
      setUsers(data.users);
      setResponse(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    }
  };

  return { users, loading, error, response, createUser, updateUser, deleteUser, refreshUsers };
};
