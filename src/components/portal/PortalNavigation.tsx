'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Divider,
  IconButton,
  useMediaQuery,
  useTheme,
  Chip,
} from '@mui/material';
import {
  Home as HomeIcon,
  Menu as MenuIcon,
  ExitToApp as LogoutIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import { UserRole } from '@/types/user';

interface NavigationItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const navigationItems: NavigationItem[] = [
  {
    label: 'Startseite',
    href: '/portal',
    icon: <HomeIcon />,
  },
  // Future items added here
];

interface PortalNavigationProps {
  username: string;
  role: UserRole;
}

/**
 * Portal navigation component with sidebar and user info
 *
 * @param username - Current user's username
 * @param role - Current user's role
 * @returns Navigation component
 */
export default function PortalNavigation({ username, role }: PortalNavigationProps) {
  const pathname = usePathname();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  const drawerContent = (
    <Box sx={{ width: 250, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* User Info Section */}
      <Box sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
          {username}
        </Typography>
        <Chip
          label={role === 'admin' ? 'Administrator' : 'Mitglied'}
          size="small"
          color={role === 'admin' ? 'primary' : 'default'}
          sx={{ mt: 1 }}
        />
      </Box>

      <Divider />

      {/* Navigation Items */}
      <List sx={{ flexGrow: 1 }}>
        {navigationItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <ListItem key={item.href} disablePadding>
              <ListItemButton
                component={Link}
                href={item.href}
                selected={isActive}
                onClick={isMobile ? handleDrawerToggle : undefined}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider />

      {/* Logout Button */}
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={handleLogout}>
            <ListItemIcon>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Abmelden" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      {isMobile && (
        <IconButton
          color="inherit"
          aria-label="Menü öffnen"
          edge="start"
          onClick={handleDrawerToggle}
          sx={{ position: 'fixed', top: 16, left: 16, zIndex: 1300 }}
        >
          <MenuIcon />
        </IconButton>
      )}

      {/* Drawer */}
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
        >
          {drawerContent}
        </Drawer>
      ) : (
        <Drawer variant="permanent" open>
          {drawerContent}
        </Drawer>
      )}
    </>
  );
}
