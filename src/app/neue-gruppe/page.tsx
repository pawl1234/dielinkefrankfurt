'use client';

import { Container, Typography, Box, Paper } from '@mui/material';
import { MainLayout } from '@/components/MainLayout';
import GroupRequestForm from '@/components/GroupRequestForm';

export default function NewGroupPage() {
  return (
    <MainLayout
          breadcrumbs={[
            { label: 'Start', href: '/' },
            { label: 'Neue Gruppen Anfrage', href: '/neue-gruppe', active: true },
          ]}
        >
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
          {/* Red primary title bar */}
          <Box
            sx={{
              display: 'inline-block',
              bgcolor: 'primary.main',
              color: 'common.white',
              p: { xs: 1.5, md: 2 },
              borderRadius: 0
            }}
          >
            <Typography variant="h4" component="h2" sx={{ fontWeight: 'fontWeightBold' }}>
              Neue Arbeitsgruppe
            </Typography>
          </Box>
          <br></br>
          {/* Secondary subtitle bar - indented from primary title */}
          <Box
            sx={{
              display: 'inline-block',
              bgcolor: 'secondary.main',
              color: 'common.white',
              p: { xs: 1.5, md: 1.5 },
              ml: { xs: 3, md: 4 },
              borderRadius: 0
            }}
          >
            <Typography variant="body1" sx={{ fontWeight: 'fontWeightMedium' }}>
            Online-Formular zur Beantragung einer Arbeitsgruppe
            </Typography>
          </Box>
        </Box>  
      <GroupRequestForm />
    </Container>
    </MainLayout>
  );
}