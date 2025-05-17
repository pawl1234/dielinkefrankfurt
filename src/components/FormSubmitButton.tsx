import React, { useState, useEffect } from 'react';
import { 
  Button, 
  CircularProgress, 
  Tooltip, 
  Box, 
  Typography,
  Fade
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

interface FormSubmitButtonProps {
  children: React.ReactNode;
  loading?: boolean;
  success?: boolean;
  error?: boolean;
  successMessage?: string;
  errorMessage?: string;
  disabled?: boolean;
  tooltip?: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'text' | 'outlined' | 'contained';
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Enhanced form submit button with loading, success, and error states.
 * Improves user experience during form submission.
 */
const FormSubmitButton: React.FC<FormSubmitButtonProps> = ({
  children,
  loading = false,
  success = false,
  error = false,
  successMessage = 'Successfully submitted!',
  errorMessage = 'Submission failed. Please try again.',
  disabled = false,
  tooltip = '',
  onClick,
  type = 'submit',
  variant = 'contained',
  color = 'primary',
  size = 'medium',
  fullWidth = false,
  className,
  style
}) => {
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  
  // Reset status after some time
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    if (success) {
      setShowSuccess(true);
      setShowError(false);
      timeout = setTimeout(() => setShowSuccess(false), 3000);
    } else if (error) {
      setShowError(true);
      setShowSuccess(false);
      timeout = setTimeout(() => setShowError(false), 3000);
    } else {
      setShowSuccess(false);
      setShowError(false);
    }
    
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [success, error]);
  
  // Determine button state
  const isDisabled = disabled || loading;
  const buttonColor = showError ? 'error' : showSuccess ? 'success' : color;
  const buttonStartIcon = (() => {
    if (loading) {
      return <CircularProgress size={20} color="inherit" />;
    } else if (showSuccess) {
      return <CheckCircleIcon />;
    } else if (showError) {
      return <ErrorIcon />;
    }
    return null;
  })();
  
  // Render button with status message
  const button = (
    <Box sx={{ position: 'relative', display: 'inline-block', width: fullWidth ? '100%' : 'auto' }}>
      <Button
        type={type}
        variant={variant}
        color={buttonColor}
        disabled={isDisabled}
        onClick={onClick}
        startIcon={buttonStartIcon}
        fullWidth={fullWidth}
        className={className}
        style={style}
        size={size}
      >
        {children}
      </Button>
      
      {(showSuccess || showError) && (
        <Fade in={showSuccess || showError}>
          <Typography
            variant="caption"
            color={showSuccess ? 'success.main' : 'error.main'}
            sx={{
              position: 'absolute',
              left: 0,
              top: '100%',
              mt: 0.5,
              width: '100%',
              textAlign: 'center',
            }}
          >
            {showSuccess ? successMessage : errorMessage}
          </Typography>
        </Fade>
      )}
    </Box>
  );
  
  // Add tooltip if provided
  return tooltip ? (
    <Tooltip title={tooltip} arrow>
      {button}
    </Tooltip>
  ) : (
    button
  );
};

export default FormSubmitButton;