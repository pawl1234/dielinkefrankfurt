'use client';

import MuiSetup from '@/components/MuiSetup';
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  Paper,
  Card,
  CardContent,
  Button,
  Grid,
  Divider,
  Chip,
  CircularProgress,
  CardActions,
  CardHeader
} from '@mui/material';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import Link from 'next/link';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import EventIcon from '@mui/icons-material/Event';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AddIcon from '@mui/icons-material/Add';

interface Appointment {
  id: number;
  title: string;
  teaser: string;
  startDateTime: string;
  endDateTime: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
}

export default function Home() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/appointments');

        if (!response.ok) {
          throw new Error('Failed to fetch appointments');
        }

        const data = await response.json();
        setAppointments(data);
      } catch (err) {
        console.error('Error fetching appointments:', err);
        setError('Failed to load appointments. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, []);

  return (
    <MuiSetup>
      <AppBar position="static" sx={{ mb: 4 }}>
        <Toolbar>
          <Typography variant="h6" component="h1" sx={{ fontWeight: 'bold', letterSpacing: 1 }}>
            Die Linke Frankfurt
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 2 }}>
        <Box
          sx={{
            bgcolor: 'primary.main',
            color: 'white',
            py: 4,
            px: 4,
            mb: 4,
            borderRadius: 2,
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 3,
            boxShadow: 3
          }}
        >
          <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
            <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 'bold' }}>
              Termine & Veranstaltungen
            </Typography>
            <Typography variant="h6" component="p" sx={{ mb: 0 }}>
              Aktuelle Events der Partei „Die Linke" in Frankfurt
            </Typography>
          </Box>
          <Button
            href="/neue-anfrage"
            variant="contained"
            size="large"
            color="secondary"
            startIcon={<AddIcon />}
            LinkComponent={Link}
            sx={{
              py: 1.5,
              px: 3,
              boxShadow: 2,
              fontSize: '1.1rem',
              fontWeight: 'bold'
            }}
          >
            Termin anfragen
          </Button>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="error" paragraph>{error}</Typography>
            <Button
              href="/neue-anfrage"
              variant="contained"
              LinkComponent={Link}
            >
              Neuen Termin anfragen
            </Button>
          </Paper>
        ) : appointments.length === 0 ? (
          <Paper sx={{ p: 5, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary" paragraph>
              Aktuell sind keine anstehenden Termine vorhanden.
            </Typography>
            <Button
              href="/neue-anfrage"
              variant="contained"
              startIcon={<AddIcon />}
              LinkComponent={Link}
            >
              Termin anfragen
            </Button>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {appointments.map((appointment) => (
              <Grid item xs={12} sm={6} md={4} key={appointment.id}>
                <Card elevation={2} sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: 6
                  }
                }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography
                      variant="h5"
                      component="h3"
                      gutterBottom
                      sx={{
                        fontWeight: 'medium',
                        color: 'primary.main',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        mb: 1
                      }}
                    >
                      {appointment.title}
                    </Typography>

                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                      <Chip
                        icon={<CalendarTodayIcon />}
                        label={format(new Date(appointment.startDateTime), 'dd. MMM', { locale: de })}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                      <Chip
                        icon={<EventIcon />}
                        label={format(new Date(appointment.startDateTime), 'HH:mm', { locale: de })}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                      {appointment.city && (
                        <Chip
                          icon={<LocationOnIcon />}
                          label={appointment.city}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      )}
                    </Box>

                    <Typography
                      variant="body1"
                      sx={{
                        mb: 2,
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        color: 'text.secondary',
                        flexGrow: 1
                      }}
                    >
                      {appointment.teaser}
                    </Typography>
                  </CardContent>

                  <CardActions sx={{ p: 2, pt: 0 }}>
                    <Button
                      href={`/termine/${appointment.id}`}
                      variant="contained"
                      fullWidth
                      LinkComponent={Link}
                    >
                      Details anzeigen
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            mt: 6,
            mb: 4
          }}
        >
          <Button
            href="/neue-anfrage"
            variant="outlined"
            size="large"
            startIcon={<AddIcon />}
            LinkComponent={Link}
          >
            Eigenen Termin anfragen
          </Button>
        </Box>

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