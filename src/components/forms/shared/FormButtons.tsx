'use client';

import { Button, Box, CircularProgress } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

interface FormButtonsProps {
  isSubmitting: boolean;
  submitButtonText: string;
  mode: 'create' | 'edit';
  onCancel?: () => void;
  onReset?: () => void;
  resetButtonText?: string;
}

export default function FormButtons({
  isSubmitting,
  submitButtonText,
  mode,
  onCancel,
  onReset,
  resetButtonText = 'Zurücksetzen'
}: FormButtonsProps) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
      {mode === 'create' && onReset && (
        <Button
          type="button"
          variant="outlined"
          color="inherit"
          onClick={onReset}
          disabled={isSubmitting}
        >
          {resetButtonText}
        </Button>
      )}

      {mode === 'edit' && onCancel && (
        <Button
          type="button"
          variant="outlined"
          color="inherit"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Abbrechen
        </Button>
      )}

      <Button
        type="submit"
        variant="contained"
        color="primary"
        disabled={isSubmitting}
        data-testid="submit-button"
        endIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
      >
        {isSubmitting ? 'Wird gesendet...' : submitButtonText}
      </Button>
    </Box>
  );
}