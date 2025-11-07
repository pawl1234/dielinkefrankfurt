'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Typography,
  Box,
  CircularProgress,
  Paper,
  Alert,
  Container
} from '@mui/material';
import { ResponsiblePerson as PrismaResponsiblePerson } from '@prisma/client';
import GroupEditForm, { InitialGroupData } from '@/components/portal/GroupEditForm';
import type { PortalGroupDetail } from '@/types/api-types';
import { PortalGroupEditFormData } from '@/components/portal/GroupEditForm';

/**
 * Group edit page for responsible persons.
 * Only accessible to users who are responsible for the group.
 * Allows editing of group details but not status/delete/archive operations.
 */
export default function GroupEditPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [group, setGroup] = useState<PortalGroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);

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

      setGroupId(matchedGroup.id);

      // Fetch full details
      const detailResponse = await fetch(`/api/portal/groups/${matchedGroup.id}`);

      if (!detailResponse.ok) {
        throw new Error('Gruppendetails konnten nicht geladen werden');
      }

      const detailData = await detailResponse.json();
      const groupData = detailData.group;

      // Check if user has edit permissions
      if (!groupData.permissions.canEdit) {
        throw new Error('Du hast keine Berechtigung, diese Gruppe zu bearbeiten');
      }

      setGroup(groupData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Gruppe');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (
    formData: PortalGroupEditFormData,
    newLogoFile: File | Blob | null
  ) => {
    if (!groupId) {
      throw new Error('Gruppen-ID nicht gefunden');
    }

    const apiFormData = new FormData();

    // Add all form fields
    apiFormData.append('name', formData.name);
    apiFormData.append('description', formData.description);

    // Meeting fields
    apiFormData.append('regularMeeting', formData.regularMeeting || '');

    // Recurring meeting patterns
    if (formData.recurringMeeting) {
      apiFormData.append('recurringMeeting', JSON.stringify(formData.recurringMeeting));
    }

    apiFormData.append('meetingStreet', formData.meetingStreet || '');
    apiFormData.append('meetingCity', formData.meetingCity || '');
    apiFormData.append('meetingPostalCode', formData.meetingPostalCode || '');
    apiFormData.append('meetingLocationDetails', formData.meetingLocationDetails || '');

    // Logo file
    if (newLogoFile) {
      apiFormData.append('logo', newLogoFile);
    }

    // Responsible persons
    const responsiblePersons = formData.responsiblePersons || [];
    apiFormData.append('responsiblePersonsCount', responsiblePersons.length.toString());

    responsiblePersons.forEach((person: { firstName: string; lastName: string; email: string }, index: number) => {
      apiFormData.append(`responsiblePerson[${index}].firstName`, person.firstName);
      apiFormData.append(`responsiblePerson[${index}].lastName`, person.lastName);
      apiFormData.append(`responsiblePerson[${index}].email`, person.email);
    });

    try {
      const response = await fetch(`/api/portal/groups/${groupId}`, {
        method: 'PUT',
        body: apiFormData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Fehler beim Aktualisieren der Gruppe');
      }

      // Redirect back to group overview
      router.push(`/portal/gruppen/${slug}`);
    } catch (err) {
      // Re-throw for form to handle
      throw err;
    }
  };

  const handleCancel = () => {
    router.push(`/portal/gruppen/${slug}`);
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error || !group) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Paper sx={{ p: 4 }}>
          <Alert severity="error">{error || 'Gruppe nicht gefunden'}</Alert>
        </Paper>
      </Container>
    );
  }

  // Prepare initial data for the form
  const initialFormData: InitialGroupData = {
    id: group.id,
    name: group.name,
    slug: group.slug,
    description: group.description || '',
    logoUrl: group.logoUrl,
    metadata: null,
    responsiblePersons: group.responsiblePersons as PrismaResponsiblePerson[],
    recurringPatterns: group.recurringPatterns,
    meetingTime: group.meetingTime,
    meetingStreet: group.meetingStreet,
    meetingCity: group.meetingCity,
    meetingPostalCode: group.meetingPostalCode,
    meetingLocationDetails: group.meetingLocationDetails
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Gruppe bearbeiten
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Du kannst als verantwortliche Person alle Gruppendetails bearbeiten.
        </Typography>

        <GroupEditForm
          group={initialFormData}
          onSubmit={handleFormSubmit}
          onCancel={handleCancel}
        />
      </Paper>
    </Container>
  );
}
