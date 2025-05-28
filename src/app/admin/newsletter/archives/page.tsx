'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress, Typography } from '@mui/material';

/**
 * Redirect component that redirects to the newsletter page with archives tab
 */
export default function AdminNewsletterArchivesRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the main newsletter page with a query param to open the archives tab
    // The tab state will be handled in the main newsletter page
    router.replace('/admin/newsletter?tab=archives');
  }, [router]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <CircularProgress size={60} />
      <Typography variant="h6" sx={{ mt: 3 }}>
        Weiterleitung zum Newsletter-Archiv...
      </Typography>
    </Box>
  );
}