'use client';

import { Typography, Paper, Box } from '@mui/material';
import ForumIcon from '@mui/icons-material/Forum';

/**
 * Placeholder page for group communication/messaging.
 * This feature will be implemented in a future release.
 */
export default function GroupCommunicationPage() {
  return (
    <Paper sx={{ p: 4, textAlign: 'center' }}>
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
        <ForumIcon sx={{ fontSize: 64, color: 'text.secondary' }} />
      </Box>
      <Typography variant="h6" gutterBottom>
        Kommunikation
      </Typography>
      <Typography color="text.secondary">
        Die Kommunikationsfunktionen für Gruppen werden in Kürze verfügbar sein.
      </Typography>
    </Paper>
  );
}
