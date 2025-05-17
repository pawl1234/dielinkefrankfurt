'use client';

import React from 'react';
import { Alert, Typography, Button, Box, Collapse, Paper } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ReplayIcon from '@mui/icons-material/Replay';

interface ErrorDetails {
  type?: string;
  fieldErrors?: Record<string, string>;
  context?: Record<string, any>;
}

interface ErrorFeedbackProps {
  error: string | null;
  details?: ErrorDetails;
  variant?: 'standard' | 'compact' | 'full';
  onRetry?: () => void;
  onDismiss?: () => void;
  showDetails?: boolean;
}

/**
 * A reusable component for displaying errors with different levels of detail
 */
const ErrorFeedback: React.FC<ErrorFeedbackProps> = ({
  error,
  details,
  variant = 'standard',
  onRetry,
  onDismiss,
  showDetails = false
}) => {
  const [detailsVisible, setDetailsVisible] = React.useState(showDetails);

  if (!error) return null;

  // Compact variant for inline/field errors
  if (variant === 'compact') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', color: 'error.main', mt: 0.5, mb: 0.5 }}>
        <ErrorOutlineIcon fontSize="small" sx={{ mr: 0.5 }} />
        <Typography variant="caption" color="error">
          {error}
        </Typography>
      </Box>
    );
  }

  // Full variant with details and actions
  if (variant === 'full') {
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
        onClose={onDismiss}
      >
        <Box sx={{ mb: 1 }}>
          <Typography variant="h6" component="div" gutterBottom>
            Fehler:
          </Typography>
          <Typography variant="body1" gutterBottom>
            {error}
          </Typography>
          
          {details && (
            <>
              <Button 
                size="small" 
                color="inherit" 
                onClick={() => setDetailsVisible(!detailsVisible)}
                sx={{ mt: 1, textTransform: 'none' }}
              >
                {detailsVisible ? 'Details ausblenden' : 'Details anzeigen'}
              </Button>
              
              <Collapse in={detailsVisible}>
                <Paper sx={{ mt: 2, p: 2, bgcolor: 'error.light', color: 'error.contrastText' }}>
                  {details.type && (
                    <Typography variant="body2" gutterBottom>
                      <strong>Fehlertyp:</strong> {details.type}
                    </Typography>
                  )}
                  
                  {details.fieldErrors && Object.keys(details.fieldErrors).length > 0 && (
                    <>
                      <Typography variant="body2" gutterBottom>
                        <strong>Validierungsfehler:</strong>
                      </Typography>
                      <ul style={{ marginTop: 4, paddingLeft: 20 }}>
                        {Object.entries(details.fieldErrors).map(([field, message]) => (
                          <li key={field}>
                            <Typography variant="body2">
                              <strong>{field}:</strong> {message}
                            </Typography>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                  
                  {details.context && Object.keys(details.context).length > 0 && (
                    <>
                      <Typography variant="body2" gutterBottom>
                        <strong>Zusätzliche Informationen:</strong>
                      </Typography>
                      <ul style={{ marginTop: 4, paddingLeft: 20 }}>
                        {Object.entries(details.context).map(([key, value]) => (
                          <li key={key}>
                            <Typography variant="body2">
                              <strong>{key}:</strong> {
                                typeof value === 'object' 
                                  ? JSON.stringify(value) 
                                  : String(value)
                              }
                            </Typography>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </Paper>
              </Collapse>
            </>
          )}
        </Box>
        
        {onRetry && (
          <Button
            variant="outlined"
            color="error"
            size="small"
            startIcon={<ReplayIcon />}
            onClick={onRetry}
            sx={{ mt: 1 }}
          >
            Erneut versuchen
          </Button>
        )}
      </Alert>
    );
  }

  // Standard variant (default)
  return (
    <Alert severity="error" sx={{ mb: 3 }} onClose={onDismiss}>
      <Typography variant="body1">
        <strong>Fehler:</strong> {error}
      </Typography>
      {onRetry && (
        <Button
          size="small"
          color="inherit"
          startIcon={<ReplayIcon />}
          onClick={onRetry}
          sx={{ mt: 1 }}
        >
          Erneut versuchen
        </Button>
      )}
    </Alert>
  );
};

export default ErrorFeedback;