'use client';

import { useEffect, useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { UseFormRegister, UseFormSetValue } from 'react-hook-form';

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
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  // Register the field with react-hook-form
  useEffect(() => {
    register(name, { required: required ? `${label} ist erforderlich` : false });
  }, [register, name, required, label]);
  
  // Update form value when date changes
  useEffect(() => {
    if (selectedDate) {
      setValue(name, selectedDate);
    }
  }, [selectedDate, setValue, name]);
  
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-primary">*</span>}
      </label>
      
      <DatePicker
        selected={selectedDate}
        onChange={(date: Date | null) => setSelectedDate(date)}
        showTimeSelect
        timeFormat="HH:mm"
        timeIntervals={15}
        dateFormat="dd.MM.yyyy HH:mm"
        className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-dark-teal"
        placeholderText=""
        minDate={minDate}
      />
      
      {error && <p className="mt-1 text-dark-crimson text-sm">{error}</p>}
      
    </div>
  );
};

export default DateTimePicker;