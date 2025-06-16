'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import AdminNavigation from '@/components/admin/AdminNavigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import {
  Box,
  Container,
  Typography,
  CircularProgress,
  Paper,
  Button,
  Alert,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';

function NewsletterViewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  
  const newsletterId = searchParams?.get('id');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newsletter, setNewsletter] = useState<{
    id: string;
    subject?: string;
    content?: string;
    sentAt?: string;
    status?: string;
    recipientCount?: number;
    createdAt?: string;
    introductionText?: string;
    settings?: Record<string, unknown>;
  } | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login');
    }
  }, [status, router]);

  const fetchNewsletter = useCallback(async () => {
    if (!newsletterId) {
      setError('Newsletter ID fehlt');
      setLoading(false);
      return;
    }
    
    try {
      const response = await fetch(`/api/admin/newsletter/archives/${newsletterId}`);
      if (response.ok) {
        const data = await response.json();
        setNewsletter(data);
      } else {
        setError('Newsletter nicht gefunden');
      }
    } catch {
      setError('Fehler beim Laden des Newsletters');
    } finally {
      setLoading(false);
    }
  }, [newsletterId]);

  useEffect(() => {
    if (status === 'authenticated' && newsletterId) {
      fetchNewsletter();
    }
  }, [status, newsletterId, fetchNewsletter]);

  const handleBack = () => {
    router.push('/admin');
  };

  const handleEdit = () => {
    router.push(`/admin/newsletter/edit?id=${newsletterId}`);
  };

  if (status === 'loading' || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  if (error) {
    return (
      <MainLayout
        breadcrumbs={[
          { label: 'Start', href: '/' },
          { label: 'Administration', href: '/admin' },
          { label: 'Newsletter', active: true },
        ]}>
        <Box sx={{ flexGrow: 1 }}>
          <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <AdminNavigation />
            <Alert severity="error" sx={{ mt: 3 }}>
              {error}
            </Alert>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={handleBack}
              sx={{ mt: 2 }}
            >
              Zurück
            </Button>
          </Container>
        </Box>
      </MainLayout>
    );
  }

  if (!newsletter) {
    return null;
  }

  return (
    <MainLayout
      breadcrumbs={[
        { label: 'Start', href: '/' },
        { label: 'Administration', href: '/admin' },
        { label: 'Newsletter Ansicht', active: true },
      ]}>
      <Box sx={{ flexGrow: 1 }}>
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <AdminNavigation />
          
          <AdminPageHeader 
            title="Newsletter Ansicht"
            icon={<VisibilityIcon />}
          />
          
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={handleBack}
            >
              Zurück
            </Button>
            
            {newsletter.status === 'draft' && (
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={handleEdit}
              >
                Bearbeiten
              </Button>
            )}
          </Box>
          
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Newsletter Details
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Betreff:
              </Typography>
              <Typography variant="body1">
                {newsletter.subject}
              </Typography>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Status:
              </Typography>
              <Typography variant="body1">
                {newsletter.status === 'draft' ? 'Entwurf' : 
                 newsletter.status === 'sent' ? 'Versendet' : 
                 newsletter.status === 'sending' ? 'Wird versendet' : 
                 newsletter.status === 'failed' ? 'Fehlgeschlagen' : 
                 newsletter.status}
              </Typography>
            </Box>
            
            {newsletter.sentAt && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Versendet am:
                </Typography>
                <Typography variant="body1">
                  {new Date(newsletter.sentAt).toLocaleString('de-DE')}
                </Typography>
              </Box>
            )}
            
            {newsletter.recipientCount && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Empfänger:
                </Typography>
                <Typography variant="body1">
                  {newsletter.recipientCount}
                </Typography>
              </Box>
            )}
          </Paper>
          
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Newsletter Vorschau
            </Typography>
            
            {newsletter.content ? (
              <Box 
                sx={{ 
                  border: '1px solid #e0e0e0',
                  borderRadius: 1,
                  p: 2,
                  backgroundColor: '#fafafa',
                  maxHeight: '600px',
                  overflow: 'auto'
                }}
              >
                <div dangerouslySetInnerHTML={{ __html: newsletter.content }} />
              </Box>
            ) : (
              <Alert severity="info">
                Kein Inhalt verfügbar
              </Alert>
            )}
          </Paper>
        </Container>
      </Box>
    </MainLayout>
  );
}

export default function NewsletterViewPage() {
  return (
    <Suspense fallback={
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    }>
      <NewsletterViewContent />
    </Suspense>
  );
}