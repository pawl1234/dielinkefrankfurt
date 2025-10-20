// src/types/user.ts

/**
 * User role type for authorization
 */
export type UserRole = 'admin' | 'mitglied';

/**
 * User role constants
 */
export const USER_ROLES = {
  ADMIN: 'admin',
  MITGLIED: 'mitglied'
} as const;

/**
 * User entity interface
 */
export interface User {
  id: string;
  username: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  isActive: boolean;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

/**
 * Data for creating a new user
 */
export interface CreateUserData {
  username: string;
  email: string;
  password: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
}

/**
 * Data for updating an existing user
 */
export interface UpdateUserData {
  username?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
}