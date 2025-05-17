import React, { useState, useEffect, useCallback } from 'react';
import { TextField, TextFieldProps } from '@mui/material';
import { useDebounce } from '@/lib/hooks/useDebounce';

interface DebouncedInputProps extends Omit<TextFieldProps, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  debounceTime?: number;
  onBlurImmediate?: boolean;
}

/**
 * Debounced input component to improve performance by reducing frequent updates.
 * Only updates the parent value after the user stops typing for a set amount of time.
 */
const DebouncedInput: React.FC<DebouncedInputProps> = ({
  value,
  onChange,
  debounceTime = 300,
  onBlurImmediate = true,
  ...textFieldProps
}) => {
  const [inputValue, setInputValue] = useState(value);
  const debouncedValue = useDebounce<string>(inputValue, debounceTime);
  
  // Update internal state when external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);
  
  // Call parent onChange when debounced value changes
  useEffect(() => {
    if (debouncedValue !== value) {
      onChange(debouncedValue);
    }
  }, [debouncedValue, onChange, value]);
  
  // Handle input changes
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  }, []);
  
  // Handle blur to update immediately if needed
  const handleBlur = useCallback(() => {
    if (onBlurImmediate && inputValue !== value) {
      onChange(inputValue);
    }
  }, [onChange, inputValue, value, onBlurImmediate]);
  
  return (
    <TextField
      {...textFieldProps}
      value={inputValue}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
};

export default DebouncedInput;