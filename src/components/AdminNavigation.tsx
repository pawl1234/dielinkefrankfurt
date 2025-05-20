'use client';

import React from 'react';
import { Box, Button, Typography, Paper, useTheme, useMediaQuery, Tooltip } from '@mui/material';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import EventIcon from '@mui/icons-material/Event';
import GroupsIcon from '@mui/icons-material/Groups';
import AssignmentIcon from '@mui/icons-material/Assignment';
import MailIcon from '@mui/icons-material/Mail';

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
  const isGroupsActive = pathname.startsWith('/admin/groups');
  const isStatusReportsActive = pathname.startsWith('/admin/status-reports');

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
                {React.cloneElement(item.icon as React.ReactElement, {
                  fontSize: "small"
                })}
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