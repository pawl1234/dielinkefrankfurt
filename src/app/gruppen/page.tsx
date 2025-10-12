'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  Button,
  Alert,
  CircularProgress,
  Avatar,
  Paper,
  Grid
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Group as GroupIcon,
  LocationOn as LocationIcon
} from '@mui/icons-material';
import Link from 'next/link';
import { MainLayout } from '@/components/layout/MainLayout';
import GroupContactModal from '@/components/forms/GroupContactModal';
import type { PublicGroupWithMeeting } from '@/types/component-types';
import HomePageHeader from '@/components/layout/HomePageHeader';
import { rruleJsonToText } from '@/lib/groups/recurring-patterns';

/**
 * Public groups overview page with accordion-style navigation.
 * Displays all active groups with meeting information and contact functionality.
 */
export default function GroupsOverviewPage() {
  const [groups, setGroups] = useState<PublicGroupWithMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<PublicGroupWithMeeting | null>(null);

  /**
   * Fetch groups on component mount
   */
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await fetch('/api/groups/overview');
        const data = await response.json();

        if (data.success) {
          // Sort groups alphabetically
          const sortedGroups = data.groups.sort((a: PublicGroupWithMeeting, b: PublicGroupWithMeeting) =>
            a.name.localeCompare(b.name, 'de')
          );
          setGroups(sortedGroups);
        } else {
          setError(data.error || 'Fehler beim Laden der Arbeitsgruppen');
        }
      } catch (_err) {
        setError('Fehler beim Laden der Arbeitsgruppen');
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, []);

  /**
   * Handle contact button click
   */
  const handleContactClick = (group: PublicGroupWithMeeting) => {
    setSelectedGroup(group);
    setContactModalOpen(true);
  };

  /**
   * Handle modal close
   */
  const handleModalClose = () => {
    setContactModalOpen(false);
    setSelectedGroup(null);
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Lade Arbeitsgruppen...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (groups.length === 0) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="info">
          Derzeit sind keine aktiven Arbeitsgruppen verfügbar.
        </Alert>
      </Container>
    );
  }

  return (
    <MainLayout
      breadcrumbs={[
        { label: 'Start', href: '/' },
        { label: 'Arbeitsgruppen', href: '/gruppen', active: true }
      ]}
    >
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <HomePageHeader 
        mainTitle=" Unsere Arbeitsgemeinschaften " 
        subtitle="Politisch. Aktiv. Vor Ort."
        introText="In den folgenden Abschnitten präsentieren wir Ihnen unsere engagierten Arbeitsgemeinschaften, die ein Kernelement unserer politischen Tätigkeiten darstellen. Sie sind verantwortlich für die Organisation politischer Arbeit und bieten Bildungs- und Hilfsangebote an. Darüber hinaus spielen sie eine zentrale Rolle bei der Vernetzung von Personen und tragen aktiv zur politischen Weiterentwicklung unserer Partei bei. Einige Mitglieder der Arbeitsgemeinschaften sind in verschiedenen Verwaltungs- und Entscheidungsgremien tätig und repräsentieren damit die Partei auf verschiedenen Ebenen."
      /> 

      {groups.map((group) => (
        <Accordion key={group.id} sx={{ mb: 2 }}>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls={`group-${group.slug}-content`}
            id={`group-${group.slug}-header`}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {group.logoUrl ? (
                <Avatar
                  src={group.logoUrl}
                  alt={group.name}
                  sx={{ width: 40, height: 40 }}
                />
              ) : (
                <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>
                  <GroupIcon />
                </Avatar>
              )}
              <Typography variant="h6">{group.name}</Typography>
            </Box>
          </AccordionSummary>

          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: rruleJsonToText(group.recurringPatterns, group.meetingTime) ? 8 : 12 }}>
                <Box
                  dangerouslySetInnerHTML={{ __html: group.description }}
                />
              </Grid>

              {rruleJsonToText(group.recurringPatterns, group.meetingTime) && (
                <Grid size={{ xs: 12, md: 3 }}>
                  <Paper sx={{ p: 2, height: '100%' }} elevation={2}>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      Regelmäßiges Treffen
                    </Typography>
                    <Typography variant="body2" paragraph>
                      {rruleJsonToText(group.recurringPatterns, group.meetingTime)}
                    </Typography>

                    {(group.meetingStreet || group.meetingCity) && (
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        <LocationIcon fontSize="small" color="action" />
                        <Box>
                          <Typography variant="body2">
                            {group.meetingStreet && <>{group.meetingStreet}<br /></>}
                            {group.meetingPostalCode && group.meetingCity && (
                              <>{group.meetingPostalCode} {group.meetingCity}</>
                            )}
                            {!group.meetingPostalCode && group.meetingCity && (
                              <>{group.meetingCity}</>
                            )}
                          </Typography>
                          {group.meetingLocationDetails && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                              {group.meetingLocationDetails}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    )}
                  </Paper>
                </Grid>
              )}

              <Grid size={{ xs: 12 }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    component={Link}
                    href={`/gruppen/${group.slug}`}
                    variant="outlined"
                  >
                    Details anzeigen
                  </Button>
                  <Button
                    onClick={() => handleContactClick(group)}
                    variant="contained"
                  >
                    Kontakt
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      ))}

      {/* Contact Modal */}
      {selectedGroup && (
        <GroupContactModal
          open={contactModalOpen}
          onClose={handleModalClose}
          groupSlug={selectedGroup.slug}
          groupName={selectedGroup.name}
        />
      )}
    </Container>
    </MainLayout>
  );
}
