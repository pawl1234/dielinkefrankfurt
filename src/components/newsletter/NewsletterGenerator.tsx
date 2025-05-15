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
  Card,
  CardContent,
  CardMedia,
} from '@mui/material';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import SettingsIcon from '@mui/icons-material/Settings';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import RichTextEditor from '../RichTextEditor';
import { NewsletterSettings } from '@/lib/newsletter-template';

interface Appointment {
  id: number;
  title: string;
  teaser: string;
  startDateTime: string;
  featured: boolean;
  metadata?: string;
}

const NewsletterGenerator: React.FC = () => {
  const [settings, setSettings] = useState<NewsletterSettings>({} as NewsletterSettings);
  const [introductionText, setIntroductionText] = useState<string>('<p>Herzlich willkommen zum Newsletter der Linken Frankfurt!</p>');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [featuredAppointments, setFeaturedAppointments] = useState<Appointment[]>([]);
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
        
        // Fetch settings from the API
        const settingsResponse = await fetch('/api/admin/newsletter/settings');
        if (settingsResponse.ok) {
          const data = await settingsResponse.json();
          setSettings(data);
          console.log("Settings loaded:", data);
        }
        
        // Fetch featured appointments to display their images
        const appointmentsResponse = await fetch('/api/admin/newsletter/appointments');
        if (appointmentsResponse.ok) {
          const appointments = await appointmentsResponse.json();
          // Filter for featured appointments
          const featured = appointments.filter((app: Appointment) => app.featured);
          setFeaturedAppointments(featured);
          console.log("Featured appointments loaded:", featured);
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

  // Get and return newsletter HTML from the API
  const getNewsletter = async () => {
    try {
      setLoading(true);

      // Encode the introduction text for URL parameters
      const encodedIntroductionText = encodeURIComponent(introductionText);

      // Fetch the newsletter HTML
      const response = await fetch(`/api/admin/newsletter?introductionText=${encodedIntroductionText}`);

      if (response.ok) {
        const html = await response.text();
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
  };

  // Generate newsletter and open in new tab
  const handlePreviewNewsletter = async () => {
    const newsletter = await getNewsletter();
    
    // Create a blob with the HTML content
    const blob = new Blob([newsletter || ''], { type: 'text/html' });
    
    // Create a URL for the blob
    const blobUrl = URL.createObjectURL(blob);
    
    // Open the URL in a new tab
    window.open(blobUrl, '_blank');
    
    // Clean up the URL object after a delay
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 30000); // Clean up after 30 seconds
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
<Box
  sx={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    mb: 2
  }}
>
  <Typography variant="h5" component="h2">
    <MailOutlineIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
    Newsletter Generator
  </Typography>
  <Box sx={{ display: 'flex', marginLeft: 'auto', gap: 1 }}>
      <Button
        variant="outlined"
        startIcon={<SettingsIcon />}
        onClick={() => setSettingsOpen(true)}
      >
        Einstellungen
      </Button>
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
  </Box>

      <Divider sx={{ mb: 3 }} />

      <Typography variant="subtitle1" gutterBottom>
        Einleitung des Newsletters
      </Typography>
      <Box sx={{ mb: 3 }}>
        <RichTextEditor
          value={introductionText}
          onChange={(introductionText) => setIntroductionText(introductionText)}
          maxLength={1000}
          placeholder="Einleitungstext für Mittwochsmail"
        />
      </Box>
      {/* Featured Appointments Preview */}
      {featuredAppointments.length > 0 && (
        <Card sx={{ mt: 3, mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Featured Termine im Newsletter
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Diese Termine werden im Newsletter mit Titelbild hervorgehoben.
            </Typography>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {featuredAppointments.map(appointment => {
                // Parse metadata to get cover image URLs
                let coverImageUrl = null;
                let croppedCoverImageUrl = null;
                
                if (appointment.metadata) {
                  try {
                    const metadata = JSON.parse(appointment.metadata);
                    coverImageUrl = metadata.coverImageUrl;
                    croppedCoverImageUrl = metadata.croppedCoverImageUrl;
                  } catch (e) {
                    console.error('Error parsing appointment metadata:', e);
                  }
                }
                
                return (
                  <Card key={appointment.id} sx={{ width: '100%', mb: 2 }}>
                    {croppedCoverImageUrl && (
                      <CardMedia
                        component="img"
                        height="150"
                        image={croppedCoverImageUrl}
                        alt={appointment.title}
                        sx={{ objectFit: 'cover' }}
                      />
                    )}
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {appointment.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {appointment.teaser}
                      </Typography>
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        {new Date(appointment.startDateTime).toLocaleDateString('de-DE', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Typography>
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          </CardContent>
        </Card>
      )}

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