'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { MainLayout } from '@/components/MainLayout';
import { Box, Typography, Container, Paper, CircularProgress, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Group, ResponsiblePerson } from '@prisma/client';
import GroupEditForm from '@/components/GroupEditForm';

// Define response types
interface GroupDetailResponse {
  group?: (Group & {
    responsiblePersons: ResponsiblePerson[];
  }) | null;
  error?: string;
}

export default function GroupEditPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const params = useParams();
  const groupId = params.id as string;
  
  const [group, setGroup] = useState<Group & {
    responsiblePersons: ResponsiblePerson[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Redirect if not authenticated
    if (authStatus === 'unauthenticated') {
      router.push('/admin/login');
    }
  }, [authStatus, router]);

  useEffect(() => {
    // Fetch group details when authenticated and ID is available
    if (authStatus === 'authenticated' && groupId) {
      fetchGroupDetails();
    }
  }, [authStatus, groupId]);

  const fetchGroupDetails = async () => {
    try {
      setLoading(true);
      // Add timestamp to prevent caching
      const response = await fetch(`/api/admin/groups/${groupId}?t=${Date.now()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch group details');
      }

      const data: GroupDetailResponse = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      if (!data.group) {
        throw new Error('Group not found');
      }
      
      setGroup(data.group);
      setError(null);
    } catch (err) {
      setError('Failed to load group details. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmitSuccess = () => {
    // Redirect back to group detail page after successful edit
    router.push(`/admin/groups/${groupId}`);
  };

  if (authStatus === 'loading' || authStatus === 'unauthenticated') {
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
        { label: 'Administration', href: '/admin' },
        { label: 'Gruppen', href: '/admin/groups' },
        { label: group?.name || 'Gruppe', href: `/admin/groups/${groupId}` },
        { label: 'Bearbeiten', href: `/admin/groups/${groupId}/edit`, active: true },
      ]}
    >
      <Box sx={{ flexGrow: 1 }}>
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Box sx={{ mb: 3 }}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => router.push(`/admin/groups/${groupId}`)}
              sx={{ mb: 2 }}
            >
              Zurück zur Gruppendetailseite
            </Button>
            
            <Typography variant="h4" component="h1" gutterBottom>
              Gruppe bearbeiten
            </Typography>
            
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
                <CircularProgress />
              </Box>
            ) : error ? (
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="error">{error}</Typography>
              </Paper>
            ) : group ? (
              <GroupEditForm 
                group={group} 
                onSubmitSuccess={handleFormSubmitSuccess} 
                onCancel={() => router.push(`/admin/groups/${groupId}`)}
              />
            ) : (
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="text.secondary">Gruppe nicht gefunden.</Typography>
              </Paper>
            )}
          </Box>
        </Container>
      </Box>
    </MainLayout>
  );
}