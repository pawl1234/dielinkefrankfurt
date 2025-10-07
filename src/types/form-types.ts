/**
 * Common types and interfaces for form components
 */

import { ReactNode } from 'react';

/**
 * Base properties shared by all form components
 */
export interface BaseFormProps {
  /** Mode of the form (create or edit) */
  mode?: 'create' | 'edit';
  
  /** Text to display on the submit button */
  submitButtonText?: string;
  
  /** Callback function for when the form is submitted */
  onSubmit?: (data: Record<string, unknown>, files?: (File | Blob)[]) => Promise<void>;
  
  /** Callback function for when the form is cancelled (edit mode) */
  onCancel?: () => void;
  
  /** Initial values for the form fields (edit mode) */
  initialValues?: Record<string, unknown>;
}

/**
 * Properties for a form section
 */
export interface FormSectionProps {
  /** Title of the section */
  title: string;
  
  /** Title of the help text */
  helpTitle?: string;
  
  /** Help text content */
  helpText?: ReactNode;
  
  /** Children elements */
  children: ReactNode;
}

/**
 * Properties for a form success message
 */
export interface FormSuccessMessageProps {
  /** Title of the success message */
  title: string;
  
  /** Message content */
  message: string | ReactNode;
  
  /** Function to reset the form */
  resetForm?: () => void;
  
  /** Text for the reset button */
  resetButtonText?: string;
  
  /** Whether to show the reset button */
  showResetButton?: boolean;
}

/**
 * Properties for form field components
 */
export interface FormFieldProps {
  /** Label for the field */
  label: string;

  /** Name of the field */
  name: string;

  /** Whether the field is required */
  required?: boolean;

  /** Error message for the field */
  error?: string;

  /** Placeholder text */
  placeholder?: string;

  /** Helper text */
  helperText?: string;
}

/**
 * Properties for EditStatusReportForm component
 */
export interface EditStatusReportFormProps {
  /** The status report data to edit */
  statusReport: import('./api-types').StatusReportData;

  /** Callback when form is submitted */
  onSubmit: (
    data: import('./api-types').StatusReportAdminSubmission
  ) => Promise<void>;

  /** Callback when form is cancelled */
  onCancel: () => void;
}

/**
 * Properties for EditAppointmentForm component
 */
export interface EditAppointmentFormProps {
  /** The appointment data to edit */
  appointment: {
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
    fileUrls: string | null;
    featured: boolean;
    metadata?: string | null;
    status: 'pending' | 'accepted' | 'rejected';
  };

  /** Callback when form is submitted */
  onSubmit: (
    data: import('@/lib/validation/appointment').AppointmentSubmitData
  ) => Promise<void>;

  /** Callback when form is cancelled */
  onCancel: () => void;
}

/**
 * Custom validation entry for form fields that require validation beyond schema validation
 * Used for complex fields like file uploads, rich text editors, etc.
 */
export interface CustomValidationEntry {
  field: string;
  isValid: boolean;
  message?: string;
}