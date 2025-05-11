'use client';

import AppointmentForm from '@/components/AppointmentForm';
import MuiSetup from '@/components/MuiSetup';
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  Paper,
  Breadcrumbs,
  Button
} from '@mui/material';
import Link from 'next/link';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export default function NewAppointmentPage() {
  return (
    <MuiSetup>
      <AppBar position="static" sx={{ mb: 4 }}>
        <Toolbar>
          <Typography variant="h6" component="h1" sx={{ fontWeight: 'bold', letterSpacing: 1 }}>
            Die Linke Frankfurt
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 4 }}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 3 }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <Typography color="inherit" sx={{ '&:hover': { textDecoration: 'underline' }, cursor: 'pointer' }}>
              Termine
            </Typography>
          </Link>
          <Typography color="text.primary">Neue Anfrage</Typography>
        </Breadcrumbs>

        <Button
          href="/"
          startIcon={<ArrowBackIcon />}
          variant="outlined"
          sx={{ mb: 3 }}
          LinkComponent={Link}
        >
          Zurück zur Übersicht
        </Button>

        <Box
          sx={{
            bgcolor: 'primary.main',
            color: 'white',
            py: 3,
            px: 4,
            mb: 4,
            borderRadius: 1,
            textAlign: 'center',
            boxShadow: 3
          }}
        >
          <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 'bold' }}>
            Termin-Anmeldung
          </Typography>
          <Typography variant="h6" component="p" sx={{ fontWeight: 'medium' }}>
            Online-Formular zur Einreichung von Veranstaltungen
          </Typography>
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
    </MuiSetup>
  );
}