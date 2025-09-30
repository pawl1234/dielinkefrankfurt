'use client';

import { Controller, Control, FormState, FieldValues, Path } from 'react-hook-form';
import { Box, TextField } from '@mui/material';
import FormSection from '../../shared/FormSection';

interface ReporterSectionProps<TFormValues extends FieldValues> {
  control: Control<TFormValues>;
  formState: FormState<TFormValues>;
  firstNameFieldName?: Path<TFormValues>;
  lastNameFieldName?: Path<TFormValues>;
}

export function ReporterSection<TFormValues extends FieldValues>({
  control,
  formState,
  firstNameFieldName = "reporterFirstName" as Path<TFormValues>,
  lastNameFieldName = "reporterLastName" as Path<TFormValues>
}: ReporterSectionProps<TFormValues>) {
  const helpText = `Bitte geben Sie Ihre Kontaktdaten an. Diese Informationen werden nur intern verwendet und nicht veröffentlicht.`;

  return (
    <FormSection title="Ansprechpartner" helpTitle="Kontaktdaten des Erstellers" helpText={helpText}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
        <Controller
          control={control}
          name={firstNameFieldName}
          render={({ field: { onChange, onBlur, value, name: fieldName }, fieldState: { error } }) => (
            <TextField
              onChange={onChange}
              onBlur={onBlur}
              value={value}
              name={fieldName}
              label="Vorname"
              fullWidth
              error={!!error && formState.isSubmitted}
            />
          )}
        />
        <Controller
          control={control}
          name={lastNameFieldName}
          render={({ field: { onChange, onBlur, value, name: fieldName }, fieldState: { error } }) => (
            <TextField
              onChange={onChange}
              onBlur={onBlur}
              value={value}
              name={fieldName}
              label="Nachname"
              fullWidth
              error={!!error && formState.isSubmitted}
            />
          )}
        />
      </Box>
    </FormSection>
  );
}