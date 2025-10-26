import { ReactNode } from 'react';

/**
 * Type discriminator for menu items
 */
export type MenuItemType = 'link' | 'divider' | 'submenu';

/**
 * Base interface for all navigation items.
 * Uses discriminated union pattern with `type` field.
 */
export interface BaseMenuItem {
  /**
   * Discriminator field for type narrowing
   */
  type: MenuItemType;

  /**
   * Unique identifier for React keys and submenu state tracking.
   * Must be unique within the navigation items array.
   *
   * @example 'home', 'settings', 'divider-1'
   */
  key: string;
}

/**
 * Single navigation link that navigates to a specific page.
 *
 * @example
 * ```typescript
 * const homeLink: LinkMenuItem = {
 *   type: 'link',
 *   key: 'home',
 *   label: 'Startseite',
 *   href: '/portal',
 *   icon: <HomeIcon />
 * };
 * ```
 */
export interface LinkMenuItem extends BaseMenuItem {
  /**
   * Literal type 'link' for discrimination
   */
  type: 'link';

  /**
   * Display text in German.
   * Should be concise (max 30 characters) to fit in navigation buttons.
   *
   * @example 'Startseite', 'Einstellungen', 'Mein Profil'
   */
  label: string;

  /**
   * Next.js route path (absolute path starting with '/').
   *
   * @example '/portal', '/portal/dashboard', '/portal/settings/profile'
   */
  href: string;

  /**
   * Optional Material UI icon component.
   *
   * @example <HomeIcon />, <SettingsIcon />
   */
  icon?: ReactNode;
}

/**
 * Visual separator between groups of navigation items.
 * Renders as MUI Divider component.
 *
 * @example
 * ```typescript
 * const divider: DividerMenuItem = {
 *   type: 'divider',
 *   key: 'divider-1'
 * };
 * ```
 */
export interface DividerMenuItem extends BaseMenuItem {
  /**
   * Literal type 'divider' for discrimination
   */
  type: 'divider';
}

/**
 * Parent menu item with nested child items that expand/collapse on click.
 * Submenus cannot be nested (max depth: 1 level).
 *
 * @example
 * ```typescript
 * const settingsSubmenu: SubmenuMenuItem = {
 *   type: 'submenu',
 *   key: 'settings',
 *   label: 'Einstellungen',
 *   icon: <SettingsIcon />,
 *   items: [
 *     { type: 'link', key: 'profile', label: 'Profil', href: '/portal/profile', icon: <PersonIcon /> },
 *     { type: 'link', key: 'security', label: 'Sicherheit', href: '/portal/security', icon: <SecurityIcon /> }
 *   ]
 * };
 * ```
 */
export interface SubmenuMenuItem extends BaseMenuItem {
  /**
   * Literal type 'submenu' for discrimination
   */
  type: 'submenu';

  /**
   * Display text in German for parent menu item.
   * Should be concise (max 30 characters).
   *
   * @example 'Einstellungen', 'Verwaltung', 'Hilfe'
   */
  label: string;

  /**
   * Optional Material UI icon component for parent menu item.
   *
   * @example <SettingsIcon />, <AdminPanelSettingsIcon />
   */
  icon?: ReactNode;

  /**
   * Array of nested menu items (typically LinkMenuItem).
   * Must contain at least 1 item.
   * Cannot contain SubmenuMenuItem (no nested submenus).
   *
   * @example [{ type: 'link', ... }, { type: 'link', ... }]
   */
  items: MenuItem[];
}

/**
 * Discriminated union of all menu item types.
 * Enables type-safe pattern matching based on `type` field.
 *
 * @example
 * ```typescript
 * function renderMenuItem(item: MenuItem) {
 *   if (item.type === 'link') {
 *     // TypeScript knows item is LinkMenuItem
 *     return <Link href={item.href}>{item.label}</Link>;
 *   }
 *   if (item.type === 'divider') {
 *     // TypeScript knows item is DividerMenuItem
 *     return <Divider key={item.key} />;
 *   }
 *   if (item.type === 'submenu') {
 *     // TypeScript knows item is SubmenuMenuItem
 *     return <Submenu items={item.items}>{item.label}</Submenu>;
 *   }
 * }
 * ```
 */
export type MenuItem = LinkMenuItem | DividerMenuItem | SubmenuMenuItem;
