'use client';

import React from 'react';
import { Box, Button, Typography, Paper, useTheme, useMediaQuery, Tooltip } from '@mui/material';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import EventIcon from '@mui/icons-material/Event';
import GroupsIcon from '@mui/icons-material/Groups';
import PersonIcon from '@mui/icons-material/Groups';
import AssignmentIcon from '@mui/icons-material/Assignment';
import MailIcon from '@mui/icons-material/Mail';
import GavelIcon from '@mui/icons-material/Gavel';
import HelpCenterIcon from '@mui/icons-material/HelpCenter';

interface AdminNavigationProps {
  title?: string;
}

export default function AdminNavigation({ title = 'Admin Dashboard' }: AdminNavigationProps) {
  const pathname = usePathname();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Determine which page is active
  const isNewsletterActive = pathname === '/admin';
  const isAppointmentsActive = pathname === '/admin/appointments';
  const isAntraegeActive = pathname?.startsWith('/admin/antraege') || false;
  const isGroupsActive = pathname?.startsWith('/admin/groups') || false;
  const isStatusReportsActive = pathname?.startsWith('/admin/status-reports') || false;
  const isFaqActive = pathname?.startsWith('/admin/faq') || false;
  const isUsersActive = pathname?.startsWith('/admin/users') || false

  const navItems = [
    {
      label: 'Newsletter',
      icon: <MailIcon />,
      href: '/admin',
      isActive: isNewsletterActive
    },
    {
      label: 'Termine',
      icon: <EventIcon />,
      href: '/admin/appointments',
      isActive: isAppointmentsActive
    },
    {
      label: 'Anträge',
      icon: <GavelIcon />,
      href: '/admin/antraege',
      isActive: isAntraegeActive
    },
    {
      label: 'Gruppen',
      icon: <GroupsIcon />,
      href: '/admin/groups',
      isActive: isGroupsActive
    },
    {
      label: 'Status Reports',
      icon: <AssignmentIcon />,
      href: '/admin/status-reports',
      isActive: isStatusReportsActive
    },
    {
      label: 'FAQ',
      icon: <HelpCenterIcon />,
      href: '/admin/faq',
      isActive: isFaqActive
    },
    {
      label: 'Benutzerverwaltung',
      icon: <PersonIcon />,
      href: '/admin/users',
      isActive: isUsersActive
    }
  ];

  return (
    <Paper sx={{ p: isMobile ? 1.5 : 2, mb: isMobile ? 2 : 4 }}>
      <Typography variant={isMobile ? "subtitle1" : "h6"} gutterBottom sx={{ mb: isMobile ? 1 : 2 }}>
        {title}
      </Typography>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'row',
        justifyContent: isMobile ? 'space-around' : 'flex-start',
        flexWrap: 'wrap', 
        gap: isMobile ? 1 : 2 
      }}>
        {navItems.map((item) => (
          isMobile ? (
            <Tooltip key={item.href} title={item.label} arrow>
              <Button 
                variant={item.isActive ? "contained" : "outlined"} 
                color="primary"
                component={Link}
                href={item.href}
                aria-label={item.label}
                sx={{ 
                  minWidth: '48px', 
                  width: '48px',
                  height: '48px',
                  padding: 0
                }}
              >
                {item.icon}
              </Button>
            </Tooltip>
          ) : (
            <Button 
              key={item.href}
              variant={item.isActive ? "contained" : "outlined"} 
              color="primary"
              startIcon={item.icon}
              component={Link}
              href={item.href}
              sx={{ fontWeight: item.isActive ? 'bold' : 'normal' }}
            >
              {item.label}
            </Button>
          )
        ))}
      </Box>
    </Paper>
  );
}