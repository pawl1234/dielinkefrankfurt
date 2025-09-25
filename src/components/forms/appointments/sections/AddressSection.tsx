'use client';

import { Control } from 'react-hook-form';
import { Box } from '@mui/material';
import FormSection from '../../shared/FormSection';
import ValidatedTextField from '../../shared/ValidatedTextField';

interface AddressSectionProps {
  control: Control<any>;
  addressRef: React.RefObject<HTMLDivElement>;
  helpText: React.ReactNode;
}

export default function AddressSection({
  control,
  addressRef,
  helpText
}: AddressSectionProps) {
  return (
    <FormSection title="Veranstaltungsort (optional)" helpTitle="Adressinformationen" helpText={helpText}>
      <Box ref={addressRef} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        <ValidatedTextField
          name="street"
          label="Straße und Hausnummer"
          fullWidth
          margin="normal"
        />
        <ValidatedTextField
          name="city"
          label="Stadt"
          fullWidth
          margin="normal"
        />
        <ValidatedTextField
          name="postalCode"
          label="Postleitzahl"
          fullWidth
          margin="normal"
        />
        <ValidatedTextField
          name="state"
          label="Bundesland"
          fullWidth
          margin="normal"
        />
      </Box>
    </FormSection>
  );
}