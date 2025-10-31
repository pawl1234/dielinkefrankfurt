'use client';

import { useEffect } from 'react';
import { Box, Typography, Button, Container } from '@mui/material';
import Link from 'next/link';
import { logger } from '@/lib/logger';

/**
 * Error boundary for homepage route segment.
 * Catches unhandled errors and displays a user-friendly German error message.
 * Logs errors for debugging and monitoring.
 *
 * @param error - The error that was thrown
 * @param reset - Function to reset the error boundary and retry
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error on client (server errors already logged)
    logger.error('Homepage error boundary triggered', {
      module: 'homepage',
      context: { error: error.message, digest: error.digest }
    });
  }, [error]);

  return (
    <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
      <Typography variant="h4" gutterBottom>
        Ein Fehler ist aufgetreten
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Die Seite konnte nicht geladen werden. Bitte versuchen Sie es erneut.
      </Typography>
      <Box sx={{ mt: 4 }}>
        <Button variant="contained" onClick={reset} sx={{ mr: 2 }}>
          Erneut versuchen
        </Button>
        <Button variant="outlined" href="/" LinkComponent={Link}>
          Zur Startseite
        </Button>
      </Box>
    </Container>
  );
}
