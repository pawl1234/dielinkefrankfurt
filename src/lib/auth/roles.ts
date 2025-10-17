import { UserRole } from '@/types/user';
import { Session } from 'next-auth';

/**
 * Check if user has one of the allowed roles
 *
 * @param session - NextAuth session object
 * @param allowedRoles - Array of allowed roles
 * @returns true if user has allowed role
 */
export function requireRole(
  session: Session | null,
  allowedRoles: UserRole[]
): boolean {
  if (!session?.user?.role) return false;
  return allowedRoles.includes(session.user.role);
}

/**
 * Check if user has admin role
 *
 * @param userRole - User's role
 * @returns true if user is admin
 */
export function isAdmin(userRole: UserRole): boolean {
  return userRole === 'admin';
}

/**
 * Check if user can access member portal
 *
 * @param userRole - User's role
 * @returns true if user can access portal
 */
export function canAccessPortal(userRole: UserRole): boolean {
  return ['admin', 'mitglied'].includes(userRole);
}

/**
 * Check if user can access admin interface
 *
 * @param userRole - User's role
 * @returns true if user can access admin
 */
export function canAccessAdmin(userRole: UserRole): boolean {
  return isAdmin(userRole);
}
