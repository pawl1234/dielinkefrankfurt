import prisma from './prisma';
import type { User } from '@prisma/client';
import { hashPassword } from '@/lib/auth/password';

/**
 * Create a new user
 *
 * @param data - User creation data
 * @returns Promise resolving to created User
 */
export async function createUser(data: {
  username: string;
  password?: string;
  passwordHash?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  isActive?: boolean;
}): Promise<User> {
  // Hash password if provided as plain text
  const passwordHash = data.passwordHash || (data.password ? await hashPassword(data.password) : '');

  return prisma.user.create({
    data: {
      username: data.username,
      passwordHash,
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
    password: string;
    passwordHash: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isActive: boolean;
  }>
): Promise<User> {
  // Hash password if provided as plain text
  const updateData: Partial<{
    username: string;
    passwordHash: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isActive: boolean;
  }> = { ...data };

  if (data.password) {
    updateData.passwordHash = await hashPassword(data.password);
    delete (updateData as { password?: string }).password;
  }

  return prisma.user.update({
    where: { id },
    data: updateData,
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
