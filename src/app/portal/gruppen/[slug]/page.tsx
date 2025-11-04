'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Typography,
  Box,
  CircularProgress,
  Paper,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar
} from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import { sanitizeForRender } from '@/lib/sanitization/sanitize';
import type { PortalGroupDetail } from '@/types/api-types';

/**
 * Group overview page - displays description, meeting info, and responsible persons.
 * Rendered within GroupLayout which provides header and navigation.
 */
export default function GroupOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [group, setGroup] = useState<PortalGroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  useEffect(() => {
    fetchGroupDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const fetchGroupDetail = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get the group by slug to get its ID
      const response = await fetch(`/api/portal/groups?view=all&search=${encodeURIComponent(slug)}`);

      if (!response.ok) {
        throw new Error('Gruppe nicht gefunden');
      }

      const data = await response.json();
      const matchedGroup = data.groups?.find((g: { slug: string }) => g.slug === slug);

      if (!matchedGroup) {
        throw new Error('Gruppe nicht gefunden');
      }

      // Fetch full details
      const detailResponse = await fetch(`/api/portal/groups/${matchedGroup.id}`);

      if (!detailResponse.ok) {
        throw new Error('Gruppendetails konnten nicht geladen werden');
      }

      const detailData = await detailResponse.json();
      setGroup(detailData.group);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Gruppe');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!group) return;

    setLeaving(true);
    try {
      const response = await fetch('/api/portal/groups/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: group.id })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Verlassen der Gruppe');
      }

      setSnackbarMessage('Du hast die Gruppe erfolgreich verlassen');
      setSnackbarOpen(true);
      setLeaveDialogOpen(false);

      // Redirect to groups page after a short delay
      setTimeout(() => {
        router.push('/portal/gruppen');
      }, 1500);
    } catch (err) {
      setSnackbarMessage(err instanceof Error ? err.message : 'Fehler beim Verlassen der Gruppe');
      setSnackbarOpen(true);
      setLeaveDialogOpen(false);
    } finally {
      setLeaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !group) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error || 'Gruppe nicht gefunden'}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Description */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Beschreibung
        </Typography>
        <Typography
          variant="body1"
          component="div"
          dangerouslySetInnerHTML={{ __html: sanitizeForRender(group.description) }}
        />
      </Paper>

      {/* Meeting information */}
      {(group.meetingStreet || group.meetingCity) && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <LocationOnIcon color="primary" />
            <Typography variant="h6">Treffpunkt</Typography>
          </Box>

          {group.meetingTime && (
            <Typography variant="body2" gutterBottom>
              <strong>Uhrzeit:</strong> {group.meetingTime} Uhr
            </Typography>
          )}

          {group.meetingStreet && (
            <Typography variant="body2" gutterBottom>
              {group.meetingStreet}
            </Typography>
          )}

          {group.meetingCity && group.meetingPostalCode && (
            <Typography variant="body2" gutterBottom>
              {group.meetingPostalCode} {group.meetingCity}
            </Typography>
          )}

          {group.meetingLocationDetails && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              {group.meetingLocationDetails}
            </Typography>
          )}
        </Paper>
      )}

      {/* Responsible persons */}
      {(group.responsiblePersons.length > 0 || group.responsibleUsers.length > 0) && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Ansprechpersonen
          </Typography>

          {/* Email-based responsible persons */}
          {group.responsiblePersons.map((person, index) => (
            <Box key={`email-${index}`} sx={{ mb: 1 }}>
              <Typography variant="body2">
                {person.firstName} {person.lastName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {person.email}
              </Typography>
            </Box>
          ))}

          {/* User-based responsible persons */}
          {group.responsibleUsers.map((ru) => (
            <Box key={ru.id} sx={{ mb: 1 }}>
              <Typography variant="body2">
                {ru.user.firstName} {ru.user.lastName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {ru.user.email}
              </Typography>
            </Box>
          ))}
        </Paper>
      )}

      {/* Action hints based on permissions */}
      {group.permissions.canEdit && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Als verantwortliche Person kannst du diese Gruppe verwalten und Mitglieder verwalten.
        </Alert>
      )}

      {/* Leave group button - only shown to regular members (not responsible persons) */}
      {group.permissions.canLeave && (
        <Box sx={{ mt: 2 }}>
          <Button
            variant="outlined"
            color="error"
            startIcon={<ExitToAppIcon />}
            onClick={() => setLeaveDialogOpen(true)}
          >
            Gruppe verlassen
          </Button>
        </Box>
      )}

      {/* Leave confirmation dialog */}
      <Dialog
        open={leaveDialogOpen}
        onClose={() => !leaving && setLeaveDialogOpen(false)}
      >
        <DialogTitle>Gruppe verlassen?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Möchtest du diese Gruppe wirklich verlassen? Du kannst der Gruppe jederzeit wieder beitreten.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setLeaveDialogOpen(false)}
            disabled={leaving}
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleLeaveGroup}
            color="error"
            variant="contained"
            disabled={leaving}
            startIcon={leaving ? <CircularProgress size={20} /> : <ExitToAppIcon />}
          >
            {leaving ? 'Verlasse Gruppe...' : 'Gruppe verlassen'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </Box>
  );
}
