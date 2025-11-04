'use client';

import { Typography, Paper, Box } from '@mui/material';
import EventIcon from '@mui/icons-material/Event';

/**
 * Placeholder page for group appointments/events.
 * This feature will be implemented in a future release.
 */
export default function GroupAppointmentsPage() {
  return (
    <Paper sx={{ p: 4, textAlign: 'center' }}>
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
        <EventIcon sx={{ fontSize: 64, color: 'text.secondary' }} />
      </Box>
      <Typography variant="h6" gutterBottom>
        Termine
      </Typography>
      <Typography color="text.secondary">
        Die Terminverwaltung für Gruppen wird in Kürze verfügbar sein.
      </Typography>
    </Paper>
  );
}
