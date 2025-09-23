'use client';

import { ReactNode, useEffect } from 'react';
import { Box, Typography, Alert, Button } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

interface FormErrorMessageProps {
  title: string;
  message: string | ReactNode;
  onRetry?: () => void;
  onReset?: () => void;
  retryButtonText?: string;
  resetButtonText?: string;
  showRetryButton?: boolean;
  showResetButton?: boolean;
}

/**
 * Reusable component for form error messages
 * Provides consistent styling and structure for error messages
 * Mirrors FormSuccessMessage design with error styling
 */
export default function FormErrorMessage({
  title,
  message,
  onRetry,
  onReset,
  retryButtonText = 'Erneut versuchen',
  resetButtonText = 'Zurücksetzen',
  showRetryButton = true,
  showResetButton = false
}: FormErrorMessageProps) {

  // Auto-scroll to top when error message appears to ensure visibility
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <Alert
      severity="error"
      sx={{
        mb: 3,
        p: 2,
        borderLeft: 3,
        borderColor: 'error.main',
        '& .MuiAlert-icon': {
          fontSize: '2rem',
        }
      }}
    >
      <Box sx={{ mb: 1 }}>
        <Typography variant="h6" component="div" gutterBottom>
          {title}
        </Typography>
        {typeof message === 'string' ? (
          <Typography variant="body1">{message}</Typography>
        ) : (
          message
        )}

        {/* Action buttons */}
        {(showRetryButton && onRetry) || (showResetButton && onReset) ? (
          <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {showRetryButton && onRetry && (
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<RefreshIcon />}
                onClick={onRetry}
              >
                {retryButtonText}
              </Button>
            )}
            {showResetButton && onReset && (
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<RestartAltIcon />}
                onClick={onReset}
              >
                {resetButtonText}
              </Button>
            )}
          </Box>
        ) : null}
      </Box>
    </Alert>
  );
}