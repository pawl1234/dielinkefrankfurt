import React, { useState, useEffect, useRef } from 'react';
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
  Tab,
  Tabs,
} from '@mui/material';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import SettingsIcon from '@mui/icons-material/Settings';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import ForwardToInboxIcon from '@mui/icons-material/ForwardToInbox';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import RichTextEditor from '../editor/RichTextEditor';
import { NewsletterSettings } from '@/lib/newsletter-template';
import { format } from 'date-fns';
import NewsletterSendingForm from './NewsletterSendingForm';
import NewsletterArchives, { NewsletterArchivesRef } from './NewsletterArchives';





interface NewsletterGeneratorProps {
  introductionText?: string;
}


const NewsletterGenerator: React.FC<NewsletterGeneratorProps> = ({ 
  introductionText: externalIntroductionText
}) => {
  const [settings, setSettings] = useState<NewsletterSettings>({} as NewsletterSettings);
  const [introductionText, setIntroductionText] = useState<string>(
    externalIntroductionText || '<p>Herzlich willkommen zum Newsletter der Linken Frankfurt!</p>'
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [alert, setAlert] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [activeTab, setActiveTab] = useState<number>(0);
  const [generatedNewsletter, setGeneratedNewsletter] = useState<string>('');
  const [subject, setSubject] = useState<string>(`Die Linke Frankfurt Newsletter - ${format(new Date(), 'dd.MM.yyyy')}`);
  
  // Create ref for NewsletterArchives
  const archivesRef = useRef<NewsletterArchivesRef>(null);
  
  // Handle newsletter sending completion
  const handleNewsletterSent = () => {
    console.log('=== NEWSLETTER SENDING COMPLETED ===');
    console.log('archivesRef.current:', archivesRef.current);
    console.log('activeTab:', activeTab);
    
    // Refresh the archives when a newsletter is sent
    if (archivesRef.current) {
      console.log('Calling refresh on archives...');
      archivesRef.current.refresh();
    } else {
      console.log('archivesRef.current is null, cannot refresh');
    }
    console.log('====================================');
  };
  
  // Check for tab and newsletterId query parameters on initial load
  useEffect(() => {
    // Get the query parameters from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    const newsletterId = urlParams.get('newsletterId');
    
    // Set the active tab based on the query parameter
    if (tabParam === 'archives') {
      setActiveTab(2); // Archives tab
    }
    
    // Update the URL to remove the newsletterId parameter (to avoid state issues on refresh)
    if (newsletterId) {
      const url = new URL(window.location.href);
      url.searchParams.delete('newsletterId');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  // Handle tab change
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    
    // Update the URL with the tab parameter without refreshing the page
    const url = new URL(window.location.href);
    if (newValue === 2) {
      url.searchParams.set('tab', 'archives');
    } else {
      url.searchParams.delete('tab');
    }
    
    window.history.pushState({}, '', url.toString());
  };

  // Fetch newsletter settings and content
  useEffect(() => {
    const fetchData = async () => {
      try {
        setSettingsLoading(true);
        
        // Fetch settings from the API
        const settingsResponse = await fetch('/api/admin/newsletter/settings');
        if (settingsResponse.ok) {
          const data = await settingsResponse.json();
          setSettings(data);
          console.log("Settings loaded:", data);
        }
      } catch (error) {
        console.error('Error fetching newsletter data:', error);
        setAlert({
          open: true,
          message: 'Fehler beim Abrufen der Newsletter-Daten',
          severity: 'error',
        });
      } finally {
        setSettingsLoading(false);
      }
    };

    fetchData();
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
      const response = await fetch(`/api/admin/newsletter/generate?introductionText=${encodedIntroductionText}`);

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
    
    if (newsletter) {
      // Store the generated newsletter for the sending form
      setGeneratedNewsletter(newsletter);
      
      // Create a blob with the HTML content
      const blob = new Blob([newsletter], { type: 'text/html' });
      
      // Create a URL for the blob
      const blobUrl = URL.createObjectURL(blob);
      
      // Open the URL in a new tab
      window.open(blobUrl, '_blank');
      
      // Clean up the URL object after a delay
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 30000); // Clean up after 30 seconds
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
        await response.json();
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
      
      {/* Tabs for different sections */}
      <Tabs 
        value={activeTab} 
        onChange={handleTabChange} 
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab 
          label="Inhalt erstellen" 
          icon={<MailOutlineIcon />} 
          iconPosition="start"
        />
        <Tab 
          label="Newsletter versenden" 
          icon={<ForwardToInboxIcon />} 
          iconPosition="start"
          disabled={!generatedNewsletter}
        />
        <Tab 
          label="Archiv" 
          icon={<ArchiveOutlinedIcon />} 
          iconPosition="start"
        />
      </Tabs>
      
      {/* Content Tab */}
      {activeTab === 0 && (
        <>
          {/* Email Subject */}
          <TextField
            label="Newsletter Betreff"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            fullWidth
            margin="normal"
            sx={{ mb: 2 }}
          />
          
          <Typography variant="subtitle1" gutterBottom>
            Einleitung des Newsletters
          </Typography>
          <Box sx={{ mb: 3 }}>
            <RichTextEditor
              value={introductionText}
              onChange={(introductionText) => setIntroductionText(introductionText)}
              maxLength={5000}
              placeholder="Einleitungstext für Mittwochsmail"
            />
          </Box>
          
          {/* Action buttons */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3, gap: 2 }}>
            <Button
              variant="contained"
              color="primary"
              disabled={loading}
              onClick={handlePreviewNewsletter}
              startIcon={loading ? <CircularProgress size={20} /> : <MailOutlineIcon />}
            >
              Newsletter generieren & anzeigen
            </Button>
            {generatedNewsletter && (
              <Button
                variant="contained"
                color="primary"
                onClick={() => setActiveTab(1)}
                startIcon={<ForwardToInboxIcon />}
              >
                Weiter zur Versand-Seite
              </Button>
            )}
          </Box>
        </>
      )}
      
      {/* Sending Tab */}
      {activeTab === 1 && generatedNewsletter && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6" gutterBottom>
            Newsletter versenden
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Senden Sie den generierten Newsletter an Ihre Empfänger.
          </Typography>
          
          <NewsletterSendingForm 
            newsletterHtml={generatedNewsletter} 
            subject={subject}
            onComplete={handleNewsletterSent}
          />
          
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-start' }}>
            <Button
              variant="outlined"
              onClick={() => setActiveTab(0)}
            >
              Zurück zur Bearbeitung
            </Button>
          </Box>
        </Box>
      )}
      
      {/* Archives Tab */}
      {activeTab === 2 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6" gutterBottom>
            Newsletter-Archiv
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Übersicht aller gesendeten Newsletter.
          </Typography>
          
          <NewsletterArchives ref={archivesRef} />
        </Box>
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
                helperText="E-Mail-Adresse des Absenders (z.B. newsletter@die-linke-frankfurt.de)"
              />
              
              <TextField
                label="Antwort-E-Mail"
                value={settings.replyToEmail || ''}
                onChange={(e) => setSettings({ ...settings, replyToEmail: e.target.value })}
                fullWidth
                margin="normal"
                helperText="E-Mail-Adresse für Antworten (falls abweichend vom Absender)"
              />
              
              <TextField
                label="Betreff-Vorlage"
                value={settings.subjectTemplate || ''}
                onChange={(e) => setSettings({ ...settings, subjectTemplate: e.target.value })}
                fullWidth
                margin="normal"
                helperText="Vorlage für den E-Mail-Betreff. Verwende {date} für das aktuelle Datum."
              />
              
              <TextField
                label="Batch-Größe"
                value={settings.batchSize || 100}
                onChange={(e) => setSettings({ ...settings, batchSize: parseInt(e.target.value) || 100 })}
                type="number"
                InputProps={{ inputProps: { min: 1, max: 500 } }}
                fullWidth
                margin="normal"
                helperText="Anzahl der E-Mails pro Batch (1-500, empfohlen: 100)"
              />
              
              <TextField
                label="Batch-Verzögerung (ms)"
                value={settings.batchDelay || 1000}
                onChange={(e) => setSettings({ ...settings, batchDelay: parseInt(e.target.value) || 1000 })}
                type="number"
                InputProps={{ inputProps: { min: 100, max: 10000 } }}
                fullWidth
                margin="normal"
                helperText="Verzögerung zwischen Batches in Millisekunden (100-10000, empfohlen: 1000)"
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