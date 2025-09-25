'use client';

import { Control } from 'react-hook-form';
import { Box } from '@mui/material';
import FormSection from '../../shared/FormSection';
import ValidatedTextField from '../../shared/ValidatedTextField';

interface RequesterSectionProps {
  control: Control<any>;
  requesterRef: React.RefObject<HTMLDivElement>;
  helpText: React.ReactNode;
}

export default function RequesterSection({
  control,
  requesterRef,
  helpText
}: RequesterSectionProps) {
  return (
    <FormSection title="Antragsteller" helpTitle="Ihre Kontaktdaten" helpText={helpText}>
      <Box ref={requesterRef} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        <ValidatedTextField
          name="firstName"
          label="Vorname"
          fullWidth
          margin="normal"
        />
        <ValidatedTextField
          name="lastName"
          label="Nachname"
          fullWidth
          margin="normal"
        />
      </Box>
    </FormSection>
  );
}