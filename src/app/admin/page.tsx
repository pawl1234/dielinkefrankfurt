'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Divider,
  List,
  ListItem,
  ListItemText,
  CardMedia,
  IconButton,
  Chip,
  Container,
  AppBar,
  Toolbar,
  Button,
  CircularProgress,
  Card,
  CardContent,
  CardActions,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LogoutIcon from '@mui/icons-material/Logout';
import EventIcon from '@mui/icons-material/Event';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { signOut } from 'next-auth/react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

// Define the Appointment type based on our Prisma schema
interface Appointment {
  id: number;
  teaser: string;
  mainText: string;
  startDateTime: string;
  endDateTime: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  firstName: string | null;
  lastName: string | null;
  recurringText: string | null;
  fileUrls: string | null;
  createdAt: string;
  processed: boolean;
  processingDate: string | null;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    // Redirect if not authenticated
    if (status === 'unauthenticated') {
      router.push('/admin/login');
    }
  }, [status, router]);

  useEffect(() => {
    // Fetch appointments when authenticated
    if (status === 'authenticated') {
      fetchAppointments();
    }
  }, [status]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/appointments');
      
      if (!response.ok) {
        throw new Error('Failed to fetch appointments');
      }
      
      const data = await response.json();
      setAppointments(data);
      setError(null);
    } catch (err) {
      setError('Failed to load appointments. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessAppointment = async (id: number, processed: boolean) => {
    try {
      const response = await fetch('/api/admin/appointments', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, processed }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update appointment');
      }
      
      // Refresh appointments after update
      fetchAppointments();
    } catch (err) {
      console.error(err);
      setError('Failed to update appointment status.');
    }
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleLogout = () => {
    signOut({ callbackUrl: '/admin/login' });
  };

  // Filter appointments based on the selected tab
  const filteredAppointments = appointments.filter(appointment => 
    (tabValue === 0 && !appointment.processed) || (tabValue === 1 && appointment.processed)
  );

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static" color="primary">
        <Toolbar>
          <EventIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Terminanfragen-Verwaltung
          </Typography>
          <Button 
            color="inherit" 
            onClick={handleLogout}
            startIcon={<LogoutIcon />}
          >
            Abmelden
          </Button>
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 0, mb: 4 }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="primary"
            variant="fullWidth"
          >
            <Tab label="Neue Anfragen" />
            <Tab label="Archiv" />
          </Tabs>
        </Paper>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="error">{error}</Typography>
          </Paper>
        ) : filteredAppointments.length === 0 ? (
          <Paper sx={{ p: 5, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              {tabValue === 0 
                ? 'Keine neuen Terminanfragen vorhanden.'
                : 'Keine archivierten Terminanfragen vorhanden.'}
            </Typography>
          </Paper>
        ) : (
          <Grid size={12} container spacing={3}>
            {filteredAppointments.map((appointment) => (
              <Grid item xs={12} key={appointment.id}>
                <Accordion>
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    aria-controls={`appointment-${appointment.id}-content`}
                    id={`appointment-${appointment.id}-header`}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                      <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                          Teaser Text
                        </Typography>
                        <Typography variant="subtitle1">
                          {appointment.teaser}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {appointment.firstName} {appointment.lastName} • {format(new Date(appointment.startDateTime), 'PPP', { locale: de })}
                        </Typography>
                      </Box>
                      <Box>
                        {!appointment.processed ? (
                          <IconButton 
                            color="primary" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleProcessAppointment(appointment.id, true);
                            }}
                            size="small"
                            sx={{ 
                              borderRadius: 1,
                              bgcolor: 'rgba(25, 118, 210, 0.08)',
                              '&:hover': {
                                bgcolor: 'rgba(25, 118, 210, 0.12)',
                              },
                              px: 1
                            }}
                          >
                            <CheckCircleIcon fontSize="small" sx={{ mr: 0.5 }} />
                            <Typography variant="button">
                              Erledigt
                            </Typography>
                          </IconButton>
                        ) : (
                          <Chip 
                            label={`Erledigt am ${format(new Date(appointment.processingDate!), 'dd.MM.yyyy', { locale: de })}`}
                            color="success" 
                            variant="outlined"
                            size="small"
                          />
                        )}
                      </Box>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Divider sx={{ mb: 2 }} />
                    
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="h6" gutterBottom>
                          Veranstaltungsdetails
                        </Typography>
                        
                        <Typography variant="body1" sx={{ mb: 1 }} dangerouslySetInnerHTML={{ __html: appointment.mainText }} />
                        
                        {appointment.recurringText && (
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="subtitle2">
                              Wiederholungsdetails:
                            </Typography>
                            <Typography variant="body2">
                              {appointment.recurringText}
                            </Typography>
                          </Box>
                        )}
                        
                        {appointment.fileUrls && (
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>
                              Angehängte Dateien:
                            </Typography>
                            <Grid container spacing={1}>
                              {JSON.parse(appointment.fileUrls).map((fileUrl: string, index: number) => {
                                const isImage = fileUrl.endsWith('.jpg') || fileUrl.endsWith('.jpeg') || fileUrl.endsWith('.png');
                                const isPdf = fileUrl.endsWith('.pdf');
                                const fileName = fileUrl.split('/').pop() || `File-${index + 1}`;

                                return (
                                  <Grid item xs={12} sm={6} md={4} key={fileUrl}>
                                    <Card variant="outlined" sx={{ mb: 1 }}>
                                      {isImage && (
                                        <CardMedia
                                          component="img"
                                          height="140"
                                          image={fileUrl}
                                          alt={`Attachment ${index + 1}`}
                                          sx={{ objectFit: 'cover' }}
                                        />
                                      )}
                                      {isPdf && (
                                        <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
                                          <PictureAsPdfIcon sx={{ fontSize: 40, color: 'error.main' }} />
                                        </Box>
                                      )}
                                      <CardContent sx={{ py: 1 }}>
                                        <Typography variant="caption" noWrap title={fileName}>
                                          {fileName}
                                        </Typography>
                                      </CardContent>
                                      <CardActions>
                                        <Button
                                          variant="outlined"
                                          size="small"
                                          href={fileUrl}
                                          target="_blank"
                                          fullWidth
                                        >
                                          Öffnen
                                        </Button>
                                      </CardActions>
                                    </Card>
                                  </Grid>
                                );
                              })}
                            </Grid>
                          </Box>
                        )}
                      </Grid>
                      
                      <Grid item xs={12} md={6}>
                        <Typography variant="h6" gutterBottom>
                          Datum & Ort
                        </Typography>
                        
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2">
                            Startzeit:
                          </Typography>
                          <Typography variant="body1">
                            {format(new Date(appointment.startDateTime), 'PPPp', { locale: de })}
                          </Typography>
                        </Box>
                        
                        {appointment.endDateTime && (
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2">
                              Endzeit:
                            </Typography>
                            <Typography variant="body1">
                              {format(new Date(appointment.endDateTime), 'PPPp', { locale: de })}
                            </Typography>
                          </Box>
                        )}
                        
                        {(appointment.street || appointment.city || appointment.state || appointment.postalCode) && (
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>
                              Ort:
                            </Typography>
                            <Typography variant="body2">
                              {appointment.street && `${appointment.street}`}
                              {appointment.street && <br />}
                              {appointment.postalCode && appointment.city && `${appointment.postalCode} ${appointment.city}`}
                              {(appointment.postalCode || appointment.city) && <br />}
                              {appointment.state && `${appointment.state}`}
                            </Typography>
                          </Box>
                        )}
                        
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Kontakt:
                          </Typography>
                          <Typography variant="body2">
                            {appointment.firstName} {appointment.lastName}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Anfrage erhalten:
                          </Typography>
                          <Typography variant="body2">
                            {format(new Date(appointment.createdAt), 'PPPp', { locale: de })}
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>

                    {tabValue === 1 && (
                      <Button 
                        variant="outlined"
                        color="primary"
                        onClick={() => handleProcessAppointment(appointment.id, false)}
                        sx={{ mt: 2 }}
                      >
                        Zurück zu offenen Anfragen
                      </Button>
                    )}
                  </AccordionDetails>
                </Accordion>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </Box>
  );
}