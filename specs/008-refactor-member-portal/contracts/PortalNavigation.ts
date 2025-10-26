import { UserRole } from '@/types/user';
import { MenuItem } from './MenuItem';

/**
 * Props for the PortalNavigation component.
 * Portal-specific wrapper around BaseNavigation that includes user session data.
 *
 * @example
 * ```typescript
 * <PortalNavigation
 *   username="max.mustermann"
 *   role="mitglied"
 *   additionalItems={[
 *     { type: 'link', key: 'custom', label: 'Sonderfunktion', href: '/portal/custom', icon: <Icon /> }
 *   ]}
 * />
 * ```
 */
export interface PortalNavigationProps {
  /**
   * Current user's username from session.
   * Displayed in user info section (top-right corner).
   *
   * @example 'max.mustermann', 'erika.musterfrau'
   */
  username: string;

  /**
   * Current user's role from session.
   * Used for role badge display and conditional navigation items.
   *
   * @example 'admin', 'mitglied'
   */
  role: UserRole;

  /**
   * Optional additional navigation items beyond the default portal navigation.
   * Useful for adding custom or role-specific menu items.
   *
   * @example
   * ```typescript
   * [
   *   { type: 'link', key: 'admin-only', label: 'Admin Funktion', href: '/portal/admin', icon: <AdminIcon /> }
   * ]
   * ```
   */
  additionalItems?: MenuItem[];
}

/**
 * Props for the PortalUserInfo component.
 * Displays user information and logout button in the navigation bar.
 *
 * @example
 * ```typescript
 * <PortalUserInfo
 *   username="max.mustermann"
 *   role="mitglied"
 *   onLogout={handleLogout}
 * />
 * ```
 */
export interface PortalUserInfoProps {
  /**
   * Current user's username to display.
   * On mobile, may show abbreviated version (initials) due to space constraints.
   *
   * @example 'max.mustermann'
   */
  username: string;

  /**
   * Current user's role for badge display.
   * Badge shows 'Administrator' for admin, 'Mitglied' for mitglied.
   *
   * @example 'admin', 'mitglied'
   */
  role: UserRole;

  /**
   * Logout handler function.
   * Should call NextAuth signOut with appropriate redirect.
   *
   * @example
   * ```typescript
   * const handleLogout = async () => {
   *   await signOut({ callbackUrl: '/login' });
   * };
   * ```
   */
  onLogout: () => void;
}
