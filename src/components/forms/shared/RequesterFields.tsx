'use client';

import { UseFormRegister, FieldErrors, Control, Path } from 'react-hook-form';
import {
  TextField,
  Box
} from '@mui/material';

// Make the component generic to work with any form that has firstName and lastName fields
interface RequesterFieldsProps<TFormData extends { firstName: string; lastName: string }> {
  register: UseFormRegister<TFormData>;
  errors: FieldErrors<TFormData>;
  control?: Control<TFormData>; // Added for potential future use
}

const RequesterFields = <TFormData extends { firstName: string; lastName: string }>({ 
  register, 
  errors 
}: RequesterFieldsProps<TFormData>) => {
  // Helper function to safely extract error messages as strings
  const getErrorMessage = (fieldName: 'firstName' | 'lastName'): string | undefined => {
    const error = errors[fieldName];
    return error?.message as string | undefined;
  };

  return (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
          <TextField
            fullWidth
            label="Vorname *"
            placeholder="Vorname"
            {...register('firstName' as Path<TFormData>, {
              required: 'Vorname ist erforderlich',
              pattern: {
                value: /^[A-Za-zÀ-ÖØ-öø-ÿ\s-]+$/,
                message: 'Bitte nur Buchstaben eingeben',
              },
            })}
            error={!!errors.firstName}
            helperText={getErrorMessage('firstName')}
            margin="normal"
            size="medium"
            variant="outlined"
          />

          <TextField
            fullWidth
            label="Nachname *"
            placeholder="Nachname"
            {...register('lastName' as Path<TFormData>, {
              required: 'Nachname ist erforderlich',
              pattern: {
                value: /^[A-Za-zÀ-ÖØ-öø-ÿ\s-]+$/,
                message: 'Bitte nur Buchstaben eingeben',
              },
            })}
            error={!!errors.lastName}
            helperText={getErrorMessage('lastName')}
            margin="normal"
            size="medium"
            variant="outlined"
          />
        </Box>
  );
};

export default RequesterFields;