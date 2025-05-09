'use client';

import { UseFormRegister, Control } from 'react-hook-form';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Box
} from '@mui/material';
import { Grid } from '@mui/material';

interface AddressFieldsProps {
  register: UseFormRegister<any>;
  errors: Record<string, any>;
  control?: Control<any>;
}

const AddressFields = ({ register, errors, control }: AddressFieldsProps) => {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
      <TextField
        fullWidth
        label="Straße und Hausnummer"
        placeholder="Straße und Hausnummer"
        {...register('street')}
        error={!!errors.street}
        helperText={errors.street?.message}
        margin="normal"
        variant="outlined"
      />

      <TextField
        fullWidth
        label="Stadt"
        placeholder="Stadt"
        {...register('city')}
        error={!!errors.city}
        helperText={errors.city?.message}
        margin="normal"
        variant="outlined"
      />

      <TextField
        fullWidth
        label="Bundesland"
        placeholder="Bundesland"
        {...register('state')}
        error={!!errors.state}
        helperText={errors.state?.message}
        margin="normal"
        variant="outlined"
      />

      <TextField
        fullWidth
        label="Postleitzahl"
        placeholder="Postleitzahl"
        {...register('postalCode')}
        error={!!errors.postalCode}
        helperText={errors.postalCode?.message}
        margin="normal"
        variant="outlined"
      />
    </Box>
  );
};

export default AddressFields;