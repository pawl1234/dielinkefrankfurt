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
  Avatar,
  Chip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListSubheader,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import SettingsIcon from '@mui/icons-material/Settings';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import GroupsIcon from '@mui/icons-material/Groups';
import RichTextEditor from '../RichTextEditor';
import { NewsletterSettings } from '@/lib/newsletter-template';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface Appointment {
  id: number;
  title: string;
  teaser: string;
  startDateTime: string;
  featured: boolean;
  metadata?: string;
}

interface Group {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
}

interface StatusReport {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  reporterFirstName: string;
  reporterLastName: string;
}

interface GroupWithReports {
  group: Group;
  reports: StatusReport[];
}

// Helper function to truncate text for display
const truncateText = (text: string, maxLength: number = 300): string => {
  if (!text || text.length <= maxLength) {
    return text || '';
  }
  
  // Find the last space within the maxLength
  const lastSpace = text.substring(0, maxLength).lastIndexOf(' ');
  
  // If no space found, just cut at maxLength
  const truncatedText = lastSpace !== -1 ? text.substring(0, lastSpace) : text.substring(0, maxLength);
  
  return truncatedText + '...';
};

const NewsletterGenerator: React.FC = () => {
  const [settings, setSettings] = useState<NewsletterSettings>({} as NewsletterSettings);
  const [introductionText, setIntroductionText] = useState<string>('<p>Herzlich willkommen zum Newsletter der Linken Frankfurt!</p>');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [featuredAppointments, setFeaturedAppointments] = useState<Appointment[]>([]);
  const [statusReportsByGroup, setStatusReportsByGroup] = useState<GroupWithReports[]>([]);
  const [statusReportsLoading, setStatusReportsLoading] = useState(false);
  const [alert, setAlert] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Fetch newsletter settings and content
  useEffect(() => {
    const fetchData = async () => {
      try {
        setSettingsLoading(true);
        setStatusReportsLoading(true);
        
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
          const response = await appointmentsResponse.json();
          // Handle both array or paginated response format
          const appointments = response.items ? response.items : response;
          // Filter for featured appointments
          const featured = appointments.filter((app: Appointment) => app.featured);
          setFeaturedAppointments(featured);
          console.log("Featured appointments loaded:", featured);
        }
        
        // Fetch status reports by group
        const statusReportsResponse = await fetch('/api/admin/newsletter/status-reports');
        if (statusReportsResponse.ok) {
          const { statusReportsByGroup } = await statusReportsResponse.json();
          setStatusReportsByGroup(statusReportsByGroup);
          console.log("Status reports loaded:", statusReportsByGroup);
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
        setStatusReportsLoading(false);
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
          maxLength={5000}
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
      
      {/* Status Reports Preview */}
      <Card sx={{ mt: 3, mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <GroupsIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="subtitle1" fontWeight="bold">
              Gruppenberichte im Newsletter
            </Typography>
            {statusReportsLoading && <CircularProgress size={20} sx={{ ml: 2 }} />}
          </Box>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Berichte der letzten zwei Wochen von Gruppen, alphabetisch sortiert.
          </Typography>
          
          {statusReportsByGroup && statusReportsByGroup.length > 0 ? (
            <Box sx={{ mt: 2 }}>
              {statusReportsByGroup.map((groupWithReports) => (
                <Accordion key={groupWithReports.group.id} sx={{ mb: 2 }}>
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    aria-controls={`group-${groupWithReports.group.id}-content`}
                    id={`group-${groupWithReports.group.id}-header`}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {groupWithReports.group.logoUrl ? (
                        <Avatar 
                          src={groupWithReports.group.logoUrl} 
                          alt={groupWithReports.group.name}
                          sx={{ mr: 2, width: 40, height: 40 }}
                        />
                      ) : (
                        <Avatar sx={{ mr: 2, width: 40, height: 40, bgcolor: 'primary.main' }}>
                          {groupWithReports.group.name.substring(0, 1)}
                        </Avatar>
                      )}
                      <Box>
                        <Typography variant="subtitle1">
                          {groupWithReports.group.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {groupWithReports.reports.length} Bericht(e)
                        </Typography>
                      </Box>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List sx={{ width: '100%', bgcolor: 'background.paper', padding: 0 }}>
                      {groupWithReports.reports.map((report) => (
                        <ListItem
                          key={report.id}
                          alignItems="flex-start"
                          sx={{ 
                            borderBottom: '1px dashed #e0e0e0',
                            paddingY: 2,
                            flexDirection: 'column',
                            alignItems: 'stretch'
                          }}
                        >
                          <ListItemText
                            primary={report.title}
                            secondary={truncateText(report.content, 300)}
                            slotProps={{
                              primary: {
                                variant: "subtitle1",
                                color: "text.primary",
                                fontWeight: "medium"
                              },
                              secondary: {
                                variant: "body2",
                                component: "div" // Critical fix - changes p to div
                              }
                            }}
                          />
                          
                          {/* Keep buttons and chips outside the ListItemText */}
                          <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Chip 
                              label={format(new Date(report.createdAt), 'PPP', { locale: de })}
                              size="small"
                              variant="outlined"
                              sx={{ mr: 1 }}
                            />
                            <Button 
                              variant="contained" 
                              color="primary" 
                              size="small"
                              sx={{ minWidth: 'fit-content' }}
                            >
                              Mehr Infos
                            </Button>
                          </Box>
                        </ListItem>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          ) : !statusReportsLoading && (
            <Box sx={{ textAlign: 'center', p: 3, bgcolor: '#f9f9f9' }} component="div">
              <Typography variant="body1" color="text.secondary">
                Keine aktuellen Gruppenberichte verfügbar.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }} component="div">
                Es wurden keine Berichte von Gruppen in den letzten zwei Wochen veröffentlicht.
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

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