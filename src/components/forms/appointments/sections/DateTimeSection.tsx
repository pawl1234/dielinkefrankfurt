'use client';

import { Control, FieldValues, Controller } from 'react-hook-form';
import { Box, Typography, Checkbox, FormControlLabel } from '@mui/material';
import FormSection from '../../shared/FormSection';
import ValidatedTextField from '../../shared/ValidatedTextField';
import FieldError from '../../shared/FieldError';
import DateTimePicker from '../../../ui/DateTimePicker';
import { CustomValidationEntry } from '../../shared/FormBase';

interface DateTimeSectionProps {
  control: Control<any>;
  watchedStartDateTime: string;
  defaultValues: {
    startDateTime: string;
    endDateTime?: string;
  };
  formResetKey: number;
  isRecurring: boolean;
  setIsRecurring: (recurring: boolean) => void;
  dateTimeRef: React.RefObject<HTMLDivElement>;
  helpText: React.ReactNode;
  customValidations: CustomValidationEntry[];
}

export default function DateTimeSection({
  control,
  watchedStartDateTime,
  defaultValues,
  formResetKey,
  isRecurring,
  setIsRecurring,
  dateTimeRef,
  helpText,
  customValidations
}: DateTimeSectionProps) {
  return (
    <FormSection title="Datum und Uhrzeit" helpTitle="Zeitliche Planung" helpText={helpText}>
      <Box ref={dateTimeRef}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
          <DateTimePicker
            key={`start-date-${formResetKey}`}
            label="Startdatum und -uhrzeit"
            name="startDateTime"
            control={control as unknown as Control<FieldValues>}
            rules={{ required: 'Startdatum und -uhrzeit sind erforderlich' }}
            required={true}
            defaultValue={defaultValues.startDateTime ? new Date(defaultValues.startDateTime) : undefined}
          />
          <DateTimePicker
            key={`end-date-${formResetKey}`}
            label="Enddatum und -uhrzeit (optional)"
            name="endDateTime"
            control={control as unknown as Control<FieldValues>}
            rules={{
              validate: value => {
                if (watchedStartDateTime && value) {
                  const startDate = new Date(watchedStartDateTime);
                  if (value < startDate) {
                    return 'Enddatum darf nicht vor dem Startdatum liegen.';
                  }
                }
                return true;
              }
            }}
            minDate={watchedStartDateTime ? new Date(watchedStartDateTime) : undefined}
            defaultValue={defaultValues.endDateTime ? new Date(defaultValues.endDateTime) : undefined}
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
            <Typography variant="subtitle1" component="label" htmlFor="recurring-text-input" sx={{ fontWeight: 600, display:'block', mb:1 }}>
              Beschreibung der Wiederholung <Box component="span" sx={{ color: "primary.main" }}>*</Box>
            </Typography>
            <Typography variant="body2" display="block" sx={{ mb: 1 }}>
              Beschreiben Sie den wiederkehrenden Termin in eigenen Worten, z. B. &apos;Jeden zweiten Mittwoch im Monat um 19 Uhr&apos;.
            </Typography>
            <ValidatedTextField
              name="recurringText"
              fullWidth
              multiline
              rows={3}
              placeholder="z.B. Jeden Montag um 18:00 Uhr"
              margin="normal"
            />
            <FieldError name="recurringText" mode="block" customValidations={customValidations} />
          </Box>
        )}
      </Box>
    </FormSection>
  );
}