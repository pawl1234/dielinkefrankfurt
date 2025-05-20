// src/components/HomePageContent.tsx (or any other suitable location)
'use client';

import { useState, useEffect, Suspense } from 'react'; // Add Suspense here or in parent
import { useSearchParams } from 'next/navigation';
import {
  Typography,
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
  Pagination,
} from '@mui/material';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import Link from 'next/link';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import EventIcon from '@mui/icons-material/Event';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AddIcon from '@mui/icons-material/Add';
import GroupsSection from '@/components/GroupsSection'; // Keep this if it doesn't use searchParams directly

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

export default function HomePageContent() {
  const searchParams = useSearchParams(); // Now safe to use here
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(5);

  useEffect(() => {
    const scrollToSection = () => {
      const scrollTarget = searchParams?.get('section');
      const hash = window.location.hash.replace('#', '');
      const targetId = scrollTarget || hash;
      if (targetId) {
        const element = document.getElementById(targetId);
        if (element) {
          setTimeout(() => element.scrollIntoView({ behavior: 'smooth' }), 100);
        }
      }
    };
    scrollToSection();
  }, [searchParams]);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/appointments?page=${page}&pageSize=${pageSize}`);
        if (!response.ok) throw new Error('Failed to fetch appointments');
        let data;
        try {
          data = await response.json();
        } catch (jsonError) {
          setAppointments([]); return;
        }
        if (Array.isArray(data)) {
          setAppointments(data);
        } else if (data && Array.isArray(data.items)) {
          setAppointments(data.items);
          setTotalPages(data.totalPages || 1);
          if (data.page) setPage(data.page);
        } else if (data && Array.isArray(data.appointments)) {
          setAppointments(data.appointments);
        } else if (data && Object.keys(data).length === 0) {
          setAppointments([]);
        } else if (!data) {
          setAppointments([]);
        } else {
          setAppointments([]);
        }
      } catch (err) {
        setError('Failed to load appointments. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchAppointments();
  }, [page, pageSize]);

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {/* Title section container - this could also be in the parent if it doesn't use searchParams */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'inline-block', bgcolor: 'primary.main', color: 'common.white', p: { xs: 1.5, md: 2 }}}>
          <Typography variant="h4" component="h2" sx={{ fontWeight: 'fontWeightBold' }}>
            Die Linke Frankfurt - Mitglieder Portal
          </Typography>
        </Box>
        <Box sx={{ display: 'inline-block', bgcolor: 'secondary.main', color: 'common.white', p: { xs: 1.5, md: 1.5 }, ml: { xs: 3, md: 4 }}}>
          <Typography variant="body1" sx={{ fontWeight: 'fontWeightMedium' }}>
            Willkommen auf unserer Seite. Hier finden Sie alle Termine der Partei in Frankfurt.
          </Typography>
        </Box>
      </Box>

      <Divider id="appointments"> <b>Termine</b> </Divider>
      
      <Box sx={{ display: 'flex', justifyContent: 'left', mb: 4, mt: 2 }}>
        <Button href="/neue-anfrage" variant="outlined" size="large" startIcon={<AddIcon />} LinkComponent={Link}>
          Neuen Termin eintragen
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress /></Box>
      ) : error ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}><Typography color="error" paragraph>{error}</Typography></Paper>
      ) : appointments.length === 0 ? (
        <Paper sx={{ p: 5, textAlign: 'center' }}><Typography variant="h6" color="text.secondary" paragraph>Aktuell sind keine anstehenden Termine vorhanden.</Typography></Paper>
      ) : (
        <>
          <Typography variant="h5" component="h3" sx={{ fontWeight: 'fontWeightBold', mb: 3 }}>
            Anstehende Veranstaltungen
          </Typography>
          <Grid container spacing={3}>
            {appointments.map((appointment) => (
              <Grid size={{ xs: 12 }} key={appointment.id}> {/* Corrected Grid syntax */}
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{appointment.title}</Typography>
                    <Box mt={1} mb={1}>
                      <Chip icon={<CalendarTodayIcon />} label={format(new Date(appointment.startDateTime), 'dd. MMM', { locale: de })} size="small" color="primary" variant="outlined" sx={{mr:0.5, mb:0.5}}/>
                      <Chip icon={<EventIcon />} label={format(new Date(appointment.startDateTime), 'HH:mm', { locale: de })} size="small" color="primary" variant="outlined" sx={{mr:0.5, mb:0.5}}/>
                      {appointment.city && (<Chip icon={<LocationOnIcon />} label={appointment.city} size="small" color="primary" variant="outlined" sx={{mr:0.5, mb:0.5}}/>)}
                    </Box>
                    <Typography variant="body1" sx={{ mb: 2, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', color: 'text.secondary', flexGrow: 1 }}>
                      {appointment.teaser}
                    </Typography>
                  </CardContent>
                  <CardActions sx={{ p: 2, pt: 0 }}>
                    <Button href={`/termine/${appointment.id}`} variant="contained" LinkComponent={Link}>Details anzeigen</Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 2 }}>
              <Pagination count={totalPages} page={page} onChange={handlePageChange} color="primary" size="large" siblingCount={1} />
            </Box>
          )}
        </>
      )}
      <Divider id="groups" sx={{ mt: 5 }}> <b>Gruppen</b> </Divider>
      <Box sx={{ display: 'flex', justifyContent: 'left', mb: 4, mt: 2 }}>
        <Button href="/gruppen-bericht" variant="outlined" size="large" startIcon={<AddIcon />} LinkComponent={Link}>
          Neuen Gruppenbericht senden
        </Button>
      </Box>
      <GroupsSection />
      <Box component="footer" sx={{ mt: 3, textAlign: 'center', pb: 3 }}>          
        <Typography variant="body2" color="text.secondary">
          © {new Date().getFullYear()} Die Linke Frankfurt am Main
        </Typography>
      </Box>
    </>
  );
}