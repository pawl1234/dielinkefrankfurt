'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Typography,
  Box,
  CircularProgress,
  Paper,
  Alert
} from '@mui/material';
import GroupMembersTable from '@/components/portal/GroupMembersTable';
import type { GroupMemberResponse, PortalGroupDetail } from '@/types/api-types';

/**
 * Group members page - displays list of group members with management capabilities.
 * Members can view the list, responsible persons can also remove members.
 */
export default function GroupMembersPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { data: session } = useSession();

  const [members, setMembers] = useState<GroupMemberResponse[]>([]);
  const [group, setGroup] = useState<PortalGroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGroupAndMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  /**
   * Fetch group details and members
   */
  const fetchGroupAndMembers = async () => {
    try {
      setLoading(true);
      setError(null);

      // First get group by slug to get the ID
      const groupResponse = await fetch(`/api/portal/groups?view=all&search=${encodeURIComponent(slug)}`);
      if (!groupResponse.ok) {
        throw new Error('Gruppe nicht gefunden');
      }

      const groupData = await groupResponse.json();
      const foundGroup = groupData.groups?.find((g: { slug: string }) => g.slug === slug);

      if (!foundGroup) {
        throw new Error('Gruppe nicht gefunden');
      }

      // Get full group details with permissions
      const detailResponse = await fetch(`/api/portal/groups/${foundGroup.id}`);
      if (!detailResponse.ok) {
        throw new Error('Fehler beim Laden der Gruppendetails');
      }

      const detailData = await detailResponse.json();
      setGroup(detailData.group);

      // Check if user is a member before fetching member list
      if (!detailData.group.permissions.isMember) {
        throw new Error('Sie müssen Mitglied der Gruppe sein, um die Mitgliederliste zu sehen');
      }

      // Fetch members
      const membersResponse = await fetch(`/api/portal/groups/${foundGroup.id}/members`);
      if (!membersResponse.ok) {
        const errorData = await membersResponse.json();
        throw new Error(errorData.error || 'Fehler beim Laden der Mitglieder');
      }

      const membersData = await membersResponse.json();
      setMembers(membersData.members || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Mitglieder');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Paper>
    );
  }

  if (!group || !session?.user?.id) {
    return (
      <Paper sx={{ p: 4 }}>
        <Alert severity="warning">Gruppe nicht gefunden oder Sie sind nicht angemeldet</Alert>
      </Paper>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Mitglieder
      </Typography>

      {members.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            Diese Gruppe hat noch keine Mitglieder.
          </Typography>
        </Paper>
      ) : (
        <GroupMembersTable
          members={members}
          groupId={group.id}
          canManageMembers={group.permissions.canManageMembers}
          currentUserId={session.user.id}
          onMemberRemoved={fetchGroupAndMembers}
        />
      )}
    </Box>
  );
}
