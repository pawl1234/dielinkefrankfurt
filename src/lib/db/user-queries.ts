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
 * Find a user by email
 *
 * @param email - The email to search for
 * @returns Promise resolving to User or null if not found
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { email },
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

