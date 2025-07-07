'use client';

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import DeleteIcon from '@mui/icons-material/Delete';

interface DeleteAntragDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  antragTitle?: string;
  isDeleting?: boolean;
  error?: string | null;
}

export default function DeleteAntragDialog({
  open,
  onClose,
  onConfirm,
  antragTitle,
  isDeleting = false,
  error = null,
}: DeleteAntragDialogProps) {
  const handleConfirm = () => {
    if (!isDeleting) {
      onConfirm();
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" />
          <Typography variant="h6">
            Antrag löschen
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Typography variant="body1" sx={{ mb: 2 }}>
          Sind Sie sicher, dass Sie diesen Antrag unwiderruflich löschen möchten?
        </Typography>

        {antragTitle && (
          <Box sx={{ 
            p: 2, 
            bgcolor: 'grey.100', 
            borderRadius: 1, 
            mb: 2,
            border: '1px solid',
            borderColor: 'grey.300'
          }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Antrag:
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
              {antragTitle}
            </Typography>
          </Box>
        )}

        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Achtung:</strong> Diese Aktion kann nicht rückgängig gemacht werden. 
            Der Antrag und alle zugehörigen Dateien werden permanent gelöscht.
          </Typography>
        </Alert>

        {isDeleting && (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 2, 
            mt: 2,
            p: 2,
            bgcolor: 'primary.50',
            borderRadius: 1 
          }}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="primary.main">
              Antrag wird gelöscht...
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={handleClose}
          variant="outlined"
          disabled={isDeleting}
          sx={{ minWidth: 100 }}
        >
          Abbrechen
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color="error"
          disabled={isDeleting}
          startIcon={isDeleting ? <CircularProgress size={16} /> : <DeleteIcon />}
          sx={{ minWidth: 120 }}
        >
          {isDeleting ? 'Löschen...' : 'Löschen'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}