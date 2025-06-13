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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  FormControlLabel,
  Switch,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import SaveIcon from '@mui/icons-material/Save';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TuneIcon from '@mui/icons-material/Tune';

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
    // Advanced performance settings
    chunkSize: 250,
    chunkDelay: 500,
    emailDelay: 50,
    emailTimeout: 60000,
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 45000,
    maxConnections: 5,
    maxMessages: 100,
    maxRetries: 3,
    maxBackoffDelay: 10000,
    useBccSending: true,
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
            
            <FormControlLabel
              control={
                <Switch
                  checked={settings.useBccSending || false}
                  onChange={(e) => setSettings({ ...settings, useBccSending: e.target.checked })}
                />
              }
              label="BCC-Versand verwenden"
              sx={{ mt: 2, mb: 1 }}
            />
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {settings.useBccSending 
                ? "BCC-Modus: Alle Empfänger werden als BCC in wenige E-Mails versendet. Deutlich schneller, aber keine individuelle Verfolgung möglich."
                : "Individueller Versand: Jeder Empfänger erhält eine separate E-Mail. Ermöglicht individuelle Verfolgung, aber langsamer."
              }
            </Typography>
            
            <Divider sx={{ my: 3 }} />
            
            <Accordion>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls="advanced-settings-content"
                id="advanced-settings-header"
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TuneIcon />
                  <Typography variant="h6">
                    Erweiterte Einstellungen
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Diese Einstellungen sind für fortgeschrittene Benutzer. Änderungen können die E-Mail-Versand-Performance beeinflussen.
                </Typography>
                
                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Versand-Einstellungen
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
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
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
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
                  </Grid>
                </Grid>

                <Typography variant="subtitle1" gutterBottom sx={{ mt: 3, fontWeight: 'bold' }}>
                  Chunk-Einstellungen
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Chunk-Größe"
                      value={settings.chunkSize || 250}
                      onChange={(e) => setSettings({ ...settings, chunkSize: parseInt(e.target.value) || 250 })}
                      type="number"
                      InputProps={{ inputProps: { min: 1, max: 1000 } }}
                      fullWidth
                      margin="normal"
                      helperText={settings.useBccSending 
                        ? "BCC-Empfänger pro E-Mail (1-100 empfohlen für BCC)" 
                        : "E-Mails pro Chunk für Connection Pooling (1-1000)"
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Chunk-Verzögerung (ms)"
                      value={settings.chunkDelay || 500}
                      onChange={(e) => setSettings({ ...settings, chunkDelay: parseInt(e.target.value) || 500 })}
                      type="number"
                      InputProps={{ inputProps: { min: 100, max: 5000 } }}
                      fullWidth
                      margin="normal"
                      helperText={settings.useBccSending 
                        ? "Millisekunden zwischen BCC-E-Mails (100-5000)" 
                        : "Millisekunden zwischen Chunks (100-5000)"
                      }
                    />
                  </Grid>
                </Grid>

                <Typography variant="subtitle1" gutterBottom sx={{ mt: 3, fontWeight: 'bold' }}>
                  E-Mail Timing
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="E-Mail-Verzögerung (ms)"
                      value={settings.emailDelay || 50}
                      onChange={(e) => setSettings({ ...settings, emailDelay: parseInt(e.target.value) || 50 })}
                      type="number"
                      InputProps={{ inputProps: { min: 10, max: 1000 } }}
                      fullWidth
                      margin="normal"
                      helperText={settings.useBccSending 
                        ? "Nicht verwendet bei BCC-Versand (alle Empfänger in einer E-Mail)" 
                        : "Millisekunden zwischen einzelnen E-Mails (10-1000)"
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="E-Mail-Timeout (ms)"
                      value={settings.emailTimeout || 60000}
                      onChange={(e) => setSettings({ ...settings, emailTimeout: parseInt(e.target.value) || 60000 })}
                      type="number"
                      InputProps={{ inputProps: { min: 10000, max: 300000 } }}
                      fullWidth
                      margin="normal"
                      helperText="Timeout für einzelne E-Mail (10-300 Sekunden)"
                    />
                  </Grid>
                </Grid>

                <Typography variant="subtitle1" gutterBottom sx={{ mt: 3, fontWeight: 'bold' }}>
                  SMTP Verbindungseinstellungen
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      label="Verbindungs-Timeout (ms)"
                      value={settings.connectionTimeout || 30000}
                      onChange={(e) => setSettings({ ...settings, connectionTimeout: parseInt(e.target.value) || 30000 })}
                      type="number"
                      InputProps={{ inputProps: { min: 5000, max: 120000 } }}
                      fullWidth
                      margin="normal"
                      helperText="SMTP Verbindungs-Timeout (5-120s)"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      label="Begrüßungs-Timeout (ms)"
                      value={settings.greetingTimeout || 30000}
                      onChange={(e) => setSettings({ ...settings, greetingTimeout: parseInt(e.target.value) || 30000 })}
                      type="number"
                      InputProps={{ inputProps: { min: 5000, max: 120000 } }}
                      fullWidth
                      margin="normal"
                      helperText="SMTP Begrüßungs-Timeout (5-120s)"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      label="Socket-Timeout (ms)"
                      value={settings.socketTimeout || 45000}
                      onChange={(e) => setSettings({ ...settings, socketTimeout: parseInt(e.target.value) || 45000 })}
                      type="number"
                      InputProps={{ inputProps: { min: 5000, max: 180000 } }}
                      fullWidth
                      margin="normal"
                      helperText="SMTP Socket-Timeout (5-180s)"
                    />
                  </Grid>
                </Grid>

                <Typography variant="subtitle1" gutterBottom sx={{ mt: 3, fontWeight: 'bold' }}>
                  Connection Pooling
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Max. Verbindungen"
                      value={settings.maxConnections || 5}
                      onChange={(e) => setSettings({ ...settings, maxConnections: parseInt(e.target.value) || 5 })}
                      type="number"
                      InputProps={{ inputProps: { min: 1, max: 20 } }}
                      fullWidth
                      margin="normal"
                      helperText={settings.useBccSending 
                        ? "Weniger relevant bei BCC (deutlich weniger Verbindungen)" 
                        : "Maximale gleichzeitige SMTP Verbindungen (1-20)"
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Max. Nachrichten pro Verbindung"
                      value={settings.maxMessages || 100}
                      onChange={(e) => setSettings({ ...settings, maxMessages: parseInt(e.target.value) || 100 })}
                      type="number"
                      InputProps={{ inputProps: { min: 1, max: 1000 } }}
                      fullWidth
                      margin="normal"
                      helperText={settings.useBccSending 
                        ? "Weniger relevant bei BCC (deutlich weniger Nachrichten)" 
                        : "Maximale Nachrichten pro SMTP Verbindung (1-1000)"
                      }
                    />
                  </Grid>
                </Grid>

                <Typography variant="subtitle1" gutterBottom sx={{ mt: 3, fontWeight: 'bold' }}>
                  Wiederholungslogik
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Max. Wiederholungen"
                      value={settings.maxRetries || 3}
                      onChange={(e) => setSettings({ ...settings, maxRetries: parseInt(e.target.value) || 3 })}
                      type="number"
                      InputProps={{ inputProps: { min: 1, max: 10 } }}
                      fullWidth
                      margin="normal"
                      helperText="Maximale Anzahl Wiederholungsversuche (1-10)"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Max. Backoff-Verzögerung (ms)"
                      value={settings.maxBackoffDelay || 10000}
                      onChange={(e) => setSettings({ ...settings, maxBackoffDelay: parseInt(e.target.value) || 10000 })}
                      type="number"
                      InputProps={{ inputProps: { min: 1000, max: 60000 } }}
                      fullWidth
                      margin="normal"
                      helperText="Maximale exponential Backoff Verzögerung (1-60s)"
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
            
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