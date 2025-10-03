import { useMemo } from 'react';
import { FieldErrors, FieldValues } from 'react-hook-form';
import { CustomValidationEntry } from '@/types/form-types';
import { fieldLabels } from '@/lib/validation-messages';

interface ValidationError {
  field: string;
  label: string;
  message: string;
}

/**
 * Recursively flattens nested React Hook Form errors into a single-level array
 * Handles nested objects and arrays (e.g., responsiblePersons[0].firstName)
 *
 * @param errors - React Hook Form errors object
 * @param prefix - Current path prefix for nested fields
 * @returns Array of flattened error objects with path and message
 */
function flattenErrors(errors: any, prefix: string = ''): Array<{ path: string; message: string }> {
  const result: Array<{ path: string; message: string }> = [];

  Object.entries(errors).forEach(([key, value]: [string, any]) => {
    const currentPath = prefix ? `${prefix}.${key}` : key;

    if (value?.message) {
      // Direct error message
      result.push({ path: currentPath, message: value.message });
    } else if (value && typeof value === 'object') {
      // Nested errors (object or array)
      result.push(...flattenErrors(value, currentPath));
    }
  });

  return result;
}

interface UseValidationErrorsProps<TFormValues extends FieldValues> {
  formErrors: FieldErrors<TFormValues>;
  customValidations: CustomValidationEntry[];
  submissionError: string | null;
  serverFieldErrors?: Record<string, string>; // Server-provided field errors
  isSubmitted: boolean;
}

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
    // Show file validation errors immediately (they validate on selection, not submission)
    const hasFileErrors = formErrors?.files;

    if (!isSubmitted && !hasFileErrors) {
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
    // Flatten nested errors to handle array fields like responsiblePersons[0].firstName
    const flattenedErrors = flattenErrors(formErrors);

    flattenedErrors.forEach(({ path: fieldPath, message }) => {
      // Show file errors immediately, other field errors only after submission
      const shouldShowError = isSubmitted || fieldPath === 'files' || fieldPath.startsWith('files.');

      if (shouldShowError) {
        // Check if we already have a custom or server validation error for this field
        const hasExistingError = errors.some(err => err.field === fieldPath);

        if (!hasExistingError) {
          // Extract the base field name for label lookup
          // e.g., "responsiblePersons.0.firstName" -> "firstName"
          const baseFieldName = fieldPath.split('.').pop() || fieldPath;
          const label = fieldLabels[baseFieldName] || fieldLabels[fieldPath] || baseFieldName;
          const errorMessage = typeof message === 'string' ? message : 'Ungültiger Wert';

          errors.push({
            field: fieldPath,
            label,
            message: errorMessage
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