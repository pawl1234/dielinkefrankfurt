import { useMemo } from 'react';
import { FieldErrors, FieldValues } from 'react-hook-form';
import { CustomValidationEntry } from '@/components/forms/shared/FormBase';

interface ValidationError {
  field: string;
  label: string;
  message: string;
}

interface UseValidationErrorsProps<TFormValues extends FieldValues> {
  formErrors: FieldErrors<TFormValues>;
  customValidations: CustomValidationEntry[];
  submissionError: string | null;
  serverFieldErrors?: Record<string, string>; // NEW: Server-provided field errors
  isSubmitted: boolean;
}

const fieldLabels: Record<string, string> = {
  // Group form fields
  'name': 'Gruppenname',
  'description': 'Beschreibung',
  'responsiblePersons': 'Verantwortliche Personen',
  'logo': 'Logo',

  // Appointment form fields
  'title': 'Titel',
  'teaser': 'Kurzbeschreibung',
  'mainText': 'Beschreibung',
  'startDateTime': 'Startdatum',
  'endDateTime': 'Enddatum',
  'street': 'Straße',
  'city': 'Ort',
  'state': 'Bundesland',
  'postalCode': 'Postleitzahl',
  'firstName': 'Vorname',
  'lastName': 'Nachname',
  'recurringText': 'Wiederholungsbeschreibung',
  'coverImage': 'Cover-Bild',

  // Status report form fields
  'groupId': 'Gruppe',
  'content': 'Inhalt',
  'reporterFirstName': 'Vorname des Erstellers',
  'reporterLastName': 'Nachname des Erstellers',

  // Common fields
  'email': 'E-Mail-Adresse',
  'files': 'Datei-Anhänge'
};

/**
 * Hook to collect and format all validation errors from forms
 *
 * @param formErrors - React Hook Form field errors
 * @param customValidations - Custom validation rules with their current state
 * @param submissionError - Network/server submission error
 * @param isSubmitted - Whether the form has been submitted
 * @returns Array of formatted validation errors and submission error
 */
export function useValidationErrors<TFormValues extends FieldValues>({
  formErrors,
  customValidations,
  submissionError,
  serverFieldErrors,
  isSubmitted
}: UseValidationErrorsProps<TFormValues>) {

  const validationErrors = useMemo(() => {
    if (!isSubmitted) {
      return [];
    }

    const errors: ValidationError[] = [];

    // First, collect custom validation errors (they have highest priority)
    customValidations.forEach((validation) => {
      if (!validation.isValid && validation.message) {
        const label = fieldLabels[validation.field] || validation.field;

        errors.push({
          field: validation.field,
          label,
          message: validation.message
        });
      }
    });

    // Then, collect server field errors (second priority)
    if (serverFieldErrors) {
      Object.entries(serverFieldErrors).forEach(([fieldName, message]) => {
        // Check if we already have a custom validation error for this field
        const hasCustomError = errors.some(err => err.field === fieldName);

        if (!hasCustomError && message) {
          const label = fieldLabels[fieldName] || fieldName;

          errors.push({
            field: fieldName,
            label,
            message
          });
        }
      });
    }

    // Finally, collect React Hook Form field errors (lowest priority)
    Object.entries(formErrors).forEach(([fieldName, error]) => {
      if (error?.message) {
        // Check if we already have a custom or server validation error for this field
        const hasExistingError = errors.some(err => err.field === fieldName);

        if (!hasExistingError) {
          const label = fieldLabels[fieldName] || fieldName;
          const message = typeof error.message === 'string' ? error.message : 'Ungültiger Wert';

          errors.push({
            field: fieldName,
            label,
            message
          });
        }
      }
    });

    return errors;
  }, [formErrors, customValidations, serverFieldErrors, isSubmitted]);

  return {
    validationErrors,
    submissionError,
    hasValidationErrors: validationErrors.length > 0,
    hasAnyErrors: validationErrors.length > 0 || !!submissionError
  };
}

export default useValidationErrors;