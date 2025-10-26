'use client';

import { Box, Typography, Chip, IconButton, Tooltip, useTheme, useMediaQuery } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import type { UserRole } from '@/types/user';

/**
 * Props for the PortalUserInfo component
 */
export interface PortalUserInfoProps {
  /**
   * Current user's username to display
   */
  username: string;
  /**
   * Current user's role for badge display
   */
  role: UserRole;
  /**
   * Logout handler function
   */
  onLogout: () => void;
}

/**
 * Portal user information display component
 * Shows username, role badge, and logout button
 * Adapts to mobile with condensed format
 */
export default function PortalUserInfo({ username, role, onLogout }: PortalUserInfoProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  /**
   * Map role to German display text
   */
  const getRoleLabel = (role: UserRole): string => {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'mitglied':
        return 'Mitglied';
      default:
        return 'Benutzer';
    }
  };

  /**
   * Get user initials for mobile display
   */
  const getUserInitials = (username: string): string => {
    const parts = username.split('.');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return username.substring(0, 2).toUpperCase();
  };

  const roleLabel = getRoleLabel(role);
  const displayName = isMobile ? getUserInitials(username) : username;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? 1 : 2,
      }}
    >
      {/* Username display */}
      <Typography
        variant="body2"
        sx={{
          fontWeight: 'medium',
          display: isMobile ? 'none' : 'block',
        }}
      >
        {username}
      </Typography>

      {/* Mobile: Show initials */}
      {isMobile && (
        <Tooltip title={username} arrow>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 'bold',
              minWidth: '32px',
              textAlign: 'center',
            }}
          >
            {displayName}
          </Typography>
        </Tooltip>
      )}

      {/* Role badge */}
      <Chip
        label={roleLabel}
        size="small"
        color="primary"
        sx={{
          fontWeight: 'medium',
          display: isMobile ? 'none' : 'inline-flex',
        }}
      />

      {/* Logout button */}
      <Tooltip title="Abmelden" arrow>
        <IconButton
          onClick={onLogout}
          color="primary"
          aria-label="Abmelden"
          sx={{
            '&:hover': {
              backgroundColor: 'action.hover',
            },
          }}
        >
          <LogoutIcon />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
