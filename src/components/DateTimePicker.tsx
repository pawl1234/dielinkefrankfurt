'use client';

import { useEffect, useState } from 'react';
import { UseFormRegister, UseFormSetValue } from 'react-hook-form';
import { DateTimePicker as MUIDateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/de';
import {
  FormControl,
  FormHelperText,
  InputLabel,
  Box,
  Typography
} from '@mui/material';

interface DateTimePickerProps {
  label: string;
  name: string;
  register: UseFormRegister<any>;
  required: boolean;
  setValue: UseFormSetValue<any>;
  error?: string;
  minDate?: Date;
}

const DateTimePicker = ({
  label,
  name,
  register,
  required,
  setValue,
  error,
  minDate,
}: DateTimePickerProps) => {
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(null);

  // Register the field with react-hook-form
  useEffect(() => {
    register(name, { required: required ? `${label} ist erforderlich` : false });
  }, [register, name, required, label]);

  // Update form value when date changes
  useEffect(() => {
    if (selectedDate) {
      setValue(name, selectedDate.toDate());
    }
  }, [selectedDate, setValue, name]);

  return (
    <Box sx={{ mb: 2 }}>
      <FormControl fullWidth error={!!error}>
        <Typography
          variant="subtitle2"
          component="label"
          sx={{
            mb: 1,
            display: 'block',
            fontWeight: 500
          }}
        >
          {label} {required && <Box component="span" sx={{ color: 'primary.main' }}>*</Box>}
        </Typography>

        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="de">
          <MUIDateTimePicker
            value={selectedDate}
            onChange={(date) => setSelectedDate(date)}
            minDateTime={minDate ? dayjs(minDate) : undefined}
            slotProps={{
              textField: {
                variant: 'outlined',
                fullWidth: true,
                error: !!error
              }
            }}
            ampm={false}
            format="DD.MM.YYYY HH:mm"
          />
        </LocalizationProvider>

        {error && (
          <FormHelperText error>{error}</FormHelperText>
        )}
      </FormControl>
    </Box>
  );
};

export default DateTimePicker;