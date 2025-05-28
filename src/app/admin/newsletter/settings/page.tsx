'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import AdminNavigation from '@/components/admin/AdminNavigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import {
  Box,
  Container,
  Typography,
  CircularProgress,
  Paper,
  TextField,
  Button,
  Divider,
  Alert,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import SaveIcon from '@mui/icons-material/Save';

export default function NewsletterSettingsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [settings, setSettings] = useState({
    headerLogo: '',
    headerBanner: '',
    footerText: '',
    unsubscribeLink: '',
    testEmailRecipients: '',
    fromName: '',
    fromEmail: '',
    replyToEmail: '',
    subjectTemplate: '',
    batchSize: 100,
    batchDelay: 1000,
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchSettings();
    }
  }, [status]);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/newsletter/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      setError('Fehler beim Laden der Einstellungen');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      const response = await fetch('/api/admin/newsletter/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/admin/newsletter/archives');
        }, 1500);
      } else {
        throw new Error('Fehler beim Speichern');
      }
    } catch (error) {
      setError('Fehler beim Speichern der Einstellungen');
    } finally {
      setSaving(false);
    }
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

  return (
    <MainLayout
      breadcrumbs={[
        { label: 'Start', href: '/' },
        { label: 'Administration', href: '/admin', active: true },
        { label: 'Newsletter Einstellungen', href: '/admin/newsletter/settings', active: true },
      ]}>
      <Box sx={{ flexGrow: 1 }}>
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <AdminNavigation />
          
          <AdminPageHeader 
            title="Newsletter Einstellungen"
            icon={<SettingsIcon />}
          />
          
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              Einstellungen erfolgreich gespeichert!
            </Alert>
          )}
          
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Newsletter Design
            </Typography>
            
            <TextField
              label="Logo URL"
              value={settings.headerLogo || ''}
              onChange={(e) => setSettings({ ...settings, headerLogo: e.target.value })}
              fullWidth
              margin="normal"
              helperText="URL zum Logo für den Newsletter-Header"
            />
            
            <TextField
              label="Banner URL"
              value={settings.headerBanner || ''}
              onChange={(e) => setSettings({ ...settings, headerBanner: e.target.value })}
              fullWidth
              margin="normal"
              helperText="URL zum Banner-Bild für den Newsletter-Header"
            />
            
            <TextField
              label="Footer Text (HTML)"
              multiline
              rows={3}
              value={settings.footerText || ''}
              onChange={(e) => setSettings({ ...settings, footerText: e.target.value })}
              fullWidth
              margin="normal"
              helperText="Text für den Newsletter-Footer, kann HTML enthalten"
            />
            
            <TextField
              label="Abmelde-Link"
              value={settings.unsubscribeLink || ''}
              onChange={(e) => setSettings({ ...settings, unsubscribeLink: e.target.value })}
              fullWidth
              margin="normal"
              helperText="Link zum Abmelden vom Newsletter (derzeit nur Platzhalter)"
            />
            
            <TextField
              label="Test-Email Empfänger"
              value={settings.testEmailRecipients || ''}
              onChange={(e) => setSettings({ ...settings, testEmailRecipients: e.target.value })}
              fullWidth
              margin="normal"
              helperText="Email-Adressen für Testemails (durch Komma getrennt)"
            />
            
            <Divider sx={{ my: 3 }} />
            
            <Typography variant="h6" gutterBottom>
              E-Mail-Versand Einstellungen
            </Typography>
            
            <TextField
              label="Absender Name"
              value={settings.fromName || ''}
              onChange={(e) => setSettings({ ...settings, fromName: e.target.value })}
              fullWidth
              margin="normal"
              helperText="Name des Absenders (z.B. Die Linke Frankfurt)"
            />
            
            <TextField
              label="Absender E-Mail"
              value={settings.fromEmail || ''}
              onChange={(e) => setSettings({ ...settings, fromEmail: e.target.value })}
              fullWidth
              margin="normal"
              helperText="E-Mail-Adresse des Absenders"
            />
            
            <TextField
              label="Antwort-E-Mail"
              value={settings.replyToEmail || ''}
              onChange={(e) => setSettings({ ...settings, replyToEmail: e.target.value })}
              fullWidth
              margin="normal"
              helperText="E-Mail-Adresse für Antworten (falls abweichend)"
            />
            
            <TextField
              label="Betreff-Vorlage"
              value={settings.subjectTemplate || ''}
              onChange={(e) => setSettings({ ...settings, subjectTemplate: e.target.value })}
              fullWidth
              margin="normal"
              helperText="Vorlage für den E-Mail-Betreff. Verwende {date} für das Datum."
            />
            
            <TextField
              label="Batch-Größe"
              value={settings.batchSize || 100}
              onChange={(e) => setSettings({ ...settings, batchSize: parseInt(e.target.value) || 100 })}
              type="number"
              InputProps={{ inputProps: { min: 1, max: 500 } }}
              fullWidth
              margin="normal"
              helperText="Anzahl der E-Mails pro Batch (1-500)"
            />
            
            <TextField
              label="Batch-Verzögerung (ms)"
              value={settings.batchDelay || 1000}
              onChange={(e) => setSettings({ ...settings, batchDelay: parseInt(e.target.value) || 1000 })}
              type="number"
              InputProps={{ inputProps: { min: 100, max: 10000 } }}
              fullWidth
              margin="normal"
              helperText="Millisekunden zwischen Batches (100-10000)"
            />
            
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={() => router.push('/admin')}
              >
                Abbrechen
              </Button>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Speichere...' : 'Einstellungen speichern'}
              </Button>
            </Box>
          </Paper>
        </Container>
      </Box>
    </MainLayout>
  );
}