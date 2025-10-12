'use client';

import { useState, useEffect } from 'react';
import { Control, Controller, FormState, FieldValues, Path, useWatch } from 'react-hook-form';
import { TextField, Box, FormControl, Typography, Skeleton } from '@mui/material';
import FormSection from '../../shared/FormSection';
import { RecurringMeetingPatternSelector } from '@/components/forms/RecurringMeetingPatternSelector';
import { TimePicker as MUITimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/de';

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
  const [meetingEnabled, setMeetingEnabled] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Watch the recurringMeeting field to determine initial state
  const recurringMeeting = useWatch({
    control,
    name: 'recurringMeeting' as Path<TFormValues>
  });

  // Client-side hydration
  useEffect(() => {
    setIsMounted(true);
    dayjs.locale('de');
  }, []);

  // Initialize meetingEnabled based on form data
  useEffect(() => {
    if (recurringMeeting && typeof recurringMeeting === 'object') {
      const meeting = recurringMeeting as { hasNoMeeting?: boolean };
      setMeetingEnabled(!meeting.hasNoMeeting);
    }
  }, [recurringMeeting]);

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
          name={'recurringMeeting' as Path<TFormValues>}
          control={control}
          render={({ field }) => (
            <RecurringMeetingPatternSelector
              value={field.value}
              onChange={field.onChange}
              onMeetingEnabledChange={setMeetingEnabled}
              error={getError('recurringMeeting')}
            />
          )}
        />

        {meetingEnabled && (
          <>
            {!isMounted ? (
              <Box sx={{ mb: 2, maxWidth: 300 }}>
                <Typography variant="subtitle2" component="label" sx={{ mb: 1, display: 'block', fontWeight: 500 }}>
                  Uhrzeit
                </Typography>
                <Skeleton variant="rectangular" height={56} animation="wave" />
              </Box>
            ) : (
              <Controller
                name={'recurringMeeting' as Path<TFormValues>}
                control={control}
                render={({ field }) => {
                  const currentValue = field.value || { patterns: [], time: undefined, hasNoMeeting: false };
                  const timeFormat = 'HH:mm';

                  return (
                    <Box sx={{ mb: 2, maxWidth: 300 }}>
                      <FormControl fullWidth>
                        <Typography
                          variant="subtitle2"
                          component="label"
                          htmlFor="meeting-time"
                          id="meeting-time-label"
                          sx={{ mb: 1, display: 'block', fontWeight: 500 }}
                        >
                          Uhrzeit
                        </Typography>
                        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="de">
                          <MUITimePicker
                            value={currentValue.time ? dayjs(currentValue.time, timeFormat) : null}
                            onChange={(time: dayjs.Dayjs | null) => {
                              field.onChange({
                                ...currentValue,
                                time: time ? time.format(timeFormat) : undefined
                              });
                            }}
                            ampm={false}
                            format={timeFormat}
                            slotProps={{
                              textField: {
                                variant: 'outlined',
                                fullWidth: true,
                                id: 'meeting-time',
                                inputProps: {
                                  'aria-labelledby': 'meeting-time-label',
                                }
                              },
                            }}
                          />
                        </LocalizationProvider>
                      </FormControl>
                    </Box>
                  );
                }}
              />
            )}

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
          </>
        )}
      </Box>
    </FormSection>
  );
}
