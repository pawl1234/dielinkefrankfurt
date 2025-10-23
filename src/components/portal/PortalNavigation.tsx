'use client';

import { usePathname } from 'next/navigation';
import { Container, Box, Paper, useTheme, useMediaQuery } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SettingsIcon from '@mui/icons-material/Settings';
import PersonIcon from '@mui/icons-material/Person';
import type { MenuItem } from '@/types/component-types';
import BaseNavigation from './BaseNavigation';

/**
 * Props for the PortalNavigation component
 */
export interface PortalNavigationProps {
  /**
   * Optional additional navigation items (beyond defaults)
   */
  additionalItems?: MenuItem[];
}

/**
 * Default navigation items for the portal
 */
const defaultNavigationItems: MenuItem[] = [
  {
    type: 'link',
    key: 'home',
    label: 'Startseite',
    href: '/portal',
    icon: <HomeIcon />,
  },
  {
    type: 'link',
    key: 'dashboard',
    label: 'Dashboard',
    href: '/portal/dashboard',
    icon: <DashboardIcon />,
  },
  {
    type: 'submenu',
    key: 'settings',
    label: 'Einstellungen',
    icon: <SettingsIcon />,
    items: [
      {
        type: 'link',
        key: 'profile',
        label: 'Profil',
        href: '/portal/settings/profile',
        icon: <PersonIcon />,
      },
    ],
  },
];

/**
 * Portal navigation component with horizontal layout
 * Displays navigation items for portal-specific pages
 * Implements mobile-first responsive design
 * Note: User info and logout are handled by MainLayout
 *
 * @param additionalItems - Optional additional navigation items
 * @returns Navigation component
 */
export default function PortalNavigation({
  additionalItems = [],
}: PortalNavigationProps) {
  const pathname = usePathname();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Combine default and additional navigation items
  const navigationItems = [...defaultNavigationItems, ...additionalItems];

  return (
    <Paper sx={{ mb: isMobile ? 2 : 4 }}>
      <Container maxWidth="lg">
        <Box
          sx={{
            py: isMobile ? 1.5 : 2,
            display: 'flex',
            flexDirection: 'row',
            justifyContent: isMobile ? 'space-around' : 'flex-start',
            flexWrap: 'wrap',
            gap: isMobile ? 1 : 2,
          }}
        >
          <BaseNavigation
            items={navigationItems}
            currentPath={pathname || '/portal'}
            layout="horizontal"
            compactMobile={true}
          />
        </Box>
      </Container>
    </Paper>
  );
}
