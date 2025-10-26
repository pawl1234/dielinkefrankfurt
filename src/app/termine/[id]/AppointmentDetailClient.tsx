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
} from '@mui/material';
import { formatLongDate, formatShortDate, formatTime, formatTimeRange } from '@/lib/date-utils';
import Link from 'next/link';
import EventIcon from '@mui/icons-material/Event';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { FileThumbnailGrid, parseFileUrls, parseCoverImages } from '@/components/ui/FileThumbnail';
import { ImageLightbox } from '@/components/ui/ImageLightbox';
import { Appointment } from '@/types/component-types';
import { useImageLightbox } from '@/hooks/useImageLightbox';
import SafeHtml from '@/components/ui/SafeHtml';

interface AppointmentDetailClientProps {
  appointment: Appointment;
  appointmentId: string;
}

/**
 * Client component for appointment detail display.
 *
 * Handles interactive features like image lightbox and file thumbnails.
 * Receives pre-fetched appointment data from server component.
 *
 * @param appointment - Pre-fetched appointment data
 * @param appointmentId - Raw appointment ID or slug from URL
 */
export default function AppointmentDetailClient({
  appointment,
  appointmentId,
}: AppointmentDetailClientProps) {
  // Use the custom lightbox hook
  const { lightboxProps, handleFileClick } = useImageLightbox();

  return (
    <MainLayout
      breadcrumbs={[
        { label: 'Termine', href: '/' },
        { label: 'Termindetails', href: `/termine/${appointmentId}`, active: true },
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

        <Paper elevation={3} sx={{ p: { xs: 2, sm: 4 }, borderRadius: 2 }}>
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              {appointment.title}
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
              <Chip
                icon={<CalendarTodayIcon />}
                label={formatShortDate(appointment.startDateTime)}
                color="primary"
                variant="outlined"
              />
              <Chip
                icon={<EventIcon />}
                label={`${formatTime(appointment.startDateTime)} Uhr`}
                color="primary"
                variant="outlined"
              />
              {appointment.endDateTime && (
                <Chip
                  label={`bis ${formatTime(appointment.endDateTime)} Uhr`}
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
              <SafeHtml html={appointment.mainText} sx={{ mb: 3, lineHeight: 1.7 }} />

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
                    {formatLongDate(appointment.startDateTime)}
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="primary">Uhrzeit:</Typography>
                  <Typography variant="body1">
                    {formatTimeRange(appointment.startDateTime, appointment.endDateTime)}
                  </Typography>
                </Box>

                {(appointment.street || appointment.city || appointment.postalCode) && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="primary">Ort:</Typography>
                    <Typography variant="body1">
                      {appointment.street && `${appointment.street}`}
                      {appointment.street && <br />}
                      {appointment.postalCode && appointment.city && `${appointment.postalCode} ${appointment.city}`}
                      {(appointment.postalCode || appointment.city) && <br />}
                      {appointment.locationDetails && `${appointment.locationDetails}`}
                    </Typography>
                  </Box>
                )}
              </Paper>
            </Box>
          </Box>

          {/* Display cover images if featured */}
          {appointment.featured && appointment.metadata && parseCoverImages(appointment.metadata).length > 0 && (
            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'medium' }}>
                Cover-Bilder
              </Typography>
              <FileThumbnailGrid
                files={parseCoverImages(appointment.metadata)}
                gridSize={{ xs: 12, sm: 6, md: 6, lg: 6 }}
                aspectRatio="4/5"
                showFileName={false}
                showDescription={false}
                showButtons={false}
                onFileClick={handleFileClick}
              />
            </Box>
          )}

          {/* Display regular attachments */}
          {appointment.fileUrls && parseFileUrls(appointment.fileUrls).length > 0 && (
            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'medium' }}>
                Dateien und Anhänge
              </Typography>
              <FileThumbnailGrid
                files={parseFileUrls(appointment.fileUrls)}
                gridSize={{ xs: 12, sm: 6, md: 4, lg: 3 }}
                aspectRatio="4/5"
                showFileName={false}
                showDescription={false}
                showButtons={false}
                onFileClick={handleFileClick}
              />
            </Box>
          )}
        </Paper>
      </Container>

      {/* Image Lightbox */}
      <ImageLightbox {...lightboxProps} />
    </MainLayout>
  );
}
