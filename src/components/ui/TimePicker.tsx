'use client';

import { useEffect, useState, memo } from 'react';
import { Control, Controller, FieldValues, Path, RegisterOptions, PathValue } from 'react-hook-form';
import { TimePicker as MUITimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/de';
import {
  FormControl,
  FormHelperText,
  Box,
  Typography,
  Skeleton,
} from '@mui/material';

interface TimePickerProps<TFieldValues extends FieldValues = FieldValues> {
  label: string;
  name: Path<TFieldValues>;
  control: Control<TFieldValues>;
  rules?: Omit<RegisterOptions<TFieldValues, Path<TFieldValues>>, 'valueAsNumber' | 'valueAsDate' | 'setValueAs' | 'disabled'>;
  required?: boolean;
  error?: string;
  defaultValue?: string;
  disabled?: boolean;
}

/**
 * TimePicker component for selecting time only (HH:mm format)
 * Similar to DateTimePicker but only for time selection
 *
 * @param label - Label for the time picker
 * @param name - Field name for React Hook Form
 * @param control - React Hook Form control object
 * @param rules - Validation rules
 * @param required - Whether the field is required
 * @param error - Error message
 * @param defaultValue - Default time value in HH:mm format
 * @param disabled - Whether the field is disabled
 * @returns TimePicker component
 */
const TimePicker = <TFieldValues extends FieldValues>({
  label,
  name,
  control,
  rules,
  required,
  error: propError,
  defaultValue,
  disabled = false
}: TimePickerProps<TFieldValues>) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    dayjs.locale('de');
  }, []);

  const timeFormat = 'HH:mm';

  if (!isMounted) {
    return (
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" component="label" sx={{ mb: 1, display: 'block', fontWeight: 500 }}>
          {label} {required && <Box component="span" sx={{ color: 'primary.main' }} aria-hidden="true">*</Box>}
        </Typography>
        <Skeleton variant="rectangular" height={56} animation="wave" />
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 2 }}>
      <FormControl fullWidth error={!!propError}>
        <Typography
          variant="subtitle2"
          component="label"
          htmlFor={`${name}-time`}
          id={`${name}-label`}
          sx={{ mb: 1, display: 'block', fontWeight: 500 }}
        >
          {label} {required && <Box component="span" sx={{ color: 'primary.main' }} aria-hidden="true">*</Box>}
        </Typography>
        <Controller
          name={name}
          control={control}
          rules={rules || { required: required ? `${label} ist erforderlich` : false }}
          defaultValue={defaultValue as PathValue<TFieldValues, Path<TFieldValues>>}
          render={({ field: { onChange, value, ref, ...restField }, fieldState: { error: controllerError } }) => (
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="de">
              <MUITimePicker
                {...restField}
                value={value ? dayjs(value, timeFormat) : null}
                onChange={(time: dayjs.Dayjs | null) => {
                  onChange(time ? time.format(timeFormat) : null);
                }}
                inputRef={ref}
                ampm={false}
                format={timeFormat}
                disabled={disabled}
                slotProps={{
                  textField: {
                    variant: 'outlined',
                    fullWidth: true,
                    error: !!propError || !!controllerError,
                    id: `${name}-time`,
                    inputProps: {
                      'aria-labelledby': `${name}-label`,
                      'aria-required': required,
                    }
                  },
                }}
              />
            </LocalizationProvider>
          )}
        />
        {(propError || (control.getFieldState(name).isTouched && control.getFieldState(name).error)) && (
          <FormHelperText error sx={{ mt: 0.5, ml: 1.75, fontSize: '0.75rem' }}>
            {propError || control.getFieldState(name).error?.message}
          </FormHelperText>
        )}
      </FormControl>
    </Box>
  );
};

export default memo(TimePicker);
