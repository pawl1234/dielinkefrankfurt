'use client';

import AppointmentForm from '@/components/AppointmentForm';
import { MainLayout } from '@/components/MainLayout';
import {
  Typography,
  Container,
  Box,
  Paper,
  Button,
} from '@mui/material';
import Link from 'next/link';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export default function NewAppointmentPage() {
  return (
    <MainLayout
      breadcrumbs={[
        { label: 'Start', href: '/' },
        { label: 'Neue Termin Anfrage', href: '/neue-anfrage', active: true },
      ]}
    >
      <Container maxWidth="lg">
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
              Termin-Anmeldung
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
            Online-Formular zur Einreichung von Veranstaltungen
            </Typography>
          </Box>
        </Box>

        <Paper
          elevation={3}
          sx={{
            p: 4,
            mb: 4,
            borderRadius: 2
          }}
        >
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="h5"
              component="h3"
              color="primary"
              gutterBottom
              sx={{
                pb: 1,
                borderBottom: 1,
                borderColor: 'divider',
                fontWeight: 'medium'
              }}
            >
              Informationen zur Veranstaltung
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Geben Sie hier alle Details zu Ihrer geplanten Veranstaltung an. Je genauer Ihre Angaben sind,
              desto besser können wir Ihren Termin planen.
            </Typography>
            <AppointmentForm />
          </Box>
        </Paper>

        <Box
          component="footer"
          sx={{
            mt: 3,
            textAlign: 'center',
            pb: 3
          }}
        >
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} Die Linke Frankfurt am Main
          </Typography>
        </Box>
      </Container>
    </MainLayout>
  );
}