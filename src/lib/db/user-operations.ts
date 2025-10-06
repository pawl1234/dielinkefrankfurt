import prisma from './prisma';
import type { User } from '@prisma/client';

/**
 * Find a user by username
 *
 * @param username - The username to search for
 * @returns Promise resolving to User or null if not found
 */
export async function findUserByUsername(username: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { username },
  });
}

/**
 * Find a user by ID
 *
 * @param id - The user ID to search for
 * @returns Promise resolving to User or null if not found
 */
export async function findUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { id },
  });
}

/**
 * Create a new user
 *
 * @param data - User creation data
 * @returns Promise resolving to created User
 */
export async function createUser(data: {
  username: string;
  passwordHash: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  isActive?: boolean;
}): Promise<User> {
  return prisma.user.create({
    data: {
      username: data.username,
      passwordHash: data.passwordHash,
      email: data.email,
      firstName: data.firstName || null,
      lastName: data.lastName || null,
      role: data.role || 'admin',
      isActive: data.isActive !== undefined ? data.isActive : true,
    },
  });
}

/**
 * Update a user
 *
 * @param id - User ID to update
 * @param data - User update data
 * @returns Promise resolving to updated User
 */
export async function updateUser(
  id: string,
  data: Partial<{
    username: string;
    passwordHash: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isActive: boolean;
  }>
): Promise<User> {
  return prisma.user.update({
    where: { id },
    data,
  });
}

/**
 * Delete a user
 *
 * @param id - User ID to delete
 * @returns Promise resolving to deleted User
 */
export async function deleteUser(id: string): Promise<User> {
  return prisma.user.delete({
    where: { id },
  });
}

/**
 * List all users
 *
 * @returns Promise resolving to array of Users
 */
export async function listUsers(): Promise<User[]> {
  return prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
  });
}
