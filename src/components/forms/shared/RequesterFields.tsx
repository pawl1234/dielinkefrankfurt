'use client';

import { UseFormRegister, Controller, Control } from 'react-hook-form';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Box
} from '@mui/material';
import { Grid } from '@mui/material';

interface RequesterFieldsProps {
  register: UseFormRegister<any>;
  errors: Record<string, any>;
  control?: Control<any>;
}

const RequesterFields = ({ register, errors, control }: RequesterFieldsProps) => {
  return (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
          <TextField
            fullWidth
            label="Vorname *"
            placeholder="Vorname"
            {...register('firstName', {
              required: 'Vorname ist erforderlich',
              pattern: {
                value: /^[A-Za-zÀ-ÖØ-öø-ÿ\s-]+$/,
                message: 'Bitte nur Buchstaben eingeben',
              },
            })}
            error={!!errors.firstName}
            helperText={errors.firstName?.message}
            margin="normal"
            size="medium"
            variant="outlined"
          />

          <TextField
            fullWidth
            label="Nachname *"
            placeholder="Nachname"
            {...register('lastName', {
              required: 'Nachname ist erforderlich',
              pattern: {
                value: /^[A-Za-zÀ-ÖØ-öø-ÿ\s-]+$/,
                message: 'Bitte nur Buchstaben eingeben',
              },
            })}
            error={!!errors.lastName}
            helperText={errors.lastName?.message}
            margin="normal"
            size="medium"
            variant="outlined"
          />
        </Box>
  );
};

export default RequesterFields;