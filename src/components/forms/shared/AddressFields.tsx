'use client';

import { UseFormRegister, FieldErrors, Control, FieldPath } from 'react-hook-form';
import {
  TextField,
  Box
} from '@mui/material';

// Define a base interface for address fields
interface AddressFieldsData {
  street?: string;
  city?: string;
  postalCode?: string;
  state?: string;
}

// Make the component generic to work with any form that has address fields
interface AddressFieldsProps<TFormData extends AddressFieldsData> {
  register: UseFormRegister<TFormData>;
  errors: FieldErrors<TFormData>;
  control?: Control<TFormData>; // Added for consistency
}

const AddressFields = <TFormData extends AddressFieldsData>({ 
  register, 
  errors 
}: AddressFieldsProps<TFormData>) => {
  // Helper to safely get error messages
  const getErrorMessage = (fieldName: keyof AddressFieldsData): string | undefined => {
    const error = errors[fieldName as FieldPath<TFormData>];
    if (!error) return undefined;
    if (typeof error.message === 'string') return error.message;
    return undefined;
  };
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
      <TextField
        fullWidth
        label="Straße und Hausnummer"
        placeholder="Straße und Hausnummer"
        {...register('street' as FieldPath<TFormData>)}
        error={!!errors.street}
        helperText={getErrorMessage('street')}
        margin="normal"
        variant="outlined"
      />

      <TextField
        fullWidth
        label="Stadt"
        placeholder="Stadt"
        {...register('city' as FieldPath<TFormData>)}
        error={!!errors.city}
        helperText={getErrorMessage('city')}
        margin="normal"
        variant="outlined"
      />

      <TextField
        fullWidth
        label="Postleitzahl"
        placeholder="Postleitzahl"
        {...register('postalCode' as FieldPath<TFormData>)}
        error={!!errors.postalCode}
        helperText={getErrorMessage('postalCode')}
        margin="normal"
        variant="outlined"
      />

      <TextField
        fullWidth
        label="Bundesland"
        placeholder="Bundesland"
        {...register('state' as FieldPath<TFormData>)}
        error={!!errors.state}
        helperText={getErrorMessage('state')}
        margin="normal"
        variant="outlined"
      />
    </Box>
  );
};

export default AddressFields;