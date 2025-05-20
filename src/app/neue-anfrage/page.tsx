'use client';

import AppointmentForm from '@/components/AppointmentForm';
import HomePageHeader from '@/components/HomePageHeader';
import { MainLayout } from '@/components/MainLayout';
import {
  Typography,
  Container,
  Box,
  Paper,
} from '@mui/material';

export default function NewAppointmentPage() {
  return (
    <MainLayout
      breadcrumbs={[
        { label: 'Start', href: '/' },
        { label: 'Neue Termin Anfrage', href: '/neue-anfrage', active: true },
      ]}
    >
      <Container maxWidth="lg">
        <HomePageHeader 
          mainTitle="Neuet Termin" 
          subtitle="Online-Formular zur Einreichung von Veranstaltungen"
          introText="Das nachfolgende Formular bietet die Möglichkeit neue Termine in den Kalender und den Newsletter aufnehmen zu lassen. Es erfolgt eine Freigabe durch den Kreisvorstand."
        />      
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