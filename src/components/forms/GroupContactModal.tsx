'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { groupContactSchema, GroupContactFormData } from '@/lib/validation/group-contact-schema';

interface GroupContactModalProps {
  open: boolean;
  onClose: () => void;
  groupSlug: string;
  groupName: string;
}

/**
 * Modal component for contacting a group.
 * Uses React Hook Form with Zod validation.
 */
export default function GroupContactModal({
  open,
  onClose,
  groupSlug,
  groupName
}: GroupContactModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<GroupContactFormData>({
    resolver: zodResolver(groupContactSchema),
    defaultValues: {
      requesterName: '',
      requesterEmail: '',
      message: ''
    }
  });

  /**
   * Handle form submission
   */
  const onSubmit = async (data: GroupContactFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      const response = await fetch(`/api/groups/${groupSlug}/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (result.success) {
        setSubmitSuccess(true);
        reset();

        // Auto-close after 2 seconds
        setTimeout(() => {
          onClose();
          setSubmitSuccess(false);
        }, 2000);
      } else {
        setSubmitError(result.error || 'Fehler beim Senden der Nachricht');
      }
    } catch (_error) {
      setSubmitError('Fehler beim Senden der Nachricht. Bitte versuchen Sie es erneut.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle modal close
   */
  const handleClose = () => {
    if (!isSubmitting) {
      reset();
      setSubmitError(null);
      setSubmitSuccess(false);
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
      <DialogTitle>Kontakt: {groupName}</DialogTitle>

      <DialogContent>
        <Box component="form" sx={{ mt: 2 }}>
          {submitSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Nachricht erfolgreich gesendet
            </Alert>
          )}

          {submitError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {submitError}
            </Alert>
          )}

          <Controller
            name="requesterName"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Name"
                fullWidth
                required
                error={!!errors.requesterName}
                helperText={errors.requesterName?.message}
                disabled={isSubmitting || submitSuccess}
                sx={{ mb: 2 }}
              />
            )}
          />

          <Controller
            name="requesterEmail"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="E-Mail-Adresse"
                type="email"
                fullWidth
                required
                error={!!errors.requesterEmail}
                helperText={errors.requesterEmail?.message}
                disabled={isSubmitting || submitSuccess}
                sx={{ mb: 2 }}
              />
            )}
          />

          <Controller
            name="message"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Nachricht"
                multiline
                rows={6}
                fullWidth
                required
                error={!!errors.message}
                helperText={errors.message?.message}
                disabled={isSubmitting || submitSuccess}
              />
            )}
          />
        </Box>
      </DialogContent>

      <DialogActions>
        <Button
          onClick={handleClose}
          disabled={isSubmitting}
        >
          Abbrechen
        </Button>
        <Button
          onClick={handleSubmit(onSubmit)}
          variant="contained"
          disabled={isSubmitting || submitSuccess}
          startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
        >
          {isSubmitting ? 'Wird gesendet...' : 'Senden'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
