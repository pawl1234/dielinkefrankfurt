'use client';

import { useEffect, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import {
  Container,
  Typography,
  Box,
  Tabs,
  Tab,
  CircularProgress,
  Paper,
  Chip,
  Button
} from '@mui/material';
import Link from 'next/link';
import GroupIcon from '@mui/icons-material/Group';
import type { PortalGroupDetail } from '@/types/api-types';

interface GroupLayoutProps {
  children: React.ReactNode;
}

/**
 * Layout for group detail pages with tab navigation.
 * Provides consistent header and navigation across all group sections.
 */
export default function GroupLayout({ children }: GroupLayoutProps) {
  const params = useParams();
  const pathname = usePathname();
  const slug = params.slug as string;

  const [group, setGroup] = useState<PortalGroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGroupDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const fetchGroupDetail = async () => {
    try {
      setLoading(true);
      setError(null);

      // First, get the group by slug to get its ID
      const response = await fetch(`/api/portal/groups?view=all&search=${encodeURIComponent(slug)}`);

      if (!response.ok) {
        throw new Error('Gruppe nicht gefunden');
      }

      const data = await response.json();
      const matchedGroup = data.groups?.find((g: { slug: string }) => g.slug === slug);

      if (!matchedGroup) {
        throw new Error('Gruppe nicht gefunden');
      }

      // Now fetch full details
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

  // Determine active tab based on pathname
  const getActiveTab = () => {
    const basePath = `/portal/gruppen/${slug}`;
    if (pathname === basePath) return 'overview';
    if (pathname.startsWith(`${basePath}/mitglieder`)) return 'members';
    if (pathname.startsWith(`${basePath}/bearbeiten`)) return 'edit';
    if (pathname.startsWith(`${basePath}/dateien`)) return 'files';
    if (pathname.startsWith(`${basePath}/termine`)) return 'appointments';
    if (pathname.startsWith(`${basePath}/kommunikation`)) return 'communication';
    return 'overview';
  };

  const activeTab = getActiveTab();

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error || !group) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper sx={{ p: 4, bgcolor: 'error.light' }}>
          <Typography color="error">{error || 'Gruppe nicht gefunden'}</Typography>
          <Button href="/portal/gruppen" sx={{ mt: 2 }}>
            Zurück zu Gruppen
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <GroupIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Typography variant="h4">{group.name}</Typography>
        </Box>

        {/* Membership indicators */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          {group.permissions.isResponsiblePerson && (
            <Chip label="Verantwortlich" color="primary" />
          )}
          {group.permissions.isMember && !group.permissions.isResponsiblePerson && (
            <Chip label="Mitglied" color="success" />
          )}
          {group.status === 'ACTIVE' && (
            <Chip label="Aktiv" color="success" variant="outlined" />
          )}
        </Box>

        <Button href="/portal/gruppen" size="small">
          ← Zurück zu Gruppen
        </Button>
      </Box>

      {/* Navigation Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab}>
          <Tab
            label="Übersicht"
            value="overview"
            component={Link}
            href={`/portal/gruppen/${slug}`}
          />
          <Tab
            label="Mitglieder"
            value="members"
            component={Link}
            href={`/portal/gruppen/${slug}/mitglieder`}
          />
          {/* Edit tab - only visible to responsible persons */}
          {group.permissions.canEdit && (
            <Tab
              label="Bearbeiten"
              value="edit"
              component={Link}
              href={`/portal/gruppen/${slug}/bearbeiten`}
            />
          )}
          <Tab
            label="Dateien"
            value="files"
            component={Link}
            href={`/portal/gruppen/${slug}/dateien`}
            disabled
          />
          <Tab
            label="Termine"
            value="appointments"
            component={Link}
            href={`/portal/gruppen/${slug}/termine`}
            disabled
          />
          <Tab
            label="Kommunikation"
            value="communication"
            component={Link}
            href={`/portal/gruppen/${slug}/kommunikation`}
            disabled
          />
        </Tabs>
      </Box>

      {/* Page Content */}
      {children}
    </Container>
  );
}
