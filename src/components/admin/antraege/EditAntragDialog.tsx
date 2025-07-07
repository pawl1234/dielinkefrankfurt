'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AntragForm from '@/components/forms/antraege/AntragForm';
import type { AntragPurposes } from '@/types/api-types';

// Match the FormInput interface from AntragForm
interface FormInput {
  firstName: string;
  lastName: string;
  email: string;
  title: string;
  summary: string;
  zuschussEnabled: boolean;
  zuschussAmount: number;
  personelleEnabled: boolean;
  personelleDetails: string;
  raumbuchungEnabled: boolean;
  raumbuchungLocation: string;
  raumbuchungNumberOfPeople: number;
  raumbuchungDetails: string;
  weiteresEnabled: boolean;
  weiteresDetails: string;
}

interface EditAntragDialogProps {
  open: boolean;
  onClose: () => void;
  antragId: string | null;
  onSuccess?: () => void;
}

interface AntragDetails {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  title: string;
  summary: string;
  purposes: string; // JSON string
  fileUrls: string | null; // JSON string
  status: 'NEU' | 'AKZEPTIERT' | 'ABGELEHNT';
  createdAt: string;
  updatedAt: string;
}

export default function EditAntragDialog({ 
  open, 
  onClose, 
  antragId, 
  onSuccess 
}: EditAntragDialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [antrag, setAntrag] = useState<AntragDetails | null>(null);

  const fetchAntragDetails = useCallback(async () => {
    if (!antragId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/antraege/${antragId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Antrag nicht gefunden');
        }
        throw new Error('Fehler beim Laden der Antragsdaten');
      }

      const data = await response.json();
      
      // Check if the antrag can be edited
      if (data.status !== 'NEU') {
        throw new Error('Nur Anträge mit Status "NEU" können bearbeitet werden');
      }

      setAntrag(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein unerwarteter Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  }, [antragId]);

  useEffect(() => {
    if (open && antragId) {
      fetchAntragDetails();
    }
  }, [open, antragId, fetchAntragDetails]);

  const handleSubmit = async (formData: FormInput, files: (File | Blob)[]) => {
    if (!antragId) return;

    setSaving(true);
    setError(null);

    try {
      const submitData = new FormData();

      // Add form fields
      submitData.append('firstName', String(formData.firstName));
      submitData.append('lastName', String(formData.lastName));
      submitData.append('email', String(formData.email));
      submitData.append('title', String(formData.title));
      submitData.append('summary', String(formData.summary));
      
      // Convert flattened form data back to purposes object
      const purposes: AntragPurposes = {
        zuschuss: formData.zuschussEnabled ? {
          enabled: true,
          amount: formData.zuschussAmount
        } : undefined,
        personelleUnterstuetzung: formData.personelleEnabled ? {
          enabled: true,
          details: formData.personelleDetails
        } : undefined,
        raumbuchung: formData.raumbuchungEnabled ? {
          enabled: true,
          location: formData.raumbuchungLocation,
          numberOfPeople: formData.raumbuchungNumberOfPeople,
          details: formData.raumbuchungDetails
        } : undefined,
        weiteres: formData.weiteresEnabled ? {
          enabled: true,
          details: formData.weiteresDetails
        } : undefined
      };
      
      submitData.append('purposes', JSON.stringify(purposes));

      // Add new files
      if (files.length > 0) {
        files.forEach((file, index) => {
          submitData.append(`file-${index}`, file);
        });
      }

      // Add existing file URLs to preserve them
      if (antrag?.fileUrls) {
        const existingFiles = JSON.parse(antrag.fileUrls);
        submitData.append('existingFileUrls', JSON.stringify(existingFiles));
      }

      const response = await fetch(`/api/admin/antraege/${antragId}`, {
        method: 'PUT',
        body: submitData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Aktualisieren des Antrags');
      }

      // Success
      if (onSuccess) {
        onSuccess();
      }
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein unerwarteter Fehler ist aufgetreten');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setAntrag(null);
    setError(null);
    setSaving(false);
    onClose();
  };

  const canEdit = antrag && antrag.status === 'NEU';

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '70vh' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Antrag bearbeiten</Typography>
          <IconButton
            aria-label="close"
            onClick={handleClose}
            sx={{ color: (theme) => theme.palette.grey[500] }}
            disabled={saving}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!canEdit && antrag && !loading && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Dieser Antrag kann nicht bearbeitet werden. Nur Anträge mit Status &quot;NEU&quot; können bearbeitet werden.
          </Alert>
        )}

        {canEdit && !loading && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Bearbeiten Sie die Angaben des Antrags. Alle Felder können geändert werden.
            </Typography>
            
            <AntragForm
              mode="edit"
              initialValues={{
                id: antrag.id,
                firstName: antrag.firstName,
                lastName: antrag.lastName,
                email: antrag.email,
                title: antrag.title,
                summary: antrag.summary,
                purposes: antrag.purposes,
                fileUrls: antrag.fileUrls,
              }}
              submitButtonText={saving ? 'Speichern...' : 'Änderungen speichern'}
              onSubmit={handleSubmit}
              onCancel={handleClose}
            />
          </Box>
        )}
      </DialogContent>

      {/* Only show action buttons for non-editable anträge or when there's an error */}
      {(!canEdit || error) && !loading && (
        <DialogActions>
          <Button onClick={handleClose} disabled={saving}>
            Schließen
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}