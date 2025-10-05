'use client';

import { Controller, Control, FormState, FieldValues, Path } from 'react-hook-form';
import { Box, Typography, TextField } from '@mui/material';
import RichTextEditor from '../../../editor/RichTextEditor';
import FormSection from '../../shared/FormSection';

interface GroupInfoSectionProps<TFormValues extends FieldValues> {
  control: Control<TFormValues>;
  formState: FormState<TFormValues>;
  nameFieldName?: Path<TFormValues>;
  descriptionFieldName?: Path<TFormValues>;
}

export function GroupInfoSection<TFormValues extends FieldValues>({
  control,
  formState,
  nameFieldName = "name" as Path<TFormValues>,
  descriptionFieldName = "description" as Path<TFormValues>
}: GroupInfoSectionProps<TFormValues>) {
  const helpText = `Bitte geben Sie grundlegende Informationen zu Ihrer Arbeitsgruppe an:
        Der Name sollte kurz und prägnant sein (3-100 Zeichen).
        Die Beschreibung sollte die Ziele, Aktivitäten und Schwerpunkte der Gruppe erläutern (mindestens 50 Zeichen).`;

  return (
    <FormSection title="Gruppeninformationen" helpTitle="Allgemeine Informationen" helpText={helpText}>
      <Box sx={{ mb: 3 }}>
        <Controller
          control={control}
          name={nameFieldName}
          render={({ field: { onChange, onBlur, value, name: fieldName }, fieldState: { error } }) => (
            <TextField
              onChange={onChange}
              onBlur={onBlur}
              value={value}
              name={fieldName}
              label="Name der Gruppe"
              fullWidth
              placeholder="z.B. AG Klimagerechtigkeit"
              error={!!error && formState.isSubmitted}
              helperText={formState.isSubmitted && error ? error.message : undefined}
            />
          )}
        />
      </Box>

      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Beschreibung
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Beschreiben Sie die Ziele, Aktivitäten und Schwerpunkte der Arbeitsgruppe.
        </Typography>
        <Controller
          control={control}
          name={descriptionFieldName}
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <>
              <RichTextEditor
                value={value || ''}
                onChange={onChange}
                maxLength={5000}
                placeholder="Beschreibung der Arbeitsgruppe..."
              />
              {formState.isSubmitted && error && (
                <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                  {error.message}
                </Typography>
              )}
            </>
          )}
        />
      </Box>
    </FormSection>
  );
}