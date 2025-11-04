'use client';

import { Typography, Paper, Box } from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';

/**
 * Placeholder page for group file management.
 * This feature will be implemented in a future release.
 */
export default function GroupFilesPage() {
  return (
    <Paper sx={{ p: 4, textAlign: 'center' }}>
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
        <FolderIcon sx={{ fontSize: 64, color: 'text.secondary' }} />
      </Box>
      <Typography variant="h6" gutterBottom>
        Dateien
      </Typography>
      <Typography color="text.secondary">
        Die Dateiverwaltung für Gruppen wird in Kürze verfügbar sein.
      </Typography>
    </Paper>
  );
}
