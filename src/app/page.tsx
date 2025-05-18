'use client';

import { MainLayout } from '@/components/MainLayout';
import {
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
} from '@mui/material';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import Link from 'next/link';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import EventIcon from '@mui/icons-material/Event';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AddIcon from '@mui/icons-material/Add';
import GroupsSection from '@/components/GroupsSection';
import { grey } from '@mui/material/colors';

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
        
        let data;
        try {
          data = await response.json();
        } catch (jsonError) {
          console.warn('Failed to parse JSON response, setting empty appointments');
          setAppointments([]);
          return;
        }
        
        // Ensure that data is an array
        if (Array.isArray(data)) {
          setAppointments(data);
        } else if (data && Array.isArray(data.appointments)) {
          // In case the API returns an object with an appointments array
          setAppointments(data.appointments);
        } else if (data && Object.keys(data).length === 0) {
          // Handle empty object response - treat as empty array
          console.log('API returned empty object, treating as empty appointments array');
          setAppointments([]);
        } else if (!data) {
          // Handle null or undefined response
          console.log('API returned null or undefined, treating as empty array');
          setAppointments([]);
        } else {
          // Only log as warning if it's really an unexpected format
          console.warn('API returned unexpected format:', data);
          setAppointments([]);
        }
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
    <MainLayout
      breadcrumbs={[
        { label: 'Start', href: '/', active: true }
      ]}
    >
      <Container maxWidth="lg">
        {/* Title section container */}
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
              Die Linke Frankfurt - Mitglieder Portal
            </Typography>
          </Box>

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
              Willkommen auf unserer Seite. Hier finden Sie alle Termine der Partei in Frankfurt.
            </Typography>
          </Box>
        </Box>

        <Divider> <b>Termine</b> </Divider>
        
        {/* Call to action button */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'left',
            mb: 4,
            mt: 2
          }}
        >
          <Button 
            href="/neue-anfrage"
            variant="outlined" 
            size="large"
            startIcon={<AddIcon />}
            LinkComponent={Link}
          >
            Neuen Termin eintragen
          </Button>
        </Box>

        {/* Content */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="error" paragraph>
              Fehler beim laden der Termine
            </Typography>
          </Paper>
        ) : appointments.length === 0 ? (
          <Paper sx={{ p: 5, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary" paragraph>
              Aktuell sind keine anstehenden Termine vorhanden.
            </Typography>
          </Paper>
        ) : (
          <>
            <Typography variant="h5" component="h3" sx={{ fontWeight: 'fontWeightBold', mb: 3 }}>
              Anstehende Veranstaltungen
            </Typography>
            
            <Grid container spacing={3}>
              {Array.isArray(appointments) && appointments.map((appointment) => (
                <Grid key={appointment.id} size={{ xs: 12}}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                        {appointment.title}
                      </Typography>
                      
                      <Box mt={1} mb={1}>
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
                        LinkComponent={Link}
                      >
                        Details anzeigen
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </>
        )}
        {/* Gruppen */}
        <Divider sx={{ mt: 5 }}> <b>Gruppen</b> </Divider>
        
        {/* Call to action button */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'left',
            mb: 4,
            mt: 2
          }}
        >
          <Button 
            href="/gruppen-bericht"
            variant="outlined" 
            size="large"
            startIcon={<AddIcon />}
            LinkComponent={Link}
          >
            Neuen Gruppenbericht senden
          </Button>
        </Box>
        
        {/* Active Groups Section */}
        <GroupsSection />
        
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