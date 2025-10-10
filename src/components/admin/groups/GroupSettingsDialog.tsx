'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Box
} from '@mui/material';

/**
 * Validation schema for group settings
 */
const groupSettingsSchema = z.object({
  officeContactEmail: z
    .string()
    .email('Bitte geben Sie eine gültige E-Mail-Adresse ein')
    .max(200, 'E-Mail-Adresse darf maximal 200 Zeichen lang sein')
    .optional()
    .or(z.literal(''))
});

type GroupSettingsFormData = z.infer<typeof groupSettingsSchema>;

interface GroupSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
}

/**
 * Dialog component for managing group settings.
 * Allows admins to configure the office contact email for group contact requests.
 */
export default function GroupSettingsDialog({
  open,
  onClose,
  onSave
}: GroupSettingsDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<GroupSettingsFormData>({
    resolver: zodResolver(groupSettingsSchema),
    defaultValues: {
      officeContactEmail: ''
    }
  });

  /**
   * Load current settings from API
   */
  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/group-settings');
      const data = await response.json();

      if (data.success) {
        reset({
          officeContactEmail: data.settings.officeContactEmail || ''
        });
      } else {
        setError(data.error || 'Fehler beim Laden der Einstellungen');
      }
    } catch (_err) {
      setError('Fehler beim Laden der Einstellungen');
    } finally {
      setIsLoading(false);
    }
  }, [reset]);

  /**
   * Load settings when dialog opens
   */
  useEffect(() => {
    if (open) {
      loadSettings();
    }
  }, [open, loadSettings]);

  /**
   * Handle form submission
   */
  const onSubmit = async (data: GroupSettingsFormData) => {
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/admin/group-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(true);
        onSave();

        // Auto-close after 1 second
        setTimeout(() => {
          onClose();
          setSuccess(false);
        }, 1000);
      } else {
        setError(result.error || 'Fehler beim Speichern der Einstellungen');
      }
    } catch (_err) {
      setError('Fehler beim Speichern der Einstellungen');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handle dialog close
   */
  const handleClose = () => {
    if (!isSaving) {
      setError(null);
      setSuccess(false);
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Gruppeneinstellungen</DialogTitle>

      <DialogContent>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box component="form" sx={{ mt: 2 }}>
            {success && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Einstellungen erfolgreich gespeichert
              </Alert>
            )}

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Controller
              name="officeContactEmail"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Office-E-Mail (CC für Gruppenanfragen)"
                  type="email"
                  fullWidth
                  error={!!errors.officeContactEmail}
                  helperText={
                    errors.officeContactEmail?.message ||
                    'Diese E-Mail wird bei allen Gruppenanfragen in CC gesetzt (optional)'
                  }
                  disabled={isSaving || success}
                />
              )}
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button
          onClick={handleClose}
          disabled={isSaving || isLoading}
        >
          Abbrechen
        </Button>
        <Button
          onClick={handleSubmit(onSubmit)}
          variant="contained"
          disabled={isSaving || success || isLoading}
          startIcon={isSaving ? <CircularProgress size={20} /> : null}
        >
          {isSaving ? 'Wird gespeichert...' : 'Speichern'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
