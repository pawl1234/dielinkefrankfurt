'use client';

import { useEffect, useState, useCallback, memo } from 'react';
import { UseFormRegister, UseFormSetValue } from 'react-hook-form';
import { DateTimePicker as MUIDateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
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

interface DateTimePickerProps {
  label: string;
  name: string;
  register: UseFormRegister<any>;
  required: boolean;
  setValue: UseFormSetValue<any>;
  error?: string;
  minDate?: Date;
  defaultValue?: Date;
}

const DateTimePicker = ({
  label,
  name,
  register,
  required,
  setValue,
  error,
  minDate,
  defaultValue,
}: DateTimePickerProps) => {
  // Initialize with default value if provided
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(
    defaultValue ? dayjs(defaultValue) : null
  );
  // Track client-side mounting
  const [isMounted, setIsMounted] = useState(false);

  // Register the field with react-hook-form
  useEffect(() => {
    register(name, { required: required ? `${label} ist erforderlich` : false });
  }, [register, name, required, label]);

  // Set mounted state when component loads on client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Optimize date change handler with useCallback
  const handleDateChange = useCallback((date: dayjs.Dayjs | null) => {
    setSelectedDate(date);
    if (date) {
      setValue(name, date.toDate(), { shouldValidate: true });
    } else {
      setValue(name, null, { shouldValidate: true });
    }
  }, [setValue, name]);

  // Format for German locale
  const dateTimeFormat = 'DD.MM.YYYY HH:mm';

  return (
    <Box sx={{ mb: 2 }}>
      <FormControl fullWidth error={!!error}>
        <Typography
          variant="subtitle2"
          component="label"
          htmlFor={`${name}-datetime`}
          id={`${name}-label`}
          sx={{
            mb: 1,
            display: 'block',
            fontWeight: 500
          }}
        >
          {label} {required && <Box component="span" sx={{ color: 'primary.main' }} aria-hidden="true">*</Box>}
        </Typography>

        {!isMounted ? (
          // Better loading state with Skeleton
          <Skeleton variant="rectangular" height={56} animation="wave" />
        ) : (
          // Client-side only rendering of DateTimePicker
          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="de">
            <MUIDateTimePicker
              value={selectedDate}
              onChange={handleDateChange}
              minDateTime={minDate ? dayjs(minDate) : undefined}
             // clearable
              ampm={false}
              format={dateTimeFormat}
              slotProps={{
                textField: {
                  variant: 'outlined',
                  fullWidth: true,
                  error: !!error,
                  id: `${name}-datetime`,
                  inputProps: {
                    'aria-labelledby': `${name}-label`,
                    'aria-required': required,
                  }
                },
              }}
            />
          </LocalizationProvider>
        )}

        {error && (
          <FormHelperText 
            error 
            sx={{
              mt: 0.5,
              ml: 1.75,
              fontSize: '0.75rem'
            }}
          >
            {error}
          </FormHelperText>
        )}
      </FormControl>
    </Box>
  );
};

// Use memo to prevent unnecessary re-renders
export default memo(DateTimePicker);