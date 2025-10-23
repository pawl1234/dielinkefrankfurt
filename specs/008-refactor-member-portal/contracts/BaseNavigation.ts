import { MenuItem } from './MenuItem';

/**
 * Custom styles for active navigation items
 */
export interface ActiveStyles {
  /**
   * Background color for active item
   * @example 'primary.main', '#FF0000'
   */
  backgroundColor?: string;

  /**
   * Text color for active item
   * @example 'primary.main', '#FFFFFF'
   */
  color?: string;

  /**
   * Font weight for active item
   * @example 'bold', '700', 'fontWeightBold'
   */
  fontWeight?: string;
}

/**
 * Props for the BaseNavigation component.
 * Provides reusable navigation rendering with support for links, dividers, and submenus.
 *
 * @example
 * ```typescript
 * <BaseNavigation
 *   items={navigationItems}
 *   currentPath="/portal/dashboard"
 *   layout="horizontal"
 *   compactMobile={true}
 *   activeStyles={{
 *     color: 'primary.main',
 *     fontWeight: 'bold'
 *   }}
 * />
 * ```
 */
export interface BaseNavigationProps {
  /**
   * Array of navigation items to render.
   * Can include links, dividers, and submenus.
   *
   * @example
   * ```typescript
   * [
   *   { type: 'link', key: 'home', label: 'Startseite', href: '/portal', icon: <HomeIcon /> },
   *   { type: 'submenu', key: 'settings', label: 'Einstellungen', icon: <SettingsIcon />, items: [...] },
   *   { type: 'divider', key: 'divider-1' }
   * ]
   * ```
   */
  items: MenuItem[];

  /**
   * Currently active path from Next.js usePathname() hook.
   * Used to highlight the active navigation item.
   *
   * @example '/portal', '/portal/dashboard', '/portal/settings/profile'
   */
  currentPath: string;

  /**
   * Navigation layout orientation.
   *
   * - 'horizontal': Items arranged in a row (default)
   * - 'vertical': Items arranged in a column
   *
   * @default 'horizontal'
   */
  layout?: 'horizontal' | 'vertical';

  /**
   * Show icons only on mobile devices (<600px).
   * When true, displays icon-only buttons with tooltips on mobile,
   * and full buttons with icons + labels on desktop.
   *
   * @default true
   */
  compactMobile?: boolean;

  /**
   * Custom styles for active menu items.
   * Applied to the currently active navigation item.
   *
   * @example
   * ```typescript
   * {
   *   backgroundColor: 'primary.light',
   *   color: 'primary.main',
   *   fontWeight: 'bold'
   * }
   * ```
   */
  activeStyles?: ActiveStyles;
}
