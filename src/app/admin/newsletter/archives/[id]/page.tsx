'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress, Typography } from '@mui/material';

/**
 * Redirect to integrated newsletter detail view in main admin interface
 */
export default function AdminNewsletterDetailRedirect({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter();
  const [id, setId] = React.useState<string | null>(null);

  React.useEffect(() => {
    params.then(p => setId(p.id));
  }, [params]);

  useEffect(() => {
    if (id) {
      // Redirect to the main newsletter page with query params for archives tab and selected ID
      router.replace(`/admin/newsletter?tab=archives&newsletterId=${id}`);
    }
  }, [router, id]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <CircularProgress size={60} />
      <Typography variant="h6" sx={{ mt: 3 }}>
        Weiterleitung zum Newsletter-Detail...
      </Typography>
    </Box>
  );
}