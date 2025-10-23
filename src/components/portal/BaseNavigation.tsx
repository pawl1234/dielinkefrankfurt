'use client';

import { useState } from 'react';
import {
  Box,
  Button,
  Divider,
  Collapse,
  Tooltip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import Link from 'next/link';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import type { MenuItem } from '@/types/component-types';

/**
 * Props for the BaseNavigation component
 */
export interface BaseNavigationProps {
  /**
   * Navigation items to render
   */
  items: MenuItem[];
  /**
   * Currently active path (from usePathname)
   */
  currentPath: string;
  /**
   * Responsive behavior mode
   * @default 'horizontal'
   */
  layout?: 'horizontal' | 'vertical';
  /**
   * Show icons only on mobile
   * @default true
   */
  compactMobile?: boolean;
}

/**
 * Reusable base navigation component
 * Supports links, dividers, and click-to-expand submenus
 * Implements mobile-first responsive design with icon-only mobile buttons
 */
export default function BaseNavigation({
  items,
  currentPath,
  layout = 'horizontal',
  compactMobile = true,
}: BaseNavigationProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});

  /**
   * Toggle submenu open/closed state
   * @param key - Unique submenu key
   */
  const toggleSubmenu = (key: string) => {
    setOpenSubmenus((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  /**
   * Check if a route is currently active
   * @param href - Route to check
   * @returns true if route is active
   */
  const isRouteActive = (href: string): boolean => {
    // Exact match for home page
    if (href === '/' && currentPath === '/') return true;

    // Prefix match for other pages
    if (href !== '/' && currentPath?.startsWith(href)) return true;

    return false;
  };

  /**
   * Render a link menu item as a button
   */
  const renderLinkMenuItem = (item: Extract<MenuItem, { type: 'link' }>) => {
    const isActive = isRouteActive(item.href);
    const showIconOnly = isMobile && compactMobile;

    const button = (
      <Button
        variant={isActive ? 'contained' : 'outlined'}
        color="primary"
        component={Link}
        href={item.href}
        startIcon={!showIconOnly && item.icon ? item.icon : undefined}
        aria-label={item.label}
        aria-current={isActive ? 'page' : undefined}
        sx={{
          fontWeight: isActive ? 'bold' : 'normal',
          minWidth: showIconOnly ? '48px' : undefined,
          width: showIconOnly ? '48px' : undefined,
          height: showIconOnly ? '48px' : undefined,
          padding: showIconOnly ? 0 : undefined,
        }}
      >
        {showIconOnly ? item.icon : item.label}
      </Button>
    );

    // Wrap in tooltip on mobile
    if (showIconOnly && item.icon) {
      return (
        <Tooltip key={item.key} title={item.label} arrow>
          {button}
        </Tooltip>
      );
    }

    return <Box key={item.key}>{button}</Box>;
  };

  /**
   * Render a divider menu item
   */
  const renderDividerMenuItem = (item: Extract<MenuItem, { type: 'divider' }>) => {
    return (
      <Divider
        key={item.key}
        orientation={layout === 'horizontal' ? 'vertical' : 'horizontal'}
        flexItem
        sx={{ my: layout === 'horizontal' ? 0 : 1 }}
      />
    );
  };

  /**
   * Render just the submenu button (without the collapse content)
   */
  const renderSubmenuButton = (item: Extract<MenuItem, { type: 'submenu' }>) => {
    const isOpen = Boolean(openSubmenus[item.key]);
    const hasActiveChild = item.items.some(
      (subItem) => subItem.type === 'link' && isRouteActive(subItem.href)
    );
    const showIconOnly = isMobile && compactMobile;

    const button = (
      <Button
        onClick={() => toggleSubmenu(item.key)}
        variant={hasActiveChild ? 'contained' : 'outlined'}
        color="primary"
        startIcon={!showIconOnly && item.icon ? item.icon : undefined}
        endIcon={!showIconOnly ? (isOpen ? <ExpandLess /> : <ExpandMore />) : undefined}
        aria-label={item.label}
        aria-expanded={isOpen}
        sx={{
          fontWeight: hasActiveChild ? 'bold' : 'normal',
          minWidth: showIconOnly ? '48px' : undefined,
          width: showIconOnly ? '48px' : undefined,
          height: showIconOnly ? '48px' : undefined,
          padding: showIconOnly ? 0 : undefined,
        }}
      >
        {showIconOnly ? item.icon : item.label}
      </Button>
    );

    return showIconOnly && item.icon ? (
      <Tooltip key={item.key} title={item.label} arrow>
        {button}
      </Tooltip>
    ) : (
      <Box key={item.key}>{button}</Box>
    );
  };

  /**
   * Render a single menu item in the main navigation row
   */
  const renderMainMenuItem = (item: MenuItem) => {
    if (item.type === 'link') {
      return renderLinkMenuItem(item);
    }

    if (item.type === 'divider') {
      return renderDividerMenuItem(item);
    }

    if (item.type === 'submenu') {
      return renderSubmenuButton(item);
    }

    return null;
  };

  // Get all open submenus
  const openSubmenuItems = items.filter(
    (item) => item.type === 'submenu' && openSubmenus[item.key]
  ) as Extract<MenuItem, { type: 'submenu' }>[];

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        width: '100%',
      }}
    >
      {/* Main navigation row */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          gap: isMobile ? 1 : 2,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        {items.map((item) => renderMainMenuItem(item))}
      </Box>

      {/* Submenu content area - appears below main navigation */}
      {openSubmenuItems.map((submenu) => (
        <Collapse key={submenu.key} in={true} timeout="auto" unmountOnExit>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              gap: isMobile ? 1 : 2,
              mt: 2,
              flexWrap: 'wrap',
            }}
          >
            {submenu.items.map((subItem) =>
              subItem.type === 'link' ? (
                <Box key={subItem.key}>
                  <Button
                    variant={isRouteActive(subItem.href) ? 'contained' : 'outlined'}
                    color="primary"
                    component={Link}
                    href={subItem.href}
                    startIcon={!isMobile && subItem.icon ? subItem.icon : undefined}
                    aria-label={subItem.label}
                    aria-current={isRouteActive(subItem.href) ? 'page' : undefined}
                    size="small"
                    sx={{
                      fontWeight: isRouteActive(subItem.href) ? 'bold' : 'normal',
                    }}
                  >
                    {subItem.label}
                  </Button>
                </Box>
              ) : null
            )}
          </Box>
        </Collapse>
      ))}
    </Box>
  );
}
