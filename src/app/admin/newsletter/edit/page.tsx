'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import AdminNavigation from '@/components/admin/AdminNavigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import RichTextEditor from '@/components/editor/RichTextEditor';
import AIGenerationModal from '@/components/newsletter/AIGenerationModal';
import {
  Box,
  Container,
  Typography,
  CircularProgress,
  Paper,
  TextField,
  Button,
  Alert,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

/**
 * Convert plain text to HTML paragraphs for rich text editor
 * Handles double newlines as paragraph breaks, single newlines as <br>
 */
function convertTextToHTML(text: string): string {
  if (!text || !text.trim()) return '<p></p>';

  // Create a div for HTML escaping
  const div = document.createElement('div');

  return text
    .split('\n\n')
    .filter(para => para.trim())
    .map(para => {
      // Escape HTML and convert single newlines to <br>
      div.textContent = para;
      return `<p>${div.innerHTML.replace(/\n/g, '<br>')}</p>`;
    })
    .join('') || '<p></p>';
}

function NewsletterEditContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const newsletterId = searchParams?.get('id');
  const isNewsletter = !newsletterId; // If no ID, it's a new newsletter
  
  const [loading, setLoading] = useState(!isNewsletter);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const [subject, setSubject] = useState('');
  const [introductionText, setIntroductionText] = useState('');
  const [showAIModal, setShowAIModal] = useState(false);
  const [isIntroHTML, setIsIntroHTML] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/newsletter/settings');
      if (response.ok) {
        const data = await response.json();
        // Set default subject from template if creating new newsletter
        if (isNewsletter && data.subjectTemplate) {
          const currentDate = new Date().toLocaleDateString('de-DE');
          const formattedSubject = data.subjectTemplate.replace('{date}', currentDate);
          setSubject(formattedSubject);
        }
      }
    } catch {
      console.error('Error loading settings');
    }
  }, [isNewsletter]);

  const fetchNewsletter = useCallback(async () => {
    if (!newsletterId) return;
    
    try {
      const response = await fetch(`/api/admin/newsletter/archives/${newsletterId}`);
      if (response.ok) {
        const data = await response.json();
        setSubject(data.subject || '');
        setIntroductionText(data.introductionText || '');
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
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (newsletterId) {
      fetchNewsletter();
    }
  }, [newsletterId, fetchNewsletter]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      const url = isNewsletter 
        ? '/api/admin/newsletter/generate'
        : `/api/admin/newsletter/regenerate/${newsletterId}`;
        
      const response = await fetch(url, {
        method: isNewsletter ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          introductionText,
        }),
      });

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/admin');
        }, 1500);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Speichern');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Fehler beim Speichern des Newsletters');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/admin');
  };

  const handleAIAccept = (generatedText: string) => {
    // Convert the AI-generated text to HTML to preserve formatting
    const htmlContent = convertTextToHTML(generatedText);
    setIntroductionText(htmlContent);
    setIsIntroHTML(true); // Flag that this content should be treated as HTML
    setShowAIModal(false);
  };

  if (loading) {
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
        { label: isNewsletter ? 'Neuer Newsletter' : 'Newsletter bearbeiten', active: true },
      ]}>
      <Box sx={{ flexGrow: 1 }}>
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <AdminNavigation />
          
          <AdminPageHeader 
            title={isNewsletter ? 'Neuer Newsletter' : 'Newsletter bearbeiten'}
            icon={<EditIcon />}
          />
          
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              Newsletter erfolgreich {isNewsletter ? 'erstellt' : 'aktualisiert'}! Sie werden weitergeleitet...
            </Alert>
          )}
          
          <Paper sx={{ p: 3 }}>
            <Box sx={{ mb: 3 }}>
              <TextField
                label="Newsletter Betreff"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                fullWidth
                margin="normal"
                disabled={saving}
              />
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle1">
                  Einführungstext
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setShowAIModal(true)}
                  startIcon={<AutoAwesomeIcon />}
                  disabled={saving}
                >
                  Intro generieren
                </Button>
              </Box>
              {introductionText.trim() && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  KI-Generierung überschreibt vorhandenen Text
                </Typography>
              )}
              <RichTextEditor
                value={introductionText}
                onChange={(value) => {
                  setIntroductionText(value);
                  setIsIntroHTML(false); // Reset HTML flag when user edits manually
                }}
                maxLength={5000}
                placeholder="Geben Sie hier den Einführungstext für den Newsletter ein..."
                forceHTML={isIntroHTML}
              />
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<ArrowBackIcon />}
                onClick={handleCancel}
                disabled={saving}
              >
                Zurück
              </Button>
              
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={saving || !subject.trim() || !introductionText.trim()}
              >
                {saving ? 'Speichere...' : (isNewsletter ? 'Newsletter erstellen' : 'Änderungen speichern')}
              </Button>
            </Box>
          </Paper>
          
          <AIGenerationModal
            open={showAIModal}
            onClose={() => setShowAIModal(false)}
            onAccept={handleAIAccept}
            existingText={introductionText}
          />
        </Container>
      </Box>
    </MainLayout>
  );
}

export default function NewsletterEditPage() {
  return (
    <Suspense fallback={
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    }>
      <NewsletterEditContent />
    </Suspense>
  );
}