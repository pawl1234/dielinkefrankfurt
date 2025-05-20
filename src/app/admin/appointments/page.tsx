'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/MainLayout';
import AdminNavigation from '@/components/AdminNavigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminStatusTabs from '@/components/admin/AdminStatusTabs';
import AdminPagination from '@/components/admin/AdminPagination';
import AdminNotification from '@/components/admin/AdminNotification';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Chip,
  Container,
  Button,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Grid,
  CardMedia,
  CardContent,
  CardActions,
  Card
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EventIcon from '@mui/icons-material/Event';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import EditIcon from '@mui/icons-material/Edit';
import CancelIcon from '@mui/icons-material/Cancel';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import FeaturedToggle from '@/components/newsletter/FeaturedToggle';
import EditAppointmentWrapper from '@/components/EditAppointmentWrapper';
import { useAdminState } from '@/hooks/useAdminState';

// Define the Appointment type based on our Prisma schema
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
  firstName: string | null;
  lastName: string | null;
  recurringText: string | null;
  fileUrls: string | null;
  featured: boolean;
  createdAt: string;
  processed: boolean;
  processingDate: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  metadata?: string | null;
}

export default function AdminAppointmentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // Use our custom hook for admin state management
  const adminState = useAdminState<Appointment>();
  
  // Define view types
  type ViewType = 'pending' | 'upcoming' | 'archive';
  const views: ViewType[] = ['pending', 'upcoming', 'archive'];
  
  // Get current view
  const currentView = views[adminState.tabValue];
  
  useEffect(() => {
    // Redirect if not authenticated
    if (status === 'unauthenticated') {
      router.push('/admin/login');
    }
  }, [status, router]);
  
  useEffect(() => {
    // Fetch appointments when authenticated
    if (status === 'authenticated') {
      fetchAppointments(views[adminState.tabValue]);
    }
  }, [status, adminState.tabValue, adminState.page, adminState.pageSize, adminState.timestamp]);

  const fetchAppointments = async (view: ViewType) => {
    try {
      adminState.setLoading(true);
      const response = await fetch(`/api/admin/appointments?view=${view}&page=${adminState.page}&pageSize=${adminState.pageSize}&t=${adminState.timestamp}`);

      if (!response.ok) {
        throw new Error('Failed to fetch appointments');
      }

      const data = await response.json();
      console.log('API response data:', data);
      
      if (data && data.items && Array.isArray(data.items)) {
        adminState.setItems(data.items);
        adminState.setPaginationData({
          totalItems: data.totalItems || 0,
          totalPages: data.totalPages || 1
        });
      } else if (Array.isArray(data)) {
        adminState.setItems(data);
      } else if (data && Array.isArray(data.appointments)) {
        adminState.setItems(data.appointments);
      } else {
        console.warn('Unexpected API response format:', data);
        adminState.setItems([]);
      }
      
      adminState.setError(null);
    } catch (err) {
      adminState.setError('Failed to load appointments. Please try again.');
      console.error(err);
    } finally {
      adminState.setLoading(false);
    }
  };

  const handleAppointmentUpdate = async (id: number, data: { processed?: boolean, status?: 'pending' | 'accepted' | 'rejected' }) => {
    try {
      const response = await fetch('/api/admin/appointments', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, ...data }),
      });

      if (!response.ok) {
        throw new Error('Failed to update appointment');
      }

      // Show success notification
      adminState.showNotification(
        'Termin wurde erfolgreich aktualisiert.',
        'success'
      );

      // Refresh appointments after update
      adminState.refreshTimestamp();
      fetchAppointments(views[adminState.tabValue]);
    } catch (err) {
      console.error(err);
      adminState.showNotification(
        'Fehler beim Aktualisieren des Termins.',
        'error'
      );
    }
  };

  // Process appointment (legacy method, keep for backward compatibility)
  const handleProcessAppointment = async (id: number, processed: boolean) => {
    await handleAppointmentUpdate(id, { processed });
  };

  // New methods for accepting/rejecting
  const handleAcceptAppointment = async (id: number) => {
    await handleAppointmentUpdate(id, { status: 'accepted' });
  };

  const handleRejectAppointment = async (id: number) => {
    await handleAppointmentUpdate(id, { status: 'rejected' });
  };

  // Define tab labels
  const getTabLabel = (view: ViewType) => {
    switch (view) {
      case 'pending':
        return 'Neue Anfragen';
      case 'upcoming':
        return 'Angenommene Termine';
      case 'archive':
        return 'Archivierte Termine';
      default:
        return view;
    }
  };

  // Get empty state message based on current view
  const getEmptyStateMessage = (view: ViewType) => {
    switch (view) {
      case 'pending':
        return 'Keine neuen Terminanfragen vorhanden.';
      case 'upcoming':
        return 'Keine anstehenden Termine vorhanden.';
      case 'archive':
        return 'Keine archivierten Termine vorhanden.';
      default:
        return 'Keine Termine gefunden.';
    }
  };

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <MainLayout
      breadcrumbs={[
        { label: 'Start', href: '/' },
        { label: 'Administration', href: '/admin', active: true },
      ]}>
      <Box sx={{ flexGrow: 1 }}>
      
        <Container maxWidth="lg" sx={{ mt: 4, mb: 2 }}>
          {/* Admin Navigation */}
          <AdminNavigation />
          
          {/* Page Header */}
          <AdminPageHeader 
            title="Termine verwalten"
            icon={<EventIcon />}
          />
          
          {/* Status Tabs */}
          <AdminStatusTabs 
            value={adminState.tabValue}
            onChange={(_, newValue) => adminState.setTabValue(newValue)}
            tabs={views.map(view => getTabLabel(view))}
          />

          {adminState.loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
              <CircularProgress />
            </Box>
          ) : adminState.error ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="error">{adminState.error}</Typography>
            </Paper>
          ) : adminState.items.length === 0 ? (
            <Paper sx={{ p: 5, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                {getEmptyStateMessage(currentView)}
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {adminState.items.map((appointment) => (
                <Grid size={{ xs: 12 }} key={appointment.id}>
                  <Accordion>
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon />}
                      aria-controls={`appointment-${appointment.id}-content`}
                      id={`appointment-${appointment.id}-header`}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                            {appointment.title}
                          </Typography>
                          <Typography variant="body2">
                            {appointment.teaser}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {appointment.firstName} {appointment.lastName} • {format(new Date(appointment.startDateTime), 'PPP', { locale: de })}
                          </Typography>
                        </Box>
                        <Box>
                          {/* Show different controls based on the current view and appointment status */}
                          {currentView === 'pending' && (
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <IconButton
                                component="span"
                                color="success"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAcceptAppointment(appointment.id);
                                }}
                                size="small"
                                sx={{
                                  borderRadius: 1,
                                  bgcolor: 'rgba(46, 125, 50, 0.08)',
                                  '&:hover': {
                                    bgcolor: 'rgba(46, 125, 50, 0.12)',
                                  },
                                  px: 1
                                }}
                              >
                                <CheckCircleIcon fontSize="small" sx={{ mr: 0.5 }} />
                                <Typography variant="button">
                                  Annehmen
                                </Typography>
                              </IconButton>

                              <IconButton
                                component="span"
                                color="error"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRejectAppointment(appointment.id);
                                }}
                                size="small"
                                sx={{
                                  borderRadius: 1,
                                  bgcolor: 'rgba(211, 47, 47, 0.08)',
                                  '&:hover': {
                                    bgcolor: 'rgba(211, 47, 47, 0.12)',
                                  },
                                  px: 1
                                }}
                              >
                                <CancelIcon fontSize="small" sx={{ mr: 0.5 }} />
                                <Typography variant="button">
                                  Ablehnen
                                </Typography>
                              </IconButton>
                              
                              <IconButton
                                component="span"
                                color="secondary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Open the accordion to allow editing
                                  const accordionSummary = e.currentTarget.closest('.MuiAccordionSummary-root');
                                  if (accordionSummary && !accordionSummary.classList.contains('Mui-expanded')) {
                                    (accordionSummary as HTMLElement).click();
                                  }
                                  // Wait for accordion animation to complete before showing edit form
                                  setTimeout(() => {
                                    const editButton = document.querySelector(`[data-appointment-id="${appointment.id}"]`);
                                    if (editButton) {
                                      (editButton as HTMLButtonElement).click();
                                    }
                                  }, 300);
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
                                <EditIcon fontSize="small" sx={{ mr: 0.5 }} />
                                <Typography variant="button">
                                  Bearbeiten
                                </Typography>
                              </IconButton>
                            </Box>
                          )}

                          {currentView === 'upcoming' && (
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Chip
                                label={`Bestätigt: ${format(new Date(appointment.processingDate!), 'dd.MM.yyyy', { locale: de })}`}
                                color="success"
                                variant="outlined"
                                size="small"
                              />
                              <IconButton
                                component="span"
                                color="primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Open the accordion to allow editing
                                  const accordionSummary = e.currentTarget.closest('.MuiAccordionSummary-root');
                                  if (accordionSummary && !accordionSummary.classList.contains('Mui-expanded')) {
                                    (accordionSummary as HTMLElement).click();
                                  }
                                  // Wait for accordion animation to complete before showing edit form
                                  setTimeout(() => {
                                    const editButton = document.querySelector(`[data-appointment-id="${appointment.id}"]`);
                                    if (editButton) {
                                      (editButton as HTMLButtonElement).click();
                                    }
                                  }, 300);
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
                                <EditIcon fontSize="small" sx={{ mr: 0.5 }} />
                                <Typography variant="button">
                                  Bearbeiten
                                </Typography>
                              </IconButton>
                            </Box>
                          )}

                          {currentView === 'archive' && (
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Chip
                                label={appointment.status === 'accepted' ? 'Angenommen' : 'Abgelehnt'}
                                color={appointment.status === 'accepted' ? 'success' : 'error'}
                                variant="outlined"
                                size="small"
                              />
                              <IconButton
                                component="span"
                                color="primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Open the accordion to allow editing
                                  const accordionSummary = e.currentTarget.closest('.MuiAccordionSummary-root');
                                  if (accordionSummary && !accordionSummary.classList.contains('Mui-expanded')) {
                                    (accordionSummary as HTMLElement).click();
                                  }
                                  // Wait for accordion animation to complete before showing edit form
                                  setTimeout(() => {
                                    const editButton = document.querySelector(`[data-appointment-id="${appointment.id}"]`);
                                    if (editButton) {
                                      (editButton as HTMLButtonElement).click();
                                    }
                                  }, 300);
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
                                <EditIcon fontSize="small" sx={{ mr: 0.5 }} />
                                <Typography variant="button">
                                  Bearbeiten
                                </Typography>
                              </IconButton>
                            </Box>
                          )}
                        </Box>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Divider sx={{ mb: 2 }} />
                      
                      <EditAppointmentWrapper
                        appointment={appointment}
                        onEditComplete={() => {
                          // Update timestamp to force refresh and break image cache
                          adminState.refreshTimestamp();
                          fetchAppointments(views[adminState.tabValue]);
                        }}
                        appointmentComponent={
                          <>
                            <Grid container spacing={3}>
                              <Grid size={{ xs: 8 }}>
                                <Typography variant="h6" gutterBottom>
                                  Veranstaltungsdetails
                                </Typography>
                                
                                <Typography variant="body1" sx={{ mb: 1 }} dangerouslySetInnerHTML={{ __html: appointment.mainText }} />
                                
                                {appointment.recurringText && (
                                  <Box sx={{ mt: 2 }}>
                                    <Typography variant="subtitle1">
                                      Wiederholungsdetails:
                                    </Typography>
                                    <Typography variant="body1">
                                      {appointment.recurringText}
                                    </Typography>
                                  </Box>
                                )}
                              </Grid>
                              
                              <Grid size={{ xs: 4 }}>
                                <Typography variant="h6" gutterBottom>
                                  Datum & Ort
                                </Typography>
  
                                {/* Featured Toggle - Show for pending and accepted appointments */}
                                {(appointment.status === 'accepted' || appointment.status === 'pending') && (
                                  <Box sx={{ mb: 2 }}>
                                    <FeaturedToggle
                                      appointmentId={appointment.id}
                                      initialFeatured={appointment.featured}
                                      onToggle={() => {
                                        // Add a small delay before refreshing
                                        setTimeout(() => {
                                          adminState.refreshTimestamp();
                                          fetchAppointments(views[adminState.tabValue]);
                                        }, 300);
                                      }}
                                    />
                                  </Box>
                                )}
  
                                <Box sx={{ mb: 2 }}>
                                  <Typography variant="subtitle1">
                                    Startzeit:
                                  </Typography>
                                  <Typography variant="body1">
                                    {format(new Date(appointment.startDateTime), 'PPPp', { locale: de })}
                                  </Typography>
                                </Box>
                                
                                {appointment.endDateTime && (
                                  <Box sx={{ mb: 2 }}>
                                    <Typography variant="subtitle1">
                                      Endzeit:
                                    </Typography>
                                    <Typography variant="body1">
                                      {format(new Date(appointment.endDateTime), 'PPPp', { locale: de })}
                                    </Typography>
                                  </Box>
                                )}
                                
                                {(appointment.street || appointment.city || appointment.state || appointment.postalCode) && (
                                  <Box sx={{ mb: 2 }}>
                                    <Typography variant="subtitle1" gutterBottom>
                                      Ort:
                                    </Typography>
                                    <Typography variant="body1">
                                      {appointment.street && `${appointment.street}`}
                                      {appointment.street && <br />}
                                      {appointment.postalCode && appointment.city && `${appointment.postalCode} ${appointment.city}`}
                                      {(appointment.postalCode || appointment.city) && <br />}
                                      {appointment.state && `${appointment.state}`}
                                    </Typography>
                                  </Box>
                                )}
                                
                                <Box sx={{ mb: 2 }}>
                                  <Typography variant="subtitle1" gutterBottom>
                                    Kontakt:
                                  </Typography>
                                  <Typography variant="body1">
                                    {appointment.firstName} {appointment.lastName}
                                  </Typography>
                                </Box>
                                
                                <Box sx={{ mb: 2 }}>
                                  <Typography variant="subtitle1" gutterBottom>
                                    Anfrage erhalten:
                                  </Typography>
                                  <Typography variant="body1">
                                    {format(new Date(appointment.createdAt), 'PPPp', { locale: de })}
                                  </Typography>
                                </Box>
                              </Grid>
                              <Grid size={{ xs: 12 }}>
                                <Typography variant="h6" gutterBottom>
                                  Anhänge
                                </Typography>
                              
                                {/* Cover images from metadata if available */}
                                {appointment.featured && appointment.metadata && (
                                  <Box sx={{ mt: 2, mb: 3 }} key={`cover-image-container-${adminState.timestamp}`}>
                                    <Typography variant="subtitle2" gutterBottom>
                                      Cover-Bilder (Featured Termin)
                                    </Typography>
                                    <Grid container spacing={2}>
                                      {(() => {
                                        try {
                                          const metadata = JSON.parse(appointment.metadata);
                                          const coverItems = [];
                                          
                                          if (metadata.coverImageUrl) {
                                            const urlKey = metadata.coverImageUrl.split("?")[0];
                                            const originalKey = `original-cover-${urlKey}`;
                                            
                                            coverItems.push(
                                              <Grid size={{ xs: 12, sm: 6 }} key={originalKey}>
                                                <Card variant="outlined" sx={{ mb: 1 }}>
                                                  <CardMedia
                                                    component="img"
                                                    height="140"
                                                    image={metadata.coverImageUrl}
                                                    alt="Original Cover-Bild"
                                                    sx={{ objectFit: 'cover' }}
                                                  />
                                                  <CardContent sx={{ py: 1 }}>
                                                    <Typography variant="caption" noWrap>
                                                      Original Cover-Bild
                                                    </Typography>
                                                  </CardContent>
                                                  <CardActions>
                                                    <Button
                                                      variant="outlined"
                                                      size="small"
                                                      href={metadata.coverImageUrl}
                                                      target="_blank"
                                                      fullWidth
                                                    >
                                                      Öffnen
                                                    </Button>
                                                  </CardActions>
                                                </Card>
                                              </Grid>
                                            );
                                          }
                                          
                                          if (metadata.croppedCoverImageUrl) {
                                            const croppedUrlKey = metadata.croppedCoverImageUrl.split("?")[0];
                                            const croppedKey = `cropped-cover-${croppedUrlKey}`;
                                            
                                            coverItems.push(
                                              <Grid size={{ xs: 12, sm: 6 }} key={croppedKey}>
                                                <Card variant="outlined" sx={{ mb: 1 }}>
                                                  <CardMedia
                                                    component="img"
                                                    height="140"
                                                    image={metadata.croppedCoverImageUrl}
                                                    alt="Zugeschnittenes Cover-Bild (14:5)"
                                                    sx={{ objectFit: 'cover' }}
                                                  />
                                                  <CardContent sx={{ py: 1 }}>
                                                    <Typography variant="caption" noWrap>
                                                      Zugeschnittenes Cover-Bild (14:5)
                                                    </Typography>
                                                  </CardContent>
                                                  <CardActions>
                                                    <Button
                                                      variant="outlined"
                                                      size="small"
                                                      href={metadata.croppedCoverImageUrl}
                                                      target="_blank"
                                                      fullWidth
                                                    >
                                                      Öffnen
                                                    </Button>
                                                  </CardActions>
                                                </Card>
                                              </Grid>
                                            );
                                          }
                                          
                                          return coverItems.length > 0 ? coverItems : (
                                            <Grid size={{ xs: 12 }}>
                                              <Typography variant="body2" color="text.secondary">
                                                Kein Cover-Bild vorhanden.
                                              </Typography>
                                            </Grid>
                                          );
                                        } catch (e) {
                                          console.error("Error parsing metadata:", e);
                                          return (
                                            <Grid size={{ xs: 12 }}>
                                              <Typography variant="body2" color="error">
                                                Fehler beim Laden der Cover-Bilder.
                                              </Typography>
                                            </Grid>
                                          );
                                        }
                                      })()}
                                    </Grid>
                                  </Box>
                                )}
                              
                                {/* Regular attachments */}
                                {appointment.fileUrls && (
                                  <Box sx={{ mt: 2 }}>
                                    <Typography variant="subtitle2" gutterBottom>
                                      Weitere Anhänge
                                    </Typography>
                                    <Grid container spacing={1}>
                                      {JSON.parse(appointment.fileUrls).map((fileUrl: string, index: number) => {
                                        const isImage = fileUrl.endsWith('.jpg') || fileUrl.endsWith('.jpeg') || fileUrl.endsWith('.png');
                                        const isPdf = fileUrl.endsWith('.pdf');
                                        const fileName = fileUrl.split('/').pop() || `File-${index + 1}`;
  
                                        return (
                                          <Grid size={{ xs: 12, sm: 6 }} key={fileUrl}>
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
                            </Grid>
  
                            {/* Show appropriate action buttons based on current view */}
                            <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>                              
                              {currentView === 'archive' && appointment.status === 'rejected' && (
                                <Button
                                  variant="outlined"
                                  color="primary"
                                  onClick={() => handleAppointmentUpdate(appointment.id, { status: 'pending' })}
                                >
                                  Als Anfrage wiederherstellen
                                </Button>
                              )}
  
                              {currentView === 'upcoming' && (
                                <Button
                                  variant="outlined"
                                  color="error"
                                  onClick={() => handleAppointmentUpdate(appointment.id, { status: 'rejected' })}
                                >
                                  Termin absagen
                                </Button>
                              )}
  
                              {currentView === 'pending' && (
                                <>
                                  <Button
                                    variant="contained"
                                    color="success"
                                    onClick={() => handleAcceptAppointment(appointment.id)}
                                  >
                                    Termin annehmen
                                  </Button>
                                  <Button
                                    variant="outlined"
                                    color="error"
                                    onClick={() => handleRejectAppointment(appointment.id)}
                                  >
                                    Anfrage ablehnen
                                  </Button>
                                </>
                              )}
                            </Box>
                          </>
                        }
                      />
                    </AccordionDetails>
                  </Accordion>
                </Grid>
              ))}
            </Grid>
          )}
          
          {/* Pagination */}
          <AdminPagination 
            page={adminState.page}
            totalPages={adminState.totalPages}
            pageSize={adminState.pageSize}
            onPageChange={(page) => adminState.setPage(page)}
            onPageSizeChange={(size) => adminState.setPageSize(size)}
            pageSizeOptions={[5, 10, 25, 50]}
          />
        </Container>
      </Box>

      {/* Notification */}
      <AdminNotification 
        notification={adminState.notification}
        onClose={adminState.closeNotification}
      />
    </MainLayout>
  );
}