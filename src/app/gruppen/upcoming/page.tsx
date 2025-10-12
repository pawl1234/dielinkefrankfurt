'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  CardActionArea,
  Chip
} from '@mui/material';
import Link from 'next/link';
import { MainLayout } from '@/components/layout/MainLayout';
import EventIcon from '@mui/icons-material/Event';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { CalculatedMeeting } from '@/types/form-types';
import dayjs from 'dayjs';
import 'dayjs/locale/de';

dayjs.locale('de');

interface UpcomingMeetingsResponse {
  success: boolean;
  meetings?: CalculatedMeeting[];
  error?: string;
}

/**
 * Demo page displaying upcoming group meetings for the next 7 days
 */
export default function UpcomingMeetingsPage() {
  const [meetings, setMeetings] = useState<CalculatedMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch upcoming meetings on component mount
   */
  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        const response = await fetch('/api/groups/upcoming-meetings');
        const data: UpcomingMeetingsResponse = await response.json();

        if (data.success && data.meetings) {
          setMeetings(data.meetings);
        } else {
          setError(data.error || 'Fehler beim Laden der Termine');
        }
      } catch (_err) {
        setError('Fehler beim Laden der Termine');
      } finally {
        setLoading(false);
      }
    };

    fetchMeetings();
  }, []);

  /**
   * Format date to German long format
   *
   * @param date - Date to format
   * @returns German formatted date string (e.g., "Montag, 15. Januar 2025")
   */
  const formatDate = (date: Date): string => {
    return dayjs(date).format('dddd, D. MMMM YYYY');
  };

  if (loading) {
    return (
      <MainLayout
        breadcrumbs={[
          { label: 'Start', href: '/' },
          { label: 'Arbeitsgruppen', href: '/gruppen' },
          { label: 'Anstehende Treffen', href: '/gruppen/upcoming', active: true }
        ]}
      >
        <Container maxWidth="md" sx={{ mt: 4, textAlign: 'center' }}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>Lade anstehende Treffen...</Typography>
        </Container>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      breadcrumbs={[
        { label: 'Start', href: '/' },
        { label: 'Arbeitsgruppen', href: '/gruppen' },
        { label: 'Anstehende Treffen', href: '/gruppen/upcoming', active: true }
      ]}
    >
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <EventIcon color="primary" sx={{ fontSize: 32 }} />
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
              Anstehende Gruppentreffen
            </Typography>
          </Box>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Übersicht über alle geplanten Treffen unserer Arbeitsgruppen in den nächsten 7 Tagen.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {!error && meetings.length === 0 && (
            <Alert severity="info">
              In den nächsten 7 Tagen sind keine Gruppentreffen geplant.
            </Alert>
          )}

          {!error && meetings.length > 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {meetings.map((meeting, index) => (
                <Card
                  key={`${meeting.groupId}-${meeting.date.toString()}-${index}`}
                  elevation={2}
                  sx={{
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: 4
                    }
                  }}
                >
                  <CardActionArea
                    component={Link}
                    href={`/gruppen/${meeting.groupSlug}`}
                    sx={{ p: 0 }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold' }}>
                          {meeting.groupName}
                        </Typography>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <EventIcon fontSize="small" color="primary" />
                          <Chip
                            label={formatDate(meeting.date)}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <AccessTimeIcon fontSize="small" color="action" />
                          <Typography variant="body2" color="text.secondary">
                            {meeting.time} Uhr
                          </Typography>
                        </Box>

                        {(meeting.street || meeting.city) && (
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                            <LocationOnIcon fontSize="small" color="action" />
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                {meeting.street && <>{meeting.street}<br /></>}
                                {meeting.postalCode && meeting.city && (
                                  <>{meeting.postalCode} {meeting.city}</>
                                )}
                                {!meeting.postalCode && meeting.city && (
                                  <>{meeting.city}</>
                                )}
                              </Typography>
                              {meeting.locationDetails && (
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                                  {meeting.locationDetails}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        )}
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              ))}
            </Box>
          )}
        </Paper>
      </Container>
    </MainLayout>
  );
}
