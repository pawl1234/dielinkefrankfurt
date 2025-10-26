'use client';

import { usePathname } from 'next/navigation';
import { Container, Box, Paper, useTheme, useMediaQuery } from '@mui/material';
import type { MenuItem } from '@/types/component-types';
import BaseNavigation from './BaseNavigation';

/**
 * Props for the PortalNavigation component
 */
export interface PortalNavigationProps {
  /**
   * Navigation items to display
   */
  items: MenuItem[];
}

/**
 * Portal navigation component with horizontal layout
 * Displays navigation items for portal-specific pages
 * Implements mobile-first responsive design
 * Note: User info and logout are handled by MainLayout
 *
 * @param items - Navigation items to display
 * @returns Navigation component
 */
export default function PortalNavigation({
  items,
}: PortalNavigationProps) {
  const pathname = usePathname();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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
            items={items}
            currentPath={pathname || '/portal'}
            layout="horizontal"
            compactMobile={true}
          />
        </Box>
      </Container>
    </Paper>
  );
}
