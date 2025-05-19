'use client';

import React from 'react';
import { Box, Button, Typography, Paper } from '@mui/material';
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
  
  // Determine which page is active
  const isNewsletterActive = pathname === '/admin';
  const isAppointmentsActive = pathname === '/admin/appointments';
  const isGroupsActive = pathname.startsWith('/admin/groups');
  const isStatusReportsActive = pathname.startsWith('/admin/status-reports');

  return (
    <Paper sx={{ p: 2, mb: 4 }}>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        <Button 
          variant={isNewsletterActive ? "contained" : "outlined"} 
          color="primary"
          startIcon={<MailIcon />}
          component={Link}
          href="/admin"
          sx={{ fontWeight: isNewsletterActive ? 'bold' : 'normal' }}
        >
          Newsletter
        </Button>
        <Button 
          variant={isAppointmentsActive ? "contained" : "outlined"} 
          color="primary"
          startIcon={<EventIcon />}
          component={Link}
          href="/admin/appointments"
          sx={{ fontWeight: isAppointmentsActive ? 'bold' : 'normal' }}
        >
          Termine
        </Button>
        <Button 
          variant={isGroupsActive ? "contained" : "outlined"} 
          color="primary"
          startIcon={<GroupsIcon />}
          component={Link}
          href="/admin/groups"
          sx={{ fontWeight: isGroupsActive ? 'bold' : 'normal' }}
        >
          Gruppen
        </Button>
        <Button 
          variant={isStatusReportsActive ? "contained" : "outlined"} 
          color="primary"
          startIcon={<AssignmentIcon />}
          component={Link}
          href="/admin/status-reports"
          sx={{ fontWeight: isStatusReportsActive ? 'bold' : 'normal' }}
        >
          Status Reports
        </Button>
      </Box>
    </Paper>
  );
}