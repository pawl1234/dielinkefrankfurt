'use client';

import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  Alert
} from '@mui/material';
import GroupIcon from '@mui/icons-material/Group';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import StarIcon from '@mui/icons-material/Star';
import { sanitizeForRender } from '@/lib/sanitization/sanitize';
import type { PortalGroupListItem } from '@/types/api-types';

interface GroupsListProps {
  groups: PortalGroupListItem[];
  onJoinGroup: (groupId: string) => Promise<void>;
  loading?: boolean;
}

/**
 * Component to display a list of groups with join functionality.
 * Shows membership status and allows users to join active groups.
 */
export default function GroupsList({ groups, onJoinGroup, loading = false }: GroupsListProps) {
  const [joiningGroupId, setJoiningGroupId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async (groupId: string) => {
    try {
      setError(null);
      setJoiningGroupId(groupId);
      await onJoinGroup(groupId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Beitreten der Gruppe');
    } finally {
      setJoiningGroupId(null);
    }
  };

  if (groups.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography color="text.secondary">
          Keine Gruppen gefunden
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)'
          },
          gap: 3
        }}
      >
        {groups.map((group) => (
          <Card
            key={group.id}
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative'
            }}
          >
              {/* Membership indicators */}
              <Box sx={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 0.5 }}>
                {group.isResponsiblePerson && (
                  <Chip
                    icon={<StarIcon />}
                    label="Verantwortlich"
                    color="primary"
                    size="small"
                  />
                )}
                {group.isMember && !group.isResponsiblePerson && (
                  <Chip
                    icon={<CheckCircleIcon />}
                    label="Mitglied"
                    color="success"
                    size="small"
                  />
                )}
              </Box>

              <CardContent sx={{ flexGrow: 1, pt: group.isMember ? 5 : 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <GroupIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6" component="h2">
                    {group.name}
                  </Typography>
                </Box>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    minHeight: '60px'
                  }}
                  dangerouslySetInnerHTML={{ __html: sanitizeForRender(group.description) }}
                />
              </CardContent>

              <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                <Button
                  size="small"
                  href={`/portal/gruppen/${group.slug}`}
                >
                  Details
                </Button>

                {!group.isMember && (
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => handleJoin(group.id)}
                    disabled={loading || joiningGroupId === group.id}
                  >
                    {joiningGroupId === group.id ? 'Beitritt läuft...' : 'Beitreten'}
                  </Button>
                )}
              </CardActions>
            </Card>
        ))}
      </Box>
    </Box>
  );
}
