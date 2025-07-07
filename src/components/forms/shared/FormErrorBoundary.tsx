'use client';

import React, { ReactNode } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
} from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';
import ErrorBoundary from '@/components/shared/ErrorBoundary';

interface FormErrorBoundaryProps {
  children: ReactNode;
  formName?: string;
  onRetry?: () => void;
  onReset?: () => void;
  showFormData?: boolean;
}

/**
 * Specialized error boundary for form components that provides
 * form-specific error handling and recovery options.
 */
export default function FormErrorBoundary({
  children,
  formName = 'Formular',
  onRetry,
  onReset,
  showFormData = false,
}: FormErrorBoundaryProps) {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Additional form-specific error logging could go here
    console.error(`Form error in ${formName}:`, error, errorInfo);
  };

  const FormErrorFallback = (
    <Paper 
      elevation={1} 
      sx={{ 
        p: 4, 
        m: 2, 
        textAlign: 'center',
        borderLeft: 4,
        borderLeftColor: 'warning.main',
        background: 'linear-gradient(145deg, #fff8e1 0%, #fffde7 100%)',
      }}
      role="alert"
      aria-live="polite"
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
        <ErrorOutlineIcon 
          color="warning" 
          sx={{ fontSize: 56 }}
          aria-hidden="true"
        />
        
        <Box>
          <Typography 
            variant="h6" 
            component="h2" 
            gutterBottom 
            color="warning.dark"
            sx={{ fontWeight: 600 }}
          >
            Problem mit dem {formName}
          </Typography>
          
          <Typography 
            variant="body1" 
            color="text.secondary" 
            sx={{ mb: 3, maxWidth: 500 }}
          >
            Beim Verarbeiten des Formulars ist ein Fehler aufgetreten. 
            Ihre eingegebenen Daten sind möglicherweise noch verfügbar.
          </Typography>
        </Box>

        <Alert severity="info" sx={{ width: '100%', maxWidth: 600, textAlign: 'left' }}>
          <Typography variant="body2">
            <strong>Was Sie tun können:</strong>
          </Typography>
          <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
            <li>Versuchen Sie es erneut mit der Schaltfläche unten</li>
            <li>Setzen Sie das Formular zurück und geben Sie Ihre Daten erneut ein</li>
            <li>Laden Sie die Seite neu, falls das Problem weiterhin besteht</li>
            {showFormData && (
              <li>Kopieren Sie wichtige Eingaben in einen Texteditor als Backup</li>
            )}
          </Box>
        </Alert>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
          {onRetry && (
            <Button
              variant="contained"
              color="primary"
              onClick={onRetry}
              startIcon={<RefreshIcon />}
              sx={{ minWidth: 140 }}
            >
              Erneut versuchen
            </Button>
          )}

          {onReset && (
            <Button
              variant="outlined"
              color="secondary"
              onClick={onReset}
              startIcon={<EditIcon />}
              sx={{ minWidth: 140 }}
            >
              Formular zurücksetzen
            </Button>
          )}

          <Button
            variant="outlined"
            onClick={() => window.location.reload()}
            sx={{ minWidth: 140 }}
          >
            Seite neu laden
          </Button>
        </Box>
      </Box>
    </Paper>
  );

  return (
    <ErrorBoundary
      fallback={FormErrorFallback}
      onError={handleError}
      showDetails={process.env.NODE_ENV === 'development'}
      resetOnPropsChange={true}
      resetKeys={[formName]}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Higher-order component for wrapping forms with error boundary
 */
export function withFormErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    formName?: string;
    showFormData?: boolean;
  }
) {
  const WrappedComponent = (props: P & { 
    onFormRetry?: () => void; 
    onFormReset?: () => void; 
  }) => {
    const { onFormRetry, onFormReset, ...componentProps } = props;
    
    return (
      <FormErrorBoundary
        formName={options?.formName}
        onRetry={onFormRetry}
        onReset={onFormReset}
        showFormData={options?.showFormData}
      >
        <Component {...(componentProps as P)} />
      </FormErrorBoundary>
    );
  };

  WrappedComponent.displayName = `withFormErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}