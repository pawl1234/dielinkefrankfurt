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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import SaveIcon from '@mui/icons-material/Save';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TuneIcon from '@mui/icons-material/Tune';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { NEWSLETTER_LIMITS, STATUS_REPORT_LIMITS } from '@/lib/newsletter-constants';
import { DEFAULT_AI_SYSTEM_PROMPT, DEFAULT_AI_VORSTANDSPROTOKOLL_PROMPT, DEFAULT_TOPIC_EXTRACTION_PROMPT } from '@/lib/ai-prompts';
import { AI_MODELS, DEFAULT_AI_MODEL } from '@/lib/ai-models';

export default function NewsletterSettingsPage() {
  const router = useRouter();
  const { status } = useSession();
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
    chunkSize: 50,
    chunkDelay: 500,
    emailTimeout: 60000,
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 45000,
    maxConnections: 5,
    maxMessages: 100,
    maxRetries: 3,
    maxBackoffDelay: 10000,
    retryChunkSizes: '10,5,1',
    // Header composition settings
    compositeWidth: 600,
    compositeHeight: 200,
    logoTopOffset: 20,
    logoLeftOffset: 20,
    logoHeight: 60,
    compositeImageUrl: '',
    compositeImageHash: '',
    // Newsletter content limits
    maxFeaturedAppointments: 5,
    maxUpcomingAppointments: 20,
    maxStatusReportsPerGroup: 3,
    maxGroupsWithReports: 10,
    // AI settings
    aiSystemPrompt: '',
    aiVorstandsprotokollPrompt: '',
    aiTopicExtractionPrompt: '',
    aiModel: DEFAULT_AI_MODEL,
    anthropicApiKey: '',
    // Status report limits
    statusReportTitleLimit: 100,
    statusReportContentLimit: 5000,
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
    } catch {
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
    } catch {
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
              Header-Komposition (Erweitert)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Automatische Generierung von Composite-Header-Bildern für bessere Email-Client-Kompatibilität.
              Das System kombiniert Banner und Logo zu einem Bild, wenn beide URLs vorhanden sind.
            </Typography>
            
            {settings.compositeImageUrl && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Composite-Bild wurde erfolgreich generiert: 
                <Box component="span" sx={{ ml: 1 }}>
                  <a href={settings.compositeImageUrl} target="_blank" rel="noopener noreferrer">
                    Vorschau anzeigen
                  </a>
                </Box>
              </Alert>
            )}
            
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Composite-Breite (px)"
                  value={settings.compositeWidth || 600}
                  onChange={(e) => setSettings({ ...settings, compositeWidth: parseInt(e.target.value) || 600 })}
                  type="number"
                  InputProps={{ inputProps: { min: 200, max: 1200 } }}
                  fullWidth
                  margin="normal"
                  helperText="Breite des generierten Composite-Bildes (200-1200px)"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Composite-Höhe (px)"
                  value={settings.compositeHeight || 200}
                  onChange={(e) => setSettings({ ...settings, compositeHeight: parseInt(e.target.value) || 200 })}
                  type="number"
                  InputProps={{ inputProps: { min: 100, max: 400 } }}
                  fullWidth
                  margin="normal"
                  helperText="Höhe des generierten Composite-Bildes (100-400px)"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="Logo-Höhe (px)"
                  value={settings.logoHeight || 60}
                  onChange={(e) => setSettings({ ...settings, logoHeight: parseInt(e.target.value) || 60 })}
                  type="number"
                  InputProps={{ inputProps: { min: 20, max: 200 } }}
                  fullWidth
                  margin="normal"
                  helperText="Höhe des Logos im Composite (20-200px)"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="Logo-Position Oben (px)"
                  value={settings.logoTopOffset || 20}
                  onChange={(e) => setSettings({ ...settings, logoTopOffset: parseInt(e.target.value) || 20 })}
                  type="number"
                  InputProps={{ inputProps: { min: 0, max: 300 } }}
                  fullWidth
                  margin="normal"
                  helperText="Abstand des Logos vom oberen Rand"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="Logo-Position Links (px)"
                  value={settings.logoLeftOffset || 20}
                  onChange={(e) => setSettings({ ...settings, logoLeftOffset: parseInt(e.target.value) || 20 })}
                  type="number"
                  InputProps={{ inputProps: { min: 0, max: 800 } }}
                  fullWidth
                  margin="normal"
                  helperText="Abstand des Logos vom linken Rand"
                />
              </Grid>
            </Grid>
            
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, p: 2, bgcolor: 'info.50', borderRadius: 1 }}>
              <strong>💡 Hinweis:</strong> Das Composite-Bild wird automatisch generiert, wenn sowohl Banner- als auch Logo-URL vorhanden sind. 
              Dies verbessert die Darstellung in Email-Clients wie Gmail, die CSS-Overlays nicht korrekt rendern. 
              Bei Fehlern wird automatisch auf die CSS-Overlay-Methode zurückgefallen.
            </Typography>
            
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
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
              <strong>BCC-Modus aktiviert:</strong> Alle E-Mails werden automatisch im BCC-Modus versendet für optimale Performance.
            </Typography>
            
            <Divider sx={{ my: 3 }} />
            
            <Typography variant="h6" gutterBottom>
              Newsletter Inhalts-Limits
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Diese Einstellungen begrenzen die Anzahl der Termine und Statusberichte im Newsletter, um eine konsistente Länge und Performance zu gewährleisten.
            </Typography>
            
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Max. Featured Termine"
                  value={settings.maxFeaturedAppointments ?? 5}
                  onChange={(e) => setSettings({ ...settings, maxFeaturedAppointments: parseInt(e.target.value) || 5 })}
                  type="number"
                  InputProps={{ inputProps: { min: NEWSLETTER_LIMITS.FEATURED_APPOINTMENTS.MIN, max: NEWSLETTER_LIMITS.FEATURED_APPOINTMENTS.MAX } }}
                  fullWidth
                  margin="normal"
                  helperText={`Maximale Anzahl hervorgehobener Termine (${NEWSLETTER_LIMITS.FEATURED_APPOINTMENTS.MIN}-${NEWSLETTER_LIMITS.FEATURED_APPOINTMENTS.MAX})`}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Max. Weitere Termine"
                  value={settings.maxUpcomingAppointments ?? 20}
                  onChange={(e) => setSettings({ ...settings, maxUpcomingAppointments: parseInt(e.target.value) || 20 })}
                  type="number"
                  InputProps={{ inputProps: { min: NEWSLETTER_LIMITS.UPCOMING_APPOINTMENTS.MIN, max: NEWSLETTER_LIMITS.UPCOMING_APPOINTMENTS.MAX } }}
                  fullWidth
                  margin="normal"
                  helperText={`Maximale Anzahl weiterer Termine (${NEWSLETTER_LIMITS.UPCOMING_APPOINTMENTS.MIN}-${NEWSLETTER_LIMITS.UPCOMING_APPOINTMENTS.MAX})`}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Max. Berichte pro Gruppe"
                  value={settings.maxStatusReportsPerGroup ?? 3}
                  onChange={(e) => setSettings({ ...settings, maxStatusReportsPerGroup: parseInt(e.target.value) || 3 })}
                  type="number"
                  InputProps={{ inputProps: { min: NEWSLETTER_LIMITS.STATUS_REPORTS_PER_GROUP.MIN, max: NEWSLETTER_LIMITS.STATUS_REPORTS_PER_GROUP.MAX } }}
                  fullWidth
                  margin="normal"
                  helperText={`Maximale Statusberichte pro Gruppe (${NEWSLETTER_LIMITS.STATUS_REPORTS_PER_GROUP.MIN}-${NEWSLETTER_LIMITS.STATUS_REPORTS_PER_GROUP.MAX})`}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Max. Gruppen mit Berichten"
                  value={settings.maxGroupsWithReports ?? 10}
                  onChange={(e) => setSettings({ ...settings, maxGroupsWithReports: parseInt(e.target.value) || 10 })}
                  type="number"
                  InputProps={{ inputProps: { min: NEWSLETTER_LIMITS.GROUPS_WITH_REPORTS.MIN, max: NEWSLETTER_LIMITS.GROUPS_WITH_REPORTS.MAX } }}
                  fullWidth
                  margin="normal"
                  helperText={`Maximale Anzahl Gruppen mit Statusberichten (${NEWSLETTER_LIMITS.GROUPS_WITH_REPORTS.MIN}-${NEWSLETTER_LIMITS.GROUPS_WITH_REPORTS.MAX})`}
                />
              </Grid>
            </Grid>
            
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, p: 2, bgcolor: 'warning.50', borderRadius: 1 }}>
              <strong>⚠️ Hinweis:</strong> Diese Limits werden sofort beim nächsten Newsletter-Generieren angewendet.
              Niedrigere Werte reduzieren die Newsletter-Größe, können aber wichtige Inhalte ausschließen.
            </Typography>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>
              Gruppen & Status Reports
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Diese Einstellungen bestimmen die Längen-Limits für Statusberichte, die über das Formular eingereicht werden.
            </Typography>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Status Report Titel Limit"
                  value={settings.statusReportTitleLimit ?? 100}
                  onChange={(e) => setSettings({ ...settings, statusReportTitleLimit: parseInt(e.target.value) || 100 })}
                  type="number"
                  InputProps={{ inputProps: { min: STATUS_REPORT_LIMITS.TITLE.MIN, max: STATUS_REPORT_LIMITS.TITLE.MAX } }}
                  fullWidth
                  margin="normal"
                  helperText={`Maximale Zeichen für Statusbericht-Titel (${STATUS_REPORT_LIMITS.TITLE.MIN}-${STATUS_REPORT_LIMITS.TITLE.MAX})`}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Status Report Inhalt Limit"
                  value={settings.statusReportContentLimit ?? 5000}
                  onChange={(e) => setSettings({ ...settings, statusReportContentLimit: parseInt(e.target.value) || 5000 })}
                  type="number"
                  InputProps={{ inputProps: { min: STATUS_REPORT_LIMITS.CONTENT.MIN, max: STATUS_REPORT_LIMITS.CONTENT.MAX } }}
                  fullWidth
                  margin="normal"
                  helperText={`Maximale Zeichen für Statusbericht-Inhalt (${STATUS_REPORT_LIMITS.CONTENT.MIN}-${STATUS_REPORT_LIMITS.CONTENT.MAX})`}
                />
              </Grid>
            </Grid>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, p: 2, bgcolor: 'info.50', borderRadius: 1 }}>
              <strong>💡 Hinweis:</strong> Diese Limits werden sofort bei der nächsten Statusbericht-Einreichung angewendet.
              Bestehende Berichte bleiben unverändert. Das System berücksichtigt diese Limits sowohl im Frontend als auch im Backend.
            </Typography>

            <Divider sx={{ my: 3 }} />
            
            <Accordion>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls="ai-settings-content"
                id="ai-settings-header"
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AutoAwesomeIcon />
                  <Typography variant="h6">AI-Generierung</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <TextField
                  label="Anthropic API Key"
                  type="password"
                  value={settings.anthropicApiKey || ''}
                  onChange={(e) => setSettings({ ...settings, anthropicApiKey: e.target.value })}
                  fullWidth
                  margin="normal"
                  helperText="API-Schlüssel für Anthropic Claude"
                />
                
                <FormControl fullWidth margin="normal">
                  <InputLabel>AI-Modell</InputLabel>
                  <Select
                    value={settings.aiModel || DEFAULT_AI_MODEL}
                    onChange={(e) => setSettings({ ...settings, aiModel: e.target.value })}
                    label="AI-Modell"
                  >
                    {AI_MODELS.map((model) => (
                      <MenuItem key={model.id} value={model.id}>
                        <Box>
                          <Typography variant="body1">{model.name}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {model.description}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                  <Typography variant="caption" sx={{ mt: 1, color: 'text.secondary' }}>
                    Wählen Sie das AI-Modell für die Newsletter-Generierung
                  </Typography>
                </FormControl>
                
                <TextField
                  label="System-Prompt für Top Themen"
                  multiline
                  rows={8}
                  value={settings.aiSystemPrompt || DEFAULT_AI_SYSTEM_PROMPT}
                  onChange={(e) => setSettings({ ...settings, aiSystemPrompt: e.target.value })}
                  fullWidth
                  margin="normal"
                  helperText="Haupt-Prompt für die KI-Generierung mit Top Themen. Verwende {{topThemes}} und {{previousIntro}} als Platzhalter."
                />
                
                <TextField
                  label="Zusatz-Prompt für Vorstandsprotokoll (optional)"
                  multiline
                  rows={5}
                  value={settings.aiVorstandsprotokollPrompt || DEFAULT_AI_VORSTANDSPROTOKOLL_PROMPT}
                  onChange={(e) => setSettings({ ...settings, aiVorstandsprotokollPrompt: e.target.value })}
                  fullWidth
                  margin="normal"
                  helperText="Zusätzlicher Prompt für Vorstandsprotokoll-Inhalte. Verwende {{boardProtocol}} als Platzhalter. Wird nur verwendet, wenn ein Vorstandsprotokoll eingegeben wird."
                />
                
                <TextField
                  label="Themen-Extraktion-Prompt für Vorstandsprotokoll"
                  multiline
                  rows={8}
                  value={settings.aiTopicExtractionPrompt || DEFAULT_TOPIC_EXTRACTION_PROMPT}
                  onChange={(e) => setSettings({ ...settings, aiTopicExtractionPrompt: e.target.value })}
                  fullWidth
                  margin="normal"
                  helperText="Prompt für die Extraktion von Themen aus dem Vorstandsprotokoll. Verwende {{boardProtocol}} als Platzhalter. Wird für die neue zweistufige Verarbeitung verwendet."
                />
                
                <Typography variant="caption" sx={{ display: 'block', mt: 2, p: 2, bgcolor: 'info.50', borderRadius: 1 }}>
                  <strong>💡 Hinweis:</strong> Der neue Workflow extrahiert zuerst strukturierte Themen aus dem Vorstandsprotokoll und nutzt diese dann für die Intro-Generierung. Dies führt zu präziseren und besseren Ergebnissen bei langen Protokollen.
                </Typography>
              </AccordionDetails>
            </Accordion>
            
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
                  Diese Einstellungen wurden nach der BCC-Optimierung neu organisiert. Aktive Einstellungen sind hervorgehoben.
                </Typography>
                
                {/* BCC Sending & Performance Section */}
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                  📧 BCC-Versand & Performance (AKTIV)
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Haupteinstellungen für BCC-E-Mail-Versand - diese beeinflussen die Geschwindigkeit direkt!
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Chunk-Größe (BCC Empfänger)"
                      value={settings.chunkSize || 50}
                      onChange={(e) => setSettings({ ...settings, chunkSize: parseInt(e.target.value) || 50 })}
                      type="number"
                      InputProps={{ inputProps: { min: 1, max: 100 } }}
                      fullWidth
                      margin="normal"
                      helperText="Anzahl BCC-Empfänger pro E-Mail (1-100) - KRITISCH für Performance"
                      sx={{ bgcolor: 'primary.50' }}
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
                      helperText="Pause zwischen E-Mail-Chunks (100-5000ms) - KRITISCH für Geschwindigkeit"
                      sx={{ bgcolor: 'primary.50' }}
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
                      helperText="Timeout für E-Mail-Versand (10-300 Sekunden)"
                    />
                  </Grid>
                </Grid>

                {/* Retry Configuration Section */}
                <Typography variant="subtitle1" gutterBottom sx={{ mt: 3, fontWeight: 'bold', color: 'secondary.main' }}>
                  🔁 Wiederholungs-Konfiguration (AKTIV)
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Einstellungen für automatische Wiederholung fehlgeschlagener E-Mails
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Wiederholungs-Chunk-Größen"
                      value={settings.retryChunkSizes || '10,5,1'}
                      onChange={(e) => setSettings({ ...settings, retryChunkSizes: e.target.value })}
                      fullWidth
                      margin="normal"
                      helperText="Kommagetrennte Chunk-Größen für Retry-Stufen (z.B. 10,5,1) - KRITISCH"
                      sx={{ bgcolor: 'secondary.50' }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Max. SMTP Wiederholungen"
                      value={settings.maxRetries || 3}
                      onChange={(e) => setSettings({ ...settings, maxRetries: parseInt(e.target.value) || 3 })}
                      type="number"
                      InputProps={{ inputProps: { min: 1, max: 10 } }}
                      fullWidth
                      margin="normal"
                      helperText="SMTP-Ebene Wiederholungsversuche pro E-Mail (1-10)"
                    />
                  </Grid>
                </Grid>

                {/* SMTP Connection Settings */}
                <Typography variant="subtitle1" gutterBottom sx={{ mt: 3, fontWeight: 'bold' }}>
                  🔧 SMTP Verbindungseinstellungen (AKTIV)
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Timeout-Einstellungen für SMTP-Verbindungen - werden für jede E-Mail verwendet
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

                {/* Legacy/Obsolete Settings Section */}
                <Accordion sx={{ mt: 3, bgcolor: 'grey.50' }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                      ⚠️ Legacy-Einstellungen (größtenteils unbenutzt)
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Diese Einstellungen sind aufgrund der BCC-Optimierungen größtenteils obsolet geworden.
                    </Typography>
                    
                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                      Connection Pooling (DEAKTIVIERT - Nicht verwendet)
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Connection Pooling wurde für BCC-Versand deaktiviert. Jede E-Mail verwendet eine frische Verbindung.
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          label="Max. Verbindungen (nicht verwendet)"
                          value="1 (fest codiert)"
                          disabled
                          fullWidth
                          margin="normal"
                          helperText="Fest auf 1 gesetzt - Connection Pooling deaktiviert"
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          label="Max. Nachrichten (nicht verwendet)"
                          value="1 (fest codiert)"
                          disabled
                          fullWidth
                          margin="normal"
                          helperText="Fest auf 1 gesetzt - Jede Verbindung sendet nur eine E-Mail"
                        />
                      </Grid>
                    </Grid>
                    
                    <Typography variant="subtitle2" gutterBottom sx={{ mt: 3, fontWeight: 'bold', color: 'warning.main' }}>
                      Batch-Einstellungen (OBSOLET - Nicht verwendet beim Versenden)
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Diese Einstellungen werden nur noch für E-Mail-Validierung verwendet, nicht für den Versand.
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          label="Batch-Größe (nur Validierung)"
                          value={settings.batchSize || 100}
                          onChange={(e) => setSettings({ ...settings, batchSize: parseInt(e.target.value) || 100 })}
                          type="number"
                          InputProps={{ inputProps: { min: 10, max: 1000 } }}
                          fullWidth
                          margin="normal"
                          helperText="Nur für E-Mail-Validierung verwendet, nicht für Versand"
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          label="Batch-Verzögerung (nicht verwendet)"
                          value={settings.batchDelay || 1000}
                          onChange={(e) => setSettings({ ...settings, batchDelay: parseInt(e.target.value) || 1000 })}
                          type="number"
                          InputProps={{ inputProps: { min: 100, max: 10000 } }}
                          fullWidth
                          margin="normal"
                          helperText="Nicht verwendet beim Versenden"
                        />
                      </Grid>
                    </Grid>
                    
                    <Typography variant="subtitle2" gutterBottom sx={{ mt: 3, fontWeight: 'bold', color: 'success.main' }}>
                      ✅ Einzelne E-Mail Verzögerung (ENTFERNT)
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Diese Einstellung wurde entfernt, da alle E-Mails jetzt im BCC-Modus versendet werden.
                    </Typography>
                    
                    <Typography variant="subtitle2" gutterBottom sx={{ mt: 3, fontWeight: 'bold', color: 'error.main' }}>
                      Nicht implementierte Einstellungen
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          label="Max. Backoff-Verzögerung (nicht implementiert)"
                          value={settings.maxBackoffDelay || 10000}
                          onChange={(e) => setSettings({ ...settings, maxBackoffDelay: parseInt(e.target.value) || 10000 })}
                          type="number"
                          InputProps={{ inputProps: { min: 1000, max: 60000 } }}
                          fullWidth
                          margin="normal"
                          helperText="Diese Einstellung ist im Code nicht implementiert"
                          disabled
                        />
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
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