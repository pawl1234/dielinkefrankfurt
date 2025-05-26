'use client';

import { useEffect, useState, useCallback, memo } from 'react';
import { Control, Controller, FieldValues, Path, RegisterOptions, UseFormSetValue } from 'react-hook-form'; // Import Control and Controller
import { DateTimePicker as MUIDateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/de'; // Ensure German locale is imported
import {
  FormControl,
  FormHelperText,
  Box,
  Typography,
  Skeleton,
} from '@mui/material';

interface DateTimePickerProps<TFieldValues extends FieldValues = FieldValues> {
  label: string;
  name: Path<TFieldValues>; // Use Path for typed field names
  control: Control<TFieldValues>; // Pass control object from useForm
  rules?: Omit<RegisterOptions<TFieldValues, Path<TFieldValues>>, 'valueAsNumber' | 'valueAsDate' | 'setValueAs' | 'disabled'>; // RHF validation rules
  required?: boolean; // Kept for label styling, but rules.required is primary
  error?: string; // Error message passed from parent (RHF formState.errors)
  minDate?: Date;
  defaultValue?: Date; // Initial default value
  setValue?: UseFormSetValue<TFieldValues>; // Optional: if direct setValue is needed for other reasons
}

const DateTimePicker = <TFieldValues extends FieldValues>({
  label,
  name,
  control,
  rules,
  required, // Used for the asterisk in the label
  error: propError, // Error from RHF formState, passed as a prop
  minDate,
  defaultValue,
}: DateTimePickerProps<TFieldValues>) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    dayjs.locale('de'); // Ensure locale is set (can also be global)
  }, []);

  const dateTimeFormat = 'DD.MM.YYYY HH:mm';

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
          htmlFor={`${name}-datetime`} // Connects to the input field via slotProps
          id={`${name}-label`}
          sx={{ mb: 1, display: 'block', fontWeight: 500 }}
        >
          {label} {required && <Box component="span" sx={{ color: 'primary.main' }} aria-hidden="true">*</Box>}
        </Typography>
        <Controller
          name={name}
          control={control}
          rules={rules || { required: required ? `${label} ist erforderlich` : false }}
          defaultValue={defaultValue ? dayjs(defaultValue) as any : null} // Set RHF default value for the Controller
          render={({ field: { onChange, value, ref, ...restField }, fieldState: { error: controllerError } }) => (
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="de">
              <MUIDateTimePicker
                {...restField} // Spread other field props like onBlur if needed
                value={value ? dayjs(value) : null} // Convert RHF Date object to Dayjs for MUI
                onChange={(date: dayjs.Dayjs | null) => {
                  onChange(date ? date.toDate() : null); // Convert Dayjs back to Date for RHF
                }}
                inputRef={ref} // Connect RHF ref to the underlying input for focus management
                minDateTime={minDate ? dayjs(minDate) : undefined}
                ampm={false}
                format={dateTimeFormat}
                slotProps={{
                  textField: {
                    variant: 'outlined',
                    fullWidth: true,
                    error: !!propError || !!controllerError, // Combine errors
                    id: `${name}-datetime`, // Used by label's htmlFor
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
        {(propError || (control.getFieldState(name).isTouched && control.getFieldState(name).error)) && ( // Show error if propError or RHF controllerError
          <FormHelperText error sx={{ mt: 0.5, ml: 1.75, fontSize: '0.75rem' }}>
            {propError || control.getFieldState(name).error?.message}
          </FormHelperText>
        )}
      </FormControl>
    </Box>
  );
};

export default memo(DateTimePicker);