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

/**
 * Appointment interface for consistent typing across components
 * Based on Prisma Appointment model
 */
export interface Appointment {
  id: number;
  title: string;
  mainText: string;
  startDateTime: string;
  endDateTime: string | null;
  street: string | null;
  city: string | null;
  locationDetails: string | null;
  postalCode: string | null;
  firstName: string | null;
  lastName: string | null;
  recurringText: string | null;
  featured: boolean;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  updatedAt: string;
  processed: boolean;
  processingDate: string | null;
  statusChangeDate: string | null;
  rejectionReason: string | null;
  fileUrls: string | null;
  metadata: string | null;
}

/**
 * Partial appointment interface for public/display use cases
 * Contains only fields typically needed for frontend display
 */
export interface PublicAppointment {
  id: number;
  title: string;
  mainText: string;
  startDateTime: string;
  endDateTime: string | null;
  street: string | null;
  city: string | null;
  locationDetails: string | null;
  postalCode: string | null;
  featured: boolean;
}