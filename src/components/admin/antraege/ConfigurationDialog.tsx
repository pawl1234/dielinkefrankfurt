'use client';

import React, { useState, useEffect, memo, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EmailIcon from '@mui/icons-material/Email';

interface ConfigurationDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (emails: string) => Promise<void>;
  onShowNotification?: (message: string, type: 'success' | 'error') => void;
}

interface AntragConfiguration {
  id: number;
  recipientEmails: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Validate email addresses
 */
function validateEmails(emailString: string): { isValid: boolean; errors: string[]; emails: string[] } {
  const errors: string[] = [];
  
  if (!emailString?.trim()) {
    errors.push('Mindestens eine E-Mail-Adresse ist erforderlich');
    return { isValid: false, errors, emails: [] };
  }

  const emails = emailString.split(',').map(email => email.trim()).filter(Boolean);
  
  if (emails.length === 0) {
    errors.push('Mindestens eine E-Mail-Adresse ist erforderlich');
    return { isValid: false, errors, emails: [] };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  for (const email of emails) {
    if (!emailRegex.test(email)) {
      errors.push(`Ungültige E-Mail-Adresse: ${email}`);
    }
  }

  return { isValid: errors.length === 0, errors, emails };
}

function ConfigurationDialog({
  open,
  onClose,
  onSave,
  onShowNotification
}: ConfigurationDialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailsText, setEmailsText] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validEmails, setValidEmails] = useState<string[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);

  const fetchConfiguration = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/antraege/configuration');
      
      if (!response.ok) {
        if (response.status === 404) {
          // No configuration exists yet, use default
          setEmailsText('admin@die-linke-frankfurt.de,kreisvorstand@die-linke-frankfurt.de');
        } else {
          throw new Error('Fehler beim Laden der Konfiguration');
        }
      } else {
        const config: AntragConfiguration = await response.json();
        setEmailsText(config.recipientEmails || '');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein unerwarteter Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch current configuration when dialog opens
  useEffect(() => {
    if (open) {
      fetchConfiguration();
      setShowSuccess(false);
    }
  }, [open, fetchConfiguration]);

  // Validate emails in real-time
  useEffect(() => {
    if (emailsText.trim()) {
      const validation = validateEmails(emailsText);
      setValidationErrors(validation.errors);
      setValidEmails(validation.emails);
    } else {
      setValidationErrors([]);
      setValidEmails([]);
    }
  }, [emailsText]);

  const handleSave = useCallback(async () => {
    if (validationErrors.length > 0) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave(emailsText.trim());
      setShowSuccess(true);
      
      if (onShowNotification) {
        onShowNotification(
          `E-Mail-Konfiguration wurde erfolgreich gespeichert. ${validEmails.length} Empfänger konfiguriert.`,
          'success'
        );
      }

      // Close dialog after a short delay to show success state
      setTimeout(() => {
        if (!saving) {
          setEmailsText('');
          setValidationErrors([]);
          setValidEmails([]);
          setError(null);
          setShowSuccess(false);
          onClose();
        }
      }, 1500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Fehler beim Speichern der Konfiguration';
      setError(errorMessage);
      
      if (onShowNotification) {
        onShowNotification(errorMessage, 'error');
      }
    } finally {
      setSaving(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validationErrors.length, onSave, emailsText, validEmails.length, onShowNotification, onClose]);

  const handleClose = useCallback(() => {
    if (!saving) {
      setEmailsText('');
      setValidationErrors([]);
      setValidEmails([]);
      setError(null);
      setShowSuccess(false);
      onClose();
    }
  }, [saving, onClose]);

  const isProcessing = loading || saving;
  const canSave = emailsText.trim() && validationErrors.length === 0 && !isProcessing;

  return (
    <Dialog
      open={open}
      onClose={isProcessing ? undefined : handleClose}
      maxWidth="md"
      fullWidth
      disableEscapeKeyDown={isProcessing}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EmailIcon color="primary" />
          <Typography variant="h6" component="span">
            E-Mail-Empfänger konfigurieren
          </Typography>
        </Box>
        <IconButton
          aria-label="close"
          onClick={handleClose}
          disabled={isProcessing}
          sx={{ color: (theme) => theme.palette.grey[500] }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {showSuccess && (
          <Alert 
            severity="success" 
            icon={<CheckCircleIcon />}
            sx={{ mb: 2 }}
          >
            Konfiguration erfolgreich gespeichert!
          </Alert>
        )}

        {!loading && (
          <>
            <Box sx={{ mb: 3 }}>
              <Typography variant="body1" gutterBottom>
                Konfigurieren Sie die E-Mail-Adressen, die bei neuen Anträgen benachrichtigt werden sollen.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Geben Sie mehrere E-Mail-Adressen durch Kommas getrennt ein.
              </Typography>
            </Box>

            <TextField
              label="E-Mail-Empfänger"
              placeholder="admin@die-linke-frankfurt.de, kreisvorstand@die-linke-frankfurt.de"
              multiline
              rows={4}
              fullWidth
              value={emailsText}
              onChange={(e) => setEmailsText(e.target.value)}
              disabled={isProcessing}
              error={validationErrors.length > 0}
              helperText={
                validationErrors.length > 0 
                  ? validationErrors.join('; ')
                  : 'Mehrere E-Mail-Adressen durch Kommas trennen'
              }
              sx={{ mb: 2 }}
            />

            {validEmails.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Gültige E-Mail-Adressen ({validEmails.length}):
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {validEmails.map((email, index) => (
                    <Chip
                      key={index}
                      label={email}
                      size="small"
                      color="success"
                      variant="outlined"
                      icon={<CheckCircleIcon />}
                    />
                  ))}
                </Box>
              </Box>
            )}

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Hinweis:</strong> Diese E-Mail-Adressen erhalten automatisch eine Benachrichtigung,
                wenn ein neuer Antrag eingereicht wird. Stellen Sie sicher, dass alle Adressen korrekt sind.
              </Typography>
            </Alert>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={handleClose}
          disabled={isProcessing}
          variant="outlined"
        >
          Abbrechen
        </Button>
        <Button
          onClick={handleSave}
          color="primary"
          variant="contained"
          disabled={!canSave}
          startIcon={saving ? <CircularProgress size={16} /> : <CheckCircleIcon />}
        >
          {saving ? 'Wird gespeichert...' : 'Speichern'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default memo(ConfigurationDialog);