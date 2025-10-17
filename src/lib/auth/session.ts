// src/lib/auth/session.ts
import { findUserByUsername } from '@/lib/db/user-queries';
import { logger } from '@/lib/logger';
import { UserRole } from '@/types/user';
import { comparePassword } from './password';

/**
 * Find user by credentials (for NextAuth)
 *
 * @param username - Username
 * @param password - Plain text password
 * @returns User object or null
 */
export async function findUserByCredentials(username: string, password: string): Promise<{
  id: string;
  username: string;
  email?: string;
  name: string;
  role: UserRole;
  isActive?: boolean;
  isEnvironmentUser?: boolean;
} | null> {
  logger.info(`Authentication attempt for username: ${username}`, { module: 'auth' });

  // Check if this is the env-based admin
  const envAdminUsername = process.env.ADMIN_USERNAME;
  const envAdminPassword = process.env.ADMIN_PASSWORD;

  if (username === envAdminUsername && password === envAdminPassword) {
    logger.info('Successful login with environment admin credentials', { module: 'auth' });
    return {
      id: 'env-admin',
      username: envAdminUsername,
      name: 'System Admin',
      role: 'admin' as UserRole,
      isEnvironmentUser: true
    };
  }

  // Otherwise, check the database
  const user = await findUserByUsername(username);

  if (!user) {
    logger.warn(`Authentication failed: User ${username} not found`, { module: 'auth' });
    return null;
  }

  if (!user.isActive) {
    logger.warn(`Authentication failed: User ${username} is inactive`, { module: 'auth' });
    return null;
  }

  const isPasswordValid = await comparePassword(password, user.passwordHash);

  if (!isPasswordValid) {
    logger.warn(`Authentication failed: Invalid password for user ${username}`, { module: 'auth' });
    return null;
  }

  logger.info(`Successful login for user ${username}`, { module: 'auth' });

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    name: user.firstName ? `${user.firstName} ${user.lastName}` : user.username,
    role: user.role as UserRole,
    isActive: user.isActive
  };
}