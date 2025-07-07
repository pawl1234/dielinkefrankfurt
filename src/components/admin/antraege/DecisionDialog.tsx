import React, { useState } from 'react';
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
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

interface DecisionDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (comment?: string) => Promise<void>;
  antragTitle?: string;
  mode: 'accept' | 'reject';
  isLoading?: boolean;
  error?: string | null;
}

const DecisionDialog: React.FC<DecisionDialogProps> = ({
  open,
  onClose,
  onConfirm,
  antragTitle,
  mode,
  isLoading = false,
  error
}) => {
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAccept = mode === 'accept';
  const title = isAccept ? 'Antrag annehmen' : 'Antrag ablehnen';
  const actionText = isAccept ? 'annehmen' : 'ablehnen';
  const buttonText = isAccept ? 'Annehmen' : 'Ablehnen';
  const loadingText = isAccept ? 'Wird angenommen...' : 'Wird abgelehnt...';
  const Icon = isAccept ? CheckCircleIcon : CancelIcon;
  const iconColor = isAccept ? 'success' : 'error';
  const buttonColor = isAccept ? 'success' : 'error';

  const handleConfirm = async () => {
    if (isSubmitting || isLoading) return;
    
    setIsSubmitting(true);
    try {
      await onConfirm(comment.trim() || undefined);
      // Only close and reset if successful (no error thrown)
      setComment('');
    } catch {
      // Error is handled by parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting || isLoading) return;
    setComment('');
    onClose();
  };

  const isProcessing = isSubmitting || isLoading;

  return (
    <Dialog
      open={open}
      onClose={isProcessing ? undefined : handleClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={isProcessing}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <Icon color={iconColor} />
        <Typography variant="h6" component="span">
          {title}
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body1" gutterBottom>
            Sind Sie sicher, dass Sie folgenden Antrag {actionText} möchten?
          </Typography>
          
          {antragTitle && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Antrag:
              </Typography>
              <Typography variant="body2" fontWeight="medium">
                {antragTitle}
              </Typography>
            </Box>
          )}
        </Box>

        <TextField
          label={isAccept ? "Kommentar (optional)" : "Begründung (optional)"}
          placeholder={
            isAccept 
              ? "z.B. Vielversprechender Antrag, gerne unterstützen wir dieses Vorhaben..."
              : "z.B. Leider können wir aufgrund begrenzter Mittel nicht..."
          }
          multiline
          rows={4}
          fullWidth
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          disabled={isProcessing}
          sx={{ mb: 2 }}
        />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {isProcessing && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="text.secondary">
              {loadingText}
            </Typography>
          </Box>
        )}

        <Alert 
          severity={isAccept ? "info" : "warning"} 
          sx={{ mt: 2 }}
        >
          <Typography variant="body2">
            {isAccept ? (
              <>
                <strong>Hinweis:</strong> Der Antragsteller wird per E-Mail über die Annahme informiert.
                {comment.trim() && " Ihr Kommentar wird in der E-Mail enthalten sein."}
              </>
            ) : (
              <>
                <strong>Achtung:</strong> Der Antragsteller wird per E-Mail über die Ablehnung informiert.
                {comment.trim() && " Ihre Begründung wird in der E-Mail enthalten sein."}
              </>
            )}
          </Typography>
        </Alert>
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
          onClick={handleConfirm}
          color={buttonColor}
          variant="contained"
          disabled={isProcessing}
          startIcon={isProcessing ? <CircularProgress size={16} /> : <Icon />}
        >
          {isProcessing ? loadingText : buttonText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DecisionDialog;