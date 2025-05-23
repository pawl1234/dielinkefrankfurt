'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import {
  Typography,
  Container,
  Box,
  Paper,
  Button,
  Divider,
  Chip,
  CircularProgress,
  Card,
  CardMedia,
} from '@mui/material';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import Link from 'next/link';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import EventIcon from '@mui/icons-material/Event';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

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

type Params = {
  id: string;
};


// @ts-ignore - Suppressing Next.js PageProps error
export default function AppointmentDetailPage() {
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get params using the useParams hook
  const params = useParams();
  const id = params?.id as string;

  useEffect(() => {
    const fetchAppointment = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/appointments?id=${id}`);

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

    if (id) {
      fetchAppointment();
    }
  }, [id]);

  return (
    <MainLayout
      breadcrumbs={[
        { label: 'Termine', href: '/' },
        { label: 'Termindetails', href: `/termine/${params?.id}`, active: true },
      ]}
    >
      <Container maxWidth="lg" sx={{ py: 2 }}>
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
              }}>
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
            
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4 }}>
              <Box sx={{ flex: '1 1 auto', width: { xs: '100%', md: '60%' } }}>
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
              </Box>

              <Box sx={{ width: { xs: '100%', md: '35%' } }}>
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
              </Box>
            </Box>
            
            {appointment.fileUrls && (
              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'medium' }}>
                  Dateien und Anhänge
                </Typography>
                
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  {JSON.parse(appointment.fileUrls).map((fileUrl: string, index: number) => {
                    const isImage = fileUrl.endsWith('.jpg') || fileUrl.endsWith('.jpeg') || fileUrl.endsWith('.png');
                    const isPdf = fileUrl.endsWith('.pdf');
                    const fileName = fileUrl.split('/').pop() || `Datei-${index + 1}`;
                    
                    return (
                      <Box 
                        key={fileUrl}
                        sx={{ 
                          width: { xs: '100%', sm: '45%', md: '30%', lg: '22%' }, 
                          mb: 2 
                        }}
                      >
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
                      </Box>
                    );
                  })}
                </Box>
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
            </Box>
          </Paper>
        ) : null}
      </Container>
    </MainLayout>
  );
}