import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  Divider,
  Alert,
  Stack,
  Chip
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import SendIcon from '@mui/icons-material/Send';
import CancelIcon from '@mui/icons-material/Cancel';

/**
 * Props for the SendConfirmationModal component
 */
interface SendConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  recipientCount: number;
  isSubmitting: boolean;
  subject?: string;
  settings?: {
    fromName?: string;
    fromEmail?: string;
    replyToEmail?: string;
  };
}

/**
 * Confirmation modal for sending newsletters
 */
const SendConfirmationModal: React.FC<SendConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  recipientCount,
  isSubmitting,
  subject,
  settings
}) => {
  return (
    <Dialog
      open={isOpen}
      onClose={isSubmitting ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 0, // Square corners to match design system
          p: 1
        }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h5" component="div" fontWeight="bold">
          Newsletter versenden
        </Typography>
      </DialogTitle>
      
      <Divider />
      
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight="medium">
            Sind Sie sich sicher, dass der Newsletter so verschickt werden soll?
          </Typography>
        </Alert>
        
        <Box sx={{ my: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Stack direction="column" spacing={1} alignItems="center">
            <EmailIcon color="primary" sx={{ fontSize: 40 }} />
            <Typography variant="h4" color="primary.main" fontWeight="bold">
              {recipientCount}
            </Typography>
            <Chip 
              label={`${recipientCount} ${recipientCount === 1 ? 'Empfänger' : 'Empfänger'}`} 
              color="primary" 
              variant="outlined"
            />
          </Stack>
        </Box>
        
        <Box sx={{ mb: 2 }}>
          {subject && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Betreff
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {subject}
              </Typography>
            </Box>
          )}
          
          {settings && (settings.fromName || settings.fromEmail) && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Absender
              </Typography>
              <Typography variant="body1">
                {settings.fromName || 'Die Linke Frankfurt'} &lt;{settings.fromEmail || 'newsletter@die-linke-frankfurt.de'}&gt;
              </Typography>
            </Box>
          )}
          
          {settings && settings.replyToEmail && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Antwort an
              </Typography>
              <Typography variant="body1">
                {settings.replyToEmail}
              </Typography>
            </Box>
          )}
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="body1">
            Bitte beachten Sie:
          </Typography>
          <ul>
            <li>
              <Typography variant="body2">
                Der Newsletter wird an {recipientCount} Empfänger verschickt.
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                Der Versand erfolgt in Batches und kann einige Minuten dauern.
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                Sie erhalten eine Benachrichtigung, sobald der Versand abgeschlossen ist.
              </Typography>
            </li>
          </ul>
        </Box>
        
        {isSubmitting && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
            <CircularProgress size={40} color="primary" />
            <Typography variant="body1" sx={{ ml: 2 }}>
              Newsletter wird versendet...
            </Typography>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          variant="outlined"
          color="inherit"
          onClick={onClose}
          disabled={isSubmitting}
          startIcon={<CancelIcon />}
        >
          Abbrechen
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={onConfirm}
          disabled={isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
        >
          {isSubmitting ? 'Wird gesendet...' : 'Senden'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SendConfirmationModal;