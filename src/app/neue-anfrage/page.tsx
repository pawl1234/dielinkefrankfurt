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
  Button,
  IconButton
} from '@mui/material';
import Link from 'next/link';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HomeIcon from '@mui/icons-material/Home';
import SearchIcon from '@mui/icons-material/Search';

export default function NewAppointmentPage() {
  return (
    <MuiSetup>
      {/* Main header with logo and background */}
      <Box
        sx={{
          position: 'relative',
          backgroundImage: 'url("/images/header-bg.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          py: { xs: 3, md: 4 },
          mb: 4
        }}
      >
        {/* Header actions - positioned absolutely in top right */}
        <Paper
          elevation={2}
          sx={{
            p: 0.5,
            display: 'flex',
            alignItems: 'center',
            borderRadius: 1,
            bgcolor: 'common.white',
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 10
          }}
        >
          <IconButton
            aria-label="search"
            sx={{
              mr: 0.5,
              color: 'grey.700',
              fontSize: 'large',
              p: { xs: 1, md: 1.5 }
            }}
          >
            <SearchIcon sx={{ fontSize: 28 }} />
          </IconButton>
          <Link href="/" style={{ display: 'flex' }}>
            <IconButton
              aria-label="home"
              sx={{
                color: 'grey.700',
                fontSize: 'large',
                p: { xs: 1, md: 1.5 }
              }}
            >
              <HomeIcon sx={{ fontSize: 28 }} />
            </IconButton>
          </Link>
        </Paper>

        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'flex-start',
              alignItems: 'center',
              width: '100%'
            }}
          >
            {/* Logo */}
            <Box
              component="div"
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: { xs: 'center', md: 'flex-start' }
              }}
            >
              <Box
                component="img"
                src="/images/logo.png"
                alt="Die Linke Kreisverband Frankfurt Logo"
                sx={{
                  height: 'auto',
                  width: { xs: '220px', md: '280px' },
                  maxWidth: '100%',
                }}
              />
            </Box>
          </Box>
        </Container>
      </Box>

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