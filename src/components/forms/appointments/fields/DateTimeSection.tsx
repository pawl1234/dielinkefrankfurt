'use client';

import { useState } from 'react';
import { Controller, Control, FormState, FieldValues, Path, useWatch } from 'react-hook-form';
import { Box, Typography, Checkbox, FormControlLabel, TextField } from '@mui/material';
import FormSection from '../../shared/FormSection';
import DateTimePicker from '../../../ui/DateTimePicker';

interface DateTimeSectionProps<TFormValues extends FieldValues> {
  control: Control<TFormValues>;
  formState: FormState<TFormValues>;
  initialRecurringText?: string | null;
}

export function DateTimeSection<TFormValues extends FieldValues>({
  control,
  formState,
  initialRecurringText
}: DateTimeSectionProps<TFormValues>) {
  const [isRecurring, setIsRecurring] = useState(!!initialRecurringText);
  const watchedStartDateTime = useWatch({ control, name: "startDateTime" as Path<TFormValues> });

  const helpText = `Bitte geben Sie an, wann Ihre Veranstaltung stattfinden soll:
  • Das Startdatum und die Startzeit sind erforderlich.
  • Das Enddatum und die Endzeit sind optional, helfen aber bei der Planung.
  • Für wiederkehrende Termine aktivieren Sie bitte die entsprechende Option und beschreiben Sie die Wiederholung.`;

  return (
    <FormSection title="Datum und Uhrzeit" helpTitle="Zeitliche Planung" helpText={helpText}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        <DateTimePicker
          label="Startdatum und -uhrzeit"
          name="startDateTime"
          control={control as unknown as Control<FieldValues>}
          required={true}
        />
        <DateTimePicker
          label="Enddatum und -uhrzeit (optional)"
          name="endDateTime"
          control={control as unknown as Control<FieldValues>}
          minDate={watchedStartDateTime ? new Date(watchedStartDateTime as string) : undefined}
        />
      </Box>

      <Box sx={{ mt: 2 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              color="primary"
            />
          }
          label="Handelt es sich um einen wiederkehrenden Termin?"
        />
      </Box>

      {isRecurring && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" component="label" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
            Beschreibung der Wiederholung <Box component="span" sx={{ color: "primary.main" }}>*</Box>
          </Typography>
          <Typography variant="body2" display="block" sx={{ mb: 1 }}>
            Beschreiben Sie den wiederkehrenden Termin in eigenen Worten, z. B. &apos;Jeden zweiten Mittwoch im Monat um 19 Uhr&apos;.
          </Typography>
          <Controller
            control={control}
            name={"recurringText" as Path<TFormValues>}
            render={({ field: { onChange, onBlur, value, name: fieldName }, fieldState: { error } }) => (
              <TextField
                onChange={onChange}
                onBlur={onBlur}
                value={value || ''}
                name={fieldName}
                fullWidth
                multiline
                rows={3}
                placeholder="z.B. Jeden Montag um 18:00 Uhr"
                error={!!error && formState.isSubmitted}
                helperText={formState.isSubmitted && error ? error.message : undefined}
              />
            )}
          />
        </Box>
      )}
    </FormSection>
  );
}