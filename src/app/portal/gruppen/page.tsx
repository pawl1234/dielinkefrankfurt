'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Tabs,
  Tab,
  CircularProgress,
  Paper,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Avatar,
  Button,
  Chip,
  Grid
} from '@mui/material';
import { ExpandMore, Group, CheckCircle, Star, LocationOn } from '@mui/icons-material';
import Link from 'next/link';
import { sanitizeForRender } from '@/lib/sanitization/sanitize';
import GroupSearchField from '@/components/portal/GroupSearchField';
import { rruleJsonToText } from '@/lib/groups/recurring-patterns';
import type { PortalGroupListItem } from '@/types/api-types';

type ViewType = 'all' | 'my';

export default function GruppenPage() {
  const [groups, setGroups] = useState<PortalGroupListItem[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<PortalGroupListItem[]>([]);
  const [view, setView] = useState<ViewType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchGroups = useCallback(async (currentView: ViewType) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/portal/groups?view=${currentView}&search=${encodeURIComponent(searchTerm)}`);

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Fehler beim Laden der Gruppen');
      }

      const data = await response.json();
      setGroups(data.groups || []);
      setFilteredGroups(data.groups || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gruppen konnten nicht geladen werden');
      setGroups([]);
      setFilteredGroups([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  // Fetch groups when view changes
  useEffect(() => {
    fetchGroups(view);
  }, [view, fetchGroups]);

  // Filter groups when search term changes
  useEffect(() => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const filtered = groups.filter(
        (group) =>
          group.name.toLowerCase().includes(term) ||
          group.description.toLowerCase().includes(term)
      );
      setFilteredGroups(filtered);
    } else {
      setFilteredGroups(groups);
    }
  }, [searchTerm, groups]);

  const handleJoinGroup = async (groupId: string) => {
    try {
      const response = await fetch('/api/portal/groups/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ groupId }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Fehler beim Beitreten der Gruppe');
      }

      const data = await response.json();

      // Show success message
      setSuccessMessage(data.message || 'Erfolgreich der Gruppe beigetreten');

      // Refresh groups list to update membership status
      await fetchGroups(view);

      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      throw err; // Re-throw to be handled by GroupsList component
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: ViewType) => {
    setView(newValue);
    setSearchTerm(''); // Clear search when switching tabs
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Gruppen
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Entdecke und trete Gruppen bei
      </Typography>

      {/* Success message */}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      {/* Tabs for All Groups / My Groups */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={view} onChange={handleTabChange}>
          <Tab label="Alle Gruppen" value="all" />
          <Tab label="Meine Gruppen" value="my" />
        </Tabs>
      </Box>

      {/* Search field */}
      <Box sx={{ mb: 3 }}>
        <GroupSearchField
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder={view === 'all' ? 'Alle Gruppen durchsuchen...' : 'Meine Gruppen durchsuchen...'}
        />
      </Box>

      {/* Loading state */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        /* Error state */
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : filteredGroups.length === 0 ? (
        /* Empty state */
        <Alert severity="info">
          {view === 'my' ? 'Du bist noch keiner Gruppe beigetreten.' : 'Keine Gruppen gefunden.'}
        </Alert>
      ) : (
        /* Groups accordion list */
        <>
          {filteredGroups.map((group) => (
            <Accordion key={group.id} sx={{ mb: 2 }}>
              <AccordionSummary
                expandIcon={<ExpandMore />}
                aria-controls={`group-${group.slug}-content`}
                id={`group-${group.slug}-header`}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', pr: 2 }}>
                  {/* Group logo/icon */}
                  {group.logoUrl ? (
                    <Avatar
                      src={group.logoUrl}
                      alt={group.name}
                      sx={{ width: 40, height: 40 }}
                    />
                  ) : (
                    <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>
                      <Group />
                    </Avatar>
                  )}

                  {/* Group name */}
                  <Typography variant="h6" sx={{ flexGrow: 1 }}>
                    {group.name}
                  </Typography>

                  {/* Membership status chips */}
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {group.isResponsiblePerson && (
                      <Chip
                        icon={<Star />}
                        label="Verantwortlich"
                        color="primary"
                        size="small"
                      />
                    )}
                    {group.isMember && !group.isResponsiblePerson && (
                      <Chip
                        icon={<CheckCircle />}
                        label="Mitglied"
                        color="success"
                        size="small"
                      />
                    )}
                  </Box>
                </Box>
              </AccordionSummary>

              <AccordionDetails>
                <Grid container spacing={3}>
                  {/* Description section */}
                  <Grid size={{ xs: 12, md: group.recurringPatterns ? 8 : 12 }}>
                    <Typography
                      variant="body1"
                      component="div"
                      dangerouslySetInnerHTML={{ __html: sanitizeForRender(group.description) }}
                    />
                  </Grid>

                  {/* Meeting information section (if exists) */}
                  {group.recurringPatterns && rruleJsonToText(group.recurringPatterns, group.meetingTime) && (
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Paper sx={{ p: 2, height: '100%' }} elevation={2}>
                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                          Regelmäßiges Treffen
                        </Typography>
                        <Typography variant="body2" paragraph>
                          {rruleJsonToText(group.recurringPatterns, group.meetingTime)}
                        </Typography>

                        {(group.meetingStreet || group.meetingCity) && (
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                            <LocationOn fontSize="small" color="action" />
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

                  {/* Action buttons */}
                  <Grid size={{ xs: 12 }}>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Button
                        component={Link}
                        href={`/portal/gruppen/${group.slug}`}
                        variant="outlined"
                      >
                        Details anzeigen
                      </Button>
                      {!group.isMember && (
                        <Button
                          variant="contained"
                          onClick={() => handleJoinGroup(group.id)}
                        >
                          Beitreten
                        </Button>
                      )}
                    </Box>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          ))}

          {/* Helper text for "Meine Gruppen" tab */}
          {view === 'my' && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Gruppen mit dem Badge &quot;Verantwortlich&quot; können von dir verwaltet werden.
              </Typography>
            </Box>
          )}
        </>
      )}
    </Container>
  );
}
