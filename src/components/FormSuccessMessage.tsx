'use client';

import { ReactNode } from 'react';
import { Box, Typography, Alert, Button } from '@mui/material';

interface FormSuccessMessageProps {
  title: string;
  message: string | ReactNode;
  resetForm?: () => void;
  resetButtonText?: string;
  showResetButton?: boolean;
}

/**
 * Reusable component for form success messages
 * Provides consistent styling and structure for success messages
 */
export default function FormSuccessMessage({
  title,
  message,
  resetForm,
  resetButtonText = 'Neuen Eintrag erstellen',
  showResetButton = true
}: FormSuccessMessageProps) {
  // Handle reset button click
  const handleResetClick = () => {
    if (resetForm) {
      // Clear the success state and reset the form
      resetForm();
      
      // Force a reload of the form to create a fresh state
      window.location.reload();
    }
  };
  
  return (
    <Alert
      severity="success"
      sx={{
        mb: 3,
        p: 2,
        borderLeft: 3,
        borderColor: 'success.main',
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
        {showResetButton && resetForm && (
          <Button 
            variant="outlined" 
            color="success" 
            sx={{ mt: 2 }}
            onClick={handleResetClick}
          >
            {resetButtonText}
          </Button>
        )}
      </Box>
    </Alert>
  );
}