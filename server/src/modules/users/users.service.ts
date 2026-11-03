/**
 * Users service — wraps DB operations with Redis cache.
 * getAllUsers: 3-minute TTL, invalidated on any write.
 * Individual users: 5-minute TTL.
 */

import {
  dbGetAllUsers, dbGetUser,
  dbCreateUser, dbUpdateUser, dbDeleteUser,
} from '../../services/dbStore';
import { cacheGet, cacheSet, cacheDel, cacheInvalidatePrefix, CK } from '../../services/cache';
import type { User } from '../../models';

export async function getAllUsers(): Promise<User[]> {
  const cached = await cacheGet<User[]>(CK.USERS_ALL);
  if (cached) return cached;
  const users = await dbGetAllUsers();
  await cacheSet(CK.USERS_ALL, users, 180); // 3 min
  return users;
}

export async function getUser(codeNo: string): Promise<User | null> {
  const cached = await cacheGet<User>(CK.USER(codeNo));
  if (cached) return cached;
  const user = await dbGetUser(codeNo);
  if (user) await cacheSet(CK.USER(codeNo), user, 300); // 5 min
  return user;
}

export async function createUser(user: User): Promise<void> {
  await dbCreateUser(user);
  await cacheInvalidatePrefix('users:');
}

export async function updateUser(codeNo: string, user: User): Promise<void> {
  await dbUpdateUser(codeNo, user);
  await cacheDel(CK.USER(codeNo));
  await cacheDel(CK.USERS_ALL);
  await cacheDel(CK.USERS_STATS);
}

export async function deleteUser(codeNo: string): Promise<void> {
  await dbDeleteUser(codeNo);
  await cacheDel(CK.USER(codeNo));
  await cacheInvalidatePrefix('users:');
}
