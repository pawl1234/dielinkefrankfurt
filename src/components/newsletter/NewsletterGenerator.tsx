import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  TextField,
  Typography,
  IconButton,
  Snackbar,
  Alert,
  Divider,
  LinearProgress,
  FormControlLabel,
  Switch,
  Card,
  CardContent,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import SettingsIcon from '@mui/icons-material/Settings';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import RichTextEditor from '../RichTextEditor';
import { htmlToText } from 'nodemailer-html-to-text';

interface NewsletterSettings {
  id?: number;
  headerLogo?: string | null;
  headerBanner?: string | null;
  footerText?: string | null;
  unsubscribeLink?: string | null;
  testEmailRecipients?: string | null;
}

const NewsletterGenerator: React.FC = () => {
  const [settings, setSettings] = useState<NewsletterSettings>({});
  const [introductionText, setIntroductionText] = useState<string>('<p>Herzlich willkommen zum Newsletter der Linken Frankfurt!</p>');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [newsletterHtml, setNewsletterHtml] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [alert, setAlert] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Fetch newsletter settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setSettingsLoading(true);
        const response = await fetch('/api/admin/newsletter/settings');
        if (response.ok) {
          const data = await response.json();
          setSettings(data); // Add this line to update the state with fetched settings ✅
          console.log("Settings loaded:", data); // Optional: log for debugging
        }
      } catch (error) {
        console.error('Error fetching newsletter settings:', error);
        setAlert({
          open: true,
          message: 'Fehler beim Abrufen der Newsletter-Einstellungen',
          severity: 'error',
        });
      } finally {
        setSettingsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // Save newsletter settings
  const handleSaveSettings = async () => {
    try {
      setSettingsLoading(true);
      const response = await fetch('/api/admin/newsletter/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        setAlert({
          open: true,
          message: 'Newsletter-Einstellungen erfolgreich gespeichert',
          severity: 'success',
        });
        setSettingsOpen(false);
      } else {
        setAlert({
          open: true,
          message: 'Fehler beim Speichern der Newsletter-Einstellungen',
          severity: 'error',
        });
      }
    } catch (error) {
      console.error('Error saving newsletter settings:', error);
      setAlert({
        open: true,
        message: 'Fehler beim Speichern der Newsletter-Einstellungen',
        severity: 'error',
      });
    } finally {
      setSettingsLoading(false);
    }
  };

  const getNewsletter = async () => {
    try {
      setLoading(true);

      // Encode the introduction text for URL parameters
      const encodedIntroductionText = encodeURIComponent(introductionText);

      // Fetch the newsletter HTML
      const response = await fetch(`/api/admin/newsletter?introductionText=${encodedIntroductionText}`);

      if (response.ok) {
        const html = await response.text();

        // Store the HTML content
        return html;
      } else {
        setAlert({
          open: true,
          message: 'Fehler beim Generieren des Newsletters',
          severity: 'error',
        });
      }
    } catch (error) {
      console.error('Error generating newsletter:', error);
      setAlert({
        open: true,
        message: 'Fehler beim Generieren des Newsletters',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  }
  // Generate newsletter and open in new tab
  const handlePreviewNewsletter = async () => {
    
    const newsletter = await getNewsletter();
    const newTab = window.open('', '_blank');

    if (newTab && newsletter) {
      // The new tab/window was successfully opened
      newTab.document.write(newsletter);
      newTab.document.close();
    } else {
      // If popup blocked, fallback to modal
      setPreviewOpen(true);
      setAlert({
        open: true,
        message: 'Pop-up wurde blockiert. Bitte erlauben Sie Pop-ups für diese Seite.',
        severity: 'error',
      });
    }
  };

  // Send a test email
  const handleSendTestEmail = async () => {
    try {
      setSendingTest(true);

      const newsletter = await getNewsletter();

      const response = await fetch('/api/admin/newsletter/send-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ html: newsletter }),
      });

      if (response.ok) {
        const result = await response.json();
        setAlert({
          open: true,
          message: 'Test Newsletter erfolgreich gesendet',
          severity: 'success',
        });
      } else {
        const error = await response.json();
        console.error('Error sending test newsletter:', error);
        setAlert({
          open: true,
          message: `Fehler beim Senden des Test-Newsletters: ${error.message || error.error || 'Unbekannter Fehler'}`,
          severity: 'error',
        });
      }
    } catch (error) {
      console.error('Error sending test newsletter:', error);
      setAlert({
        open: true,
        message: 'Fehler beim Senden des Test-Newsletters',
        severity: 'error',
      });
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <Paper sx={{ p: 3, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="h2">
          <MailOutlineIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Newsletter Generator
        </Typography>
        <Button
          variant="outlined"
          startIcon={<SettingsIcon />}
          onClick={() => setSettingsOpen(true)}
        >
          Einstellungen
        </Button>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Preview & Testing Section */}
        <Card sx={{ mb: 3, backgroundColor: '#f8f9fa' }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1" fontWeight="bold">
                Newsletter Vorschau & Test
              </Typography>
              <Box>
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={sendingTest ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                  onClick={handleSendTestEmail}
                  disabled={sendingTest}
                  size="small"
                >
                  Test-Email senden
                </Button>
              </Box>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Test-Emails werden an die konfigurierten Empfänger gesendet, die in den Einstellungen festgelegt wurden. Die Email enthält nur den Newsletter-Inhalt, ohne diesen Steuerungsbereich.
            </Typography>
          </CardContent>
        </Card>

      <Typography variant="subtitle1" gutterBottom>
        Einleitung des Newsletters
      </Typography>
     {/*  <TextField
        label="Einleitungstext (HTML)"
        multiline
        rows={4}
        value={introductionText}
        onChange={(e) => setIntroductionText(e.target.value)}
        fullWidth
        margin="normal"
        helperText="HTML-Tags können verwendet werden, z.B. <p>, <b>, <i>, etc."
      />*/}
      <Box sx={{ mb: 3 }}>
        <RichTextEditor
          value={introductionText}
          onChange={(introductionText) => setIntroductionText(introductionText)}
          maxLength={1000}
          placeholder="Einleitungstext für Mittwochsmail"
        />
      </Box>
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          color="primary"
          disabled={loading}
          onClick={handlePreviewNewsletter}
          startIcon={loading ? <CircularProgress size={20} /> : <MailOutlineIcon />}
        >
          Newsletter Preview
        </Button>
      </Box>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Newsletter-Einstellungen
          <IconButton
            aria-label="close"
            onClick={() => setSettingsOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {settingsLoading ? (
            <LinearProgress sx={{ my: 2 }} />
          ) : (
            <Box sx={{ mt: 2 }}>
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
                helperText="Email-Adressen für Testemails (durch Komma getrennt: email1@beispiel.de, email2@beispiel.de)"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Abbrechen</Button>
          <Button
            onClick={handleSaveSettings}
            color="primary"
            variant="contained"
            disabled={settingsLoading}
          >
            {settingsLoading ? <CircularProgress size={24} /> : 'Speichern'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Newsletter Preview Dialog not used at the moment 
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Newsletter-Vorschau
          <IconButton
            aria-label="close"
            onClick={() => setPreviewOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              startIcon={<ContentCopyIcon />}
              onClick={handleCopyHtml}
            >
              HTML kopieren
            </Button>
          </Box>
          <Paper sx={{ p: 2, maxHeight: '500px', overflow: 'auto', border: '1px solid #ddd' }}>
            <iframe
              srcDoc={newsletterHtml}
              style={{ width: '100%', height: '500px', border: 'none' }}
              title="Newsletter-Vorschau"
            />
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Schließen</Button>
        </DialogActions>
      </Dialog>
        */}
      {/* Alert Snackbar */}
      <Snackbar
        open={alert.open}
        autoHideDuration={6000}
        onClose={() => setAlert({ ...alert, open: false })}
      >
        <Alert
          onClose={() => setAlert({ ...alert, open: false })}
          severity={alert.severity}
        >
          {alert.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default NewsletterGenerator;