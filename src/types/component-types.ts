/**
 * Component-specific types and interfaces
 */

import { Control, FieldValues, Path, RegisterOptions, UseFormSetValue } from 'react-hook-form';

/**
 * Props for DateTimePicker component with proper typing
 */
export interface DateTimePickerProps<TFieldValues extends FieldValues = FieldValues> {
  label: string;
  name: Path<TFieldValues>;
  control: Control<TFieldValues>;
  rules?: Omit<RegisterOptions<TFieldValues, Path<TFieldValues>>, 'valueAsNumber' | 'valueAsDate' | 'setValueAs' | 'disabled'>;
  required?: boolean;
  error?: string;
  minDate?: Date;
  defaultValue?: Date;
  setValue?: UseFormSetValue<TFieldValues>;
}

/**
 * Form control type for components that need control object
 */
export interface FormControlProps<TFieldValues extends FieldValues = FieldValues> {
  control: Control<TFieldValues>;
  name: Path<TFieldValues>;
  rules?: RegisterOptions<TFieldValues, Path<TFieldValues>>;
}