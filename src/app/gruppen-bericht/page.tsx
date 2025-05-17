'use client';

import { useState, useEffect } from 'react';
import { Container, Typography, Box, Paper } from '@mui/material';
import StatusReportForm from '@/components/StatusReportForm';
import { MainLayout } from '@/components/MainLayout';

export default function GruppenBerichtPage() {
  return (
    <MainLayout>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
        <Box mb={4}>
          <Typography
            variant="h4"
            component="h1"
            fontWeight="bold"
            gutterBottom
          >
            Bericht einreichen
          </Typography>
          <Typography variant="body1" paragraph>
            Hier können Sie einen Statusbericht für Ihre Gruppe einreichen. 
            Dieser Bericht wird von der Redaktion geprüft und dann auf der 
            Seite Ihrer Gruppe veröffentlicht.
          </Typography>
        </Box>

        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <StatusReportForm />
        </Paper>
      </Container>
    </MainLayout>
  );
}