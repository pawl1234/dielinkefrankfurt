'use client';

import { Box, Typography, useTheme, useMediaQuery } from '@mui/material';
import type { ReactNode } from 'react';

/**
 * Props for the PortalPageHeader component
 */
export interface PortalPageHeaderProps {
  /**
   * Page title to display
   */
  title: string;
  /**
   * Optional icon to display next to title
   */
  icon?: ReactNode;
  /**
   * Optional action button (e.g., "Add new" button)
   */
  action?: ReactNode;
}

/**
 * Reusable page header component for portal pages
 * Displays title with optional icon and action button
 * Implements responsive typography
 */
export default function PortalPageHeader({ title, icon, action }: PortalPageHeaderProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: isMobile ? 2 : 3,
        flexWrap: 'wrap',
        gap: 2,
      }}
    >
      {/* Title with icon */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? 1 : 2,
        }}
      >
        {icon && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              color: 'primary.main',
            }}
          >
            {icon}
          </Box>
        )}
        <Typography
          variant={isMobile ? 'h5' : 'h4'}
          component="h1"
          sx={{
            fontWeight: 'bold',
            color: 'text.primary',
          }}
        >
          {title}
        </Typography>
      </Box>

      {/* Optional action button */}
      {action && <Box>{action}</Box>}
    </Box>
  );
}
