'use client';

import React, { Component, ReactNode } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  AlertTitle,
  Collapse,
  IconButton,
} from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showDetails?: boolean;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  showDetails: boolean;
  errorId: string;
}

/**
 * Error Boundary component that catches JavaScript errors anywhere in the child
 * component tree, logs those errors, and displays a fallback UI.
 * 
 * Features:
 * - Graceful error handling with user-friendly messages
 * - Optional error details expansion
 * - Retry functionality
 * - Automatic reset on prop changes
 * - Integration with logging system
 * - Accessibility support
 */
export default class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error
    logger.error(error, {
      module: 'ErrorBoundary',
      context: {
        errorId: this.state.errorId,
        componentStack: errorInfo.componentStack,
        errorBoundary: this.constructor.name,
        props: this.props,
      },
    });

    // Update state with error info
    this.setState({
      errorInfo,
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { resetOnPropsChange, resetKeys } = this.props;
    const { hasError } = this.state;

    // Reset error state if resetKeys have changed
    if (
      hasError &&
      resetOnPropsChange &&
      resetKeys &&
      prevProps.resetKeys &&
      resetKeys.some((key, idx) => key !== prevProps.resetKeys![idx])
    ) {
      this.resetErrorBoundary();
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      errorId: '',
    });
  };

  handleRetry = () => {
    // Small delay to provide visual feedback
    this.resetTimeoutId = setTimeout(() => {
      this.resetErrorBoundary();
    }, 300);
  };

  toggleDetails = () => {
    this.setState(prevState => ({
      showDetails: !prevState.showDetails,
    }));
  };

  render() {
    const { hasError, error, errorInfo, showDetails, errorId } = this.state;
    const { children, fallback, showDetails: showDetailsDefault = false } = this.props;

    if (hasError) {
      // Custom fallback UI
      if (fallback) {
        return fallback;
      }

      // Default error UI
      return (
        <Paper 
          elevation={1} 
          sx={{ 
            p: 3, 
            m: 2, 
            textAlign: 'center',
            borderLeft: 4,
            borderLeftColor: 'error.main',
            background: 'linear-gradient(145deg, #fff 0%, #fafafa 100%)',
          }}
          role="alert"
          aria-live="polite"
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <ErrorOutlineIcon 
              color="error" 
              sx={{ fontSize: 64 }}
              aria-hidden="true"
            />
            
            <Box>
              <Typography 
                variant="h5" 
                component="h2" 
                gutterBottom 
                color="error"
                sx={{ fontWeight: 600 }}
              >
                Entschuldigung, ein Fehler ist aufgetreten
              </Typography>
              
              <Typography 
                variant="body1" 
                color="text.secondary" 
                sx={{ mb: 3, maxWidth: 600 }}
              >
                Die Anwendung ist auf einen unerwarteten Fehler gestoßen. 
                Bitte versuchen Sie es erneut oder wenden Sie sich an den Support, 
                falls das Problem weiterhin besteht.
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Button
                variant="contained"
                color="primary"
                onClick={this.handleRetry}
                startIcon={<RefreshIcon />}
                sx={{ minWidth: 120 }}
              >
                Erneut versuchen
              </Button>

              <Button
                variant="outlined"
                onClick={() => window.location.reload()}
                sx={{ minWidth: 120 }}
              >
                Seite neu laden
              </Button>

              {(showDetailsDefault || process.env.NODE_ENV === 'development') && (
                <IconButton
                  onClick={this.toggleDetails}
                  aria-label={showDetails ? 'Details verbergen' : 'Details anzeigen'}
                  color="primary"
                >
                  {showDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              )}
            </Box>

            {/* Error Details */}
            {(showDetailsDefault || process.env.NODE_ENV === 'development') && (
              <Collapse in={showDetails} sx={{ width: '100%', mt: 2 }}>
                <Alert severity="error" sx={{ textAlign: 'left' }}>
                  <AlertTitle>Technische Details</AlertTitle>
                  
                  <Typography variant="body2" component="div" sx={{ mb: 2 }}>
                    <strong>Fehler-ID:</strong> {errorId}
                  </Typography>

                  {error && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Fehlermeldung:
                      </Typography>
                      <Typography 
                        variant="body2" 
                        component="pre" 
                        sx={{ 
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          fontFamily: 'monospace',
                          fontSize: '0.875rem',
                          backgroundColor: 'rgba(0, 0, 0, 0.04)',
                          p: 1,
                          borderRadius: 1,
                        }}
                      >
                        {error.name}: {error.message}
                      </Typography>
                    </Box>
                  )}

                  {error?.stack && process.env.NODE_ENV === 'development' && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Stack Trace:
                      </Typography>
                      <Typography 
                        variant="body2" 
                        component="pre" 
                        sx={{ 
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          fontFamily: 'monospace',
                          fontSize: '0.75rem',
                          backgroundColor: 'rgba(0, 0, 0, 0.04)',
                          p: 1,
                          borderRadius: 1,
                          maxHeight: 200,
                          overflow: 'auto',
                        }}
                      >
                        {error.stack}
                      </Typography>
                    </Box>
                  )}

                  {errorInfo?.componentStack && process.env.NODE_ENV === 'development' && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Component Stack:
                      </Typography>
                      <Typography 
                        variant="body2" 
                        component="pre" 
                        sx={{ 
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          fontFamily: 'monospace',
                          fontSize: '0.75rem',
                          backgroundColor: 'rgba(0, 0, 0, 0.04)',
                          p: 1,
                          borderRadius: 1,
                          maxHeight: 200,
                          overflow: 'auto',
                        }}
                      >
                        {errorInfo.componentStack}
                      </Typography>
                    </Box>
                  )}
                </Alert>
              </Collapse>
            )}
          </Box>
        </Paper>
      );
    }

    return children;
  }
}

/**
 * Hook for using ErrorBoundary with functional components
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}