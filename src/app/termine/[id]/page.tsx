'use client';

import MuiSetup from '@/components/MuiSetup';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Container, 
  Box, 
  Paper, 
  Grid, 
  Card, 
  CardMedia,
  Button,
  Divider,
  Breadcrumbs,
  Chip,
  CircularProgress,
  Link as MuiLink
} from '@mui/material';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import Link from 'next/link';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import EventIcon from '@mui/icons-material/Event';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import HomeIcon from '@mui/icons-material/Home';
import SearchIcon from '@mui/icons-material/Search';

interface Appointment {
  id: number;
  title: string;
  teaser: string;
  mainText: string;
  startDateTime: string;
  endDateTime: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  recurringText: string | null;
  fileUrls: string | null;
}

export default function AppointmentDetailPage({ params }: { params: { id: string } }) {
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAppointment = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/appointments?id=${params.id}`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Termin nicht gefunden');
          }
          throw new Error('Failed to fetch appointment');
        }

        const data = await response.json();
        setAppointment(data);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Ein Fehler ist aufgetreten');
        }
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchAppointment();
    }
  }, [params.id]);

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

      <Container maxWidth="lg" sx={{ py: 2 }}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 3 }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <Typography color="inherit" sx={{ '&:hover': { textDecoration: 'underline' } }}>
              Termine
            </Typography>
          </Link>
          <Typography color="text.primary">Termindetails</Typography>
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

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="error" variant="h6">{error}</Typography>
            <Button
              href="/"
              variant="contained"
              sx={{ mt: 2 }}
              LinkComponent={Link}
            >
              Zurück zur Terminübersicht
            </Button>
          </Paper>
        ) : appointment ? (
          <Paper elevation={3} sx={{ p: { xs: 2, sm: 4 }, borderRadius: 2 }}>
            <Box sx={{ mb: 4 }}>
              <Typography variant="h4" component="h1" gutterBottom>
                {appointment.title}
              </Typography>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'medium', color: 'primary.main' }}>
                {appointment.teaser}
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
                <Chip 
                  icon={<CalendarTodayIcon />} 
                  label={format(new Date(appointment.startDateTime), 'PPP', { locale: de })}
                  color="primary"
                  variant="outlined"
                />
                <Chip 
                  icon={<EventIcon />} 
                  label={`${format(new Date(appointment.startDateTime), 'HH:mm', { locale: de })} Uhr`}
                  color="primary"
                  variant="outlined"
                />
                {appointment.endDateTime && (
                  <Chip 
                    label={`bis ${format(new Date(appointment.endDateTime), 'HH:mm', { locale: de })} Uhr`}
                    color="primary"
                    variant="outlined"
                  />
                )}
                {appointment.city && (
                  <Chip 
                    icon={<LocationOnIcon />} 
                    label={appointment.city}
                    color="primary"
                    variant="outlined"
                  />
                )}
              </Box>
            </Box>
            
            <Divider sx={{ mb: 3 }} />
            
            <Grid container spacing={4}>
              <Grid item xs={12} md={8}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'medium' }}>
                  Beschreibung
                </Typography>
                <Typography 
                  variant="body1" 
                  sx={{ mb: 3, lineHeight: 1.7 }}
                  dangerouslySetInnerHTML={{ __html: appointment.mainText }}
                />
                
                {appointment.recurringText && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'medium' }}>
                      Wiederholungsinformationen
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 3 }}>
                      {appointment.recurringText}
                    </Typography>
                  </Box>
                )}
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Paper elevation={1} sx={{ p: 3, mb: 3, bgcolor: 'background.paper' }}>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 'medium' }}>
                    Wann und Wo
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="primary">Datum:</Typography>
                    <Typography variant="body1">
                      {format(new Date(appointment.startDateTime), 'EEEE, dd. MMMM yyyy', { locale: de })}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="primary">Uhrzeit:</Typography>
                    <Typography variant="body1">
                      {format(new Date(appointment.startDateTime), 'HH:mm', { locale: de })} Uhr
                      {appointment.endDateTime && ` - ${format(new Date(appointment.endDateTime), 'HH:mm', { locale: de })} Uhr`}
                    </Typography>
                  </Box>
                  
                  {(appointment.street || appointment.city || appointment.postalCode) && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="primary">Ort:</Typography>
                      <Typography variant="body1">
                        {appointment.street && `${appointment.street}`}
                        {appointment.street && <br />}
                        {appointment.postalCode && appointment.city && 
                          `${appointment.postalCode} ${appointment.city}`}
                      </Typography>
                    </Box>
                  )}
                </Paper>
                
                <Button
                  href="/neue-anfrage"
                  variant="contained"
                  fullWidth
                  size="large"
                  sx={{ mb: 3 }}
                  LinkComponent={Link}
                >
                  Neuen Termin anfragen
                </Button>
              </Grid>
            </Grid>
            
            {appointment.fileUrls && (
              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'medium' }}>
                  Dateien und Anhänge
                </Typography>
                
                <Grid container spacing={2}>
                  {JSON.parse(appointment.fileUrls).map((fileUrl: string, index: number) => {
                    const isImage = fileUrl.endsWith('.jpg') || fileUrl.endsWith('.jpeg') || fileUrl.endsWith('.png');
                    const isPdf = fileUrl.endsWith('.pdf');
                    const fileName = fileUrl.split('/').pop() || `Datei-${index + 1}`;
                    
                    return (
                      <Grid item xs={12} sm={6} md={4} lg={3} key={fileUrl}>
                        <Card variant="outlined">
                          {isImage && (
                            <CardMedia
                              component="img"
                              height="160"
                              image={fileUrl}
                              alt={`Anhang ${index + 1}`}
                              sx={{ objectFit: 'cover' }}
                            />
                          )}
                          {isPdf && (
                            <Box sx={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.100' }}>
                              <PictureAsPdfIcon sx={{ fontSize: 60, color: 'error.main' }} />
                            </Box>
                          )}
                          <Box sx={{ p: 2 }}>
                            <Typography variant="body2" noWrap title={fileName}>
                              {fileName}
                            </Typography>
                            <Button
                              variant="outlined"
                              size="small"
                              href={fileUrl}
                              target="_blank"
                              fullWidth
                              sx={{ mt: 1 }}
                            >
                              Öffnen
                            </Button>
                          </Box>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              </Box>
            )}
            
            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
              <Button
                href="/"
                startIcon={<ArrowBackIcon />}
                variant="outlined"
                LinkComponent={Link}
              >
                Alle Termine
              </Button>

              <Button
                href="/neue-anfrage"
                variant="contained"
                LinkComponent={Link}
              >
                Neuen Termin anfragen
              </Button>
            </Box>
          </Paper>
        ) : null}
        
        <Box
          component="footer"
          sx={{
            mt: 6,
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