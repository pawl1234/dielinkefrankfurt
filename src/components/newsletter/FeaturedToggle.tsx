import React, { useState } from 'react';
import { FormControlLabel, Switch, Box, CircularProgress, Snackbar, Alert } from '@mui/material';

interface FeaturedToggleProps {
  appointmentId: number;
  initialFeatured: boolean;
  onToggle?: (featured: boolean) => void;
}

const FeaturedToggle: React.FC<FeaturedToggleProps> = ({ appointmentId, initialFeatured, onToggle }) => {
  const [featured, setFeatured] = useState<boolean>(initialFeatured);
  const [loading, setLoading] = useState<boolean>(false);
  const [alert, setAlert] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const handleToggle = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const newValue = event.target.checked;
      setLoading(true);
      
      const response = await fetch('/api/admin/newsletter/appointments', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: appointmentId, featured: newValue }),
      });

      if (response.ok) {
        setFeatured(newValue);
        setAlert({
          open: true,
          message: newValue 
            ? 'Termin als Featured markiert' 
            : 'Termin nicht mehr als Featured markiert',
          severity: 'success',
        });
        
        if (onToggle) {
          onToggle(newValue);
        }
      } else {
        setAlert({
          open: true,
          message: 'Fehler beim Aktualisieren des Featured-Status',
          severity: 'error',
        });
      }
    } catch (error) {
      console.error('Error updating featured status:', error);
      setAlert({
        open: true,
        message: 'Fehler beim Aktualisieren des Featured-Status',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
      <FormControlLabel
        control={
          <Switch
            checked={featured}
            onChange={handleToggle}
            color="secondary"
            disabled={loading}
          />
        }
        label={loading ? <CircularProgress size={16} sx={{ ml: 1 }} /> : 'Featured'}
      />
      
      <Snackbar
        open={alert.open}
        autoHideDuration={3000}
        onClose={() => setAlert({ ...alert, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setAlert({ ...alert, open: false })}
          severity={alert.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default FeaturedToggle;