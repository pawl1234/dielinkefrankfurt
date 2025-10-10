'use client';

import { Control, Controller, FormState, FieldValues, Path } from 'react-hook-form';
import { TextField, Box } from '@mui/material';
import FormSection from '../../shared/FormSection';

interface GroupMeetingSectionProps<TFormValues extends FieldValues> {
  control: Control<TFormValues>;
  formState: FormState<TFormValues>;
}

/**
 * Form section for group meeting information (optional).
 * Includes regular meeting schedule and location fields.
 */
export default function GroupMeetingSection<TFormValues extends FieldValues>({
  control,
  formState
}: GroupMeetingSectionProps<TFormValues>) {
  const { errors } = formState;

  // Helper to safely access error messages from generic form errors
  const getError = (fieldName: string) => {
    const error = errors[fieldName as keyof typeof errors];
    return error && typeof error === 'object' && 'message' in error
      ? (error.message as string)
      : undefined;
  };

  const hasError = (fieldName: string) => !!errors[fieldName as keyof typeof errors];

  return (
    <FormSection
      title="Regelmäßiges Treffen (optional)"
      helpTitle="Treffen der Arbeitsgruppe"
      helpText="Falls Ihre Arbeitsgruppe regelmäßige Treffen abhält, geben Sie hier die Informationen dazu an. Diese Angaben sind optional."
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Controller
          name={'regularMeeting' as Path<TFormValues>}
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Regelmäßiges Treffen"
              placeholder="z.B. Jeden 3. Dienstag im Monat, 19:00 Uhr"
              multiline
              rows={2}
              fullWidth
              error={hasError('regularMeeting')}
              helperText={getError('regularMeeting')}
            />
          )}
        />

        <Controller
          name={'meetingStreet' as Path<TFormValues>}
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Straße"
              placeholder="z.B. Musterstraße 123"
              fullWidth
              error={hasError('meetingStreet')}
              helperText={getError('meetingStreet')}
            />
          )}
        />

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Controller
            name={'meetingPostalCode' as Path<TFormValues>}
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Postleitzahl"
                placeholder="60311"
                sx={{ width: '30%' }}
                error={hasError('meetingPostalCode')}
                helperText={getError('meetingPostalCode')}
              />
            )}
          />

          <Controller
            name={'meetingCity' as Path<TFormValues>}
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Stadt"
                placeholder="Frankfurt am Main"
                sx={{ flexGrow: 1 }}
                error={hasError('meetingCity')}
                helperText={getError('meetingCity')}
              />
            )}
          />
        </Box>

        <Controller
          name={'meetingLocationDetails' as Path<TFormValues>}
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Zusätzliche Ortsangaben"
              placeholder="z.B. Raum 204, 2. OG, Hintereingang"
              multiline
              rows={2}
              fullWidth
              error={hasError('meetingLocationDetails')}
              helperText={getError('meetingLocationDetails')}
            />
          )}
        />
      </Box>
    </FormSection>
  );
}
