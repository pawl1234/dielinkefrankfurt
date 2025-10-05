'use client';

import { Controller, Control, FormState, FieldValues, Path } from 'react-hook-form';
import { Box, TextField } from '@mui/material';
import FormSection from '../../shared/FormSection';

interface RequesterSectionProps<TFormValues extends FieldValues> {
  control: Control<TFormValues>;
  formState: FormState<TFormValues>;
}

export function RequesterSection<TFormValues extends FieldValues>({
  control,
  formState
}: RequesterSectionProps<TFormValues>) {
  const helpText = "Bitte geben Sie Ihren Namen an. Diese Informationen sind erforderlich, damit wir Ihre Anfrage bearbeiten und zuordnen können. Die Daten werden nur für die interne Freigabe verwendet und nicht nach außen gegeben.";

  return (
    <FormSection title="Antragsteller" helpTitle="Ihre Kontaktdaten" helpText={helpText}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        <Controller
          control={control}
          name={"firstName" as Path<TFormValues>}
          render={({ field: { onChange, onBlur, value, name: fieldName }, fieldState: { error } }) => (
            <TextField
              onChange={onChange}
              onBlur={onBlur}
              value={value || ''}
              name={fieldName}
              label="Vorname"
              fullWidth
              error={!!error && formState.isSubmitted}
              helperText={formState.isSubmitted && error ? error.message : undefined}
            />
          )}
        />
        <Controller
          control={control}
          name={"lastName" as Path<TFormValues>}
          render={({ field: { onChange, onBlur, value, name: fieldName }, fieldState: { error } }) => (
            <TextField
              onChange={onChange}
              onBlur={onBlur}
              value={value || ''}
              name={fieldName}
              label="Nachname"
              fullWidth
              error={!!error && formState.isSubmitted}
              helperText={formState.isSubmitted && error ? error.message : undefined}
            />
          )}
        />
      </Box>
    </FormSection>
  );
}