'use client';

import { Box, Typography, CircularProgress } from '@mui/material';

interface FormLoadingStateProps {
  message?: string;
}

export default function FormLoadingState({
  message = 'Lade Formular...'
}: FormLoadingStateProps) {
  return (
    <Box sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '200px'
    }}>
      <CircularProgress />
      <Typography sx={{ ml: 2 }}>{message}</Typography>
    </Box>
  );
}