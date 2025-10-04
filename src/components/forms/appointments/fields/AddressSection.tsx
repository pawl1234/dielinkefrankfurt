'use client';

import { Controller, Control, FormState, FieldValues, Path } from 'react-hook-form';
import { Box, TextField } from '@mui/material';
import FormSection from '../../shared/FormSection';

interface AddressSectionProps<TFormValues extends FieldValues> {
  control: Control<TFormValues>;
  formState: FormState<TFormValues>;
}

export function AddressSection<TFormValues extends FieldValues>({
  control,
  formState
}: AddressSectionProps<TFormValues>) {
  const helpText = `Bitte geben Sie den Ort an, an dem die Veranstaltung stattfinden soll:
        Die Straße und Hausnummer ermöglichen die genaue Lokalisierung.
        Die Stadt ist wichtig für die regionale Einordnung.
        Das Bundesland und die Postleitzahl helfen bei der administrativen Zuordnung.
        Sollten Sie noch keinen genauen Ort haben, können Sie die ungefähre Gegend angeben oder das Feld frei lassen, wenn der Termin online stattfindet.`;

  return (
    <FormSection title="Veranstaltungsort (optional)" helpTitle="Adressinformationen" helpText={helpText}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        <Controller
          control={control}
          name={"street" as Path<TFormValues>}
          render={({ field: { onChange, onBlur, value, name: fieldName }, fieldState: { error } }) => (
            <TextField
              onChange={onChange}
              onBlur={onBlur}
              value={value || ''}
              name={fieldName}
              label="Straße und Hausnummer"
              fullWidth
              error={!!error && formState.isSubmitted}
              helperText={formState.isSubmitted && error ? error.message : undefined}
            />
          )}
        />
        <Controller
          control={control}
          name={"city" as Path<TFormValues>}
          render={({ field: { onChange, onBlur, value, name: fieldName }, fieldState: { error } }) => (
            <TextField
              onChange={onChange}
              onBlur={onBlur}
              value={value || ''}
              name={fieldName}
              label="Stadt"
              fullWidth
              error={!!error && formState.isSubmitted}
              helperText={formState.isSubmitted && error ? error.message : undefined}
            />
          )}
        />
        <Controller
          control={control}
          name={"postalCode" as Path<TFormValues>}
          render={({ field: { onChange, onBlur, value, name: fieldName }, fieldState: { error } }) => (
            <TextField
              onChange={onChange}
              onBlur={onBlur}
              value={value || ''}
              name={fieldName}
              label="Postleitzahl"
              fullWidth
              error={!!error && formState.isSubmitted}
              helperText={formState.isSubmitted && error ? error.message : undefined}
            />
          )}
        />
        <Controller
          control={control}
          name={"state" as Path<TFormValues>}
          render={({ field: { onChange, onBlur, value, name: fieldName }, fieldState: { error } }) => (
            <TextField
              onChange={onChange}
              onBlur={onBlur}
              value={value || ''}
              name={fieldName}
              label="Bundesland"
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