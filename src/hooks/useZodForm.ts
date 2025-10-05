'use client';

import { useState, useMemo } from 'react';
import { useForm, UseFormProps, FieldValues, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CustomValidationEntry } from '@/types/form-types';
import { fieldLabels } from '@/lib/validation/validation-messages';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

interface ValidationError {
  field: string;
  label: string;
  message: string;
}

interface UseZodFormProps<TFormValues extends FieldValues>
  extends Omit<UseFormProps<TFormValues>, 'resolver'> {
  schema: z.ZodSchema<TFormValues>;
  onSubmit: (data: TFormValues) => Promise<void>;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  customValidations?: CustomValidationEntry[];
}

interface UseZodFormReturn<TFormValues extends FieldValues> extends UseFormReturn<TFormValues> {
  validationErrors: ValidationError[];
  submissionError: string | null;
  isSubmitting: boolean;
  submissionSuccess: boolean;
  onSubmit: (data: TFormValues) => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════════════
// INTERNAL HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Recursively flattens nested React Hook Form errors into a single-level array.
 * Handles nested objects and arrays (e.g., responsiblePersons[0].firstName)
 *
 * @internal
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

// ═══════════════════════════════════════════════════════════════════════════
// MAIN HOOK - PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Enhanced React Hook Form hook with Zod validation integration.
 *
 * This hook combines React Hook Form with Zod schema validation to provide:
 * - Automatic TypeScript type inference from Zod schemas
 * - German localized error messages
 * - Form submission state management
 * - Custom validation support for complex fields
 * - Consistent error handling
 *
 * @example
 * ```tsx
 * // Basic form with Zod validation
 * const schema = z.object({
 *   title: z.string().min(1, 'Titel ist erforderlich'),
 *   email: z.string().email('Ungültige E-Mail')
 * });
 *
 * const form = useZodForm({
 *   schema,
 *   defaultValues: { title: '', email: '' },
 *   onSubmit: async (data) => {
 *     await api.submit(data);
 *   }
 * });
 *
 * const { control, handleSubmit, formState } = form;
 * ```
 *
 * @example
 * ```tsx
 * // Form with custom validations
 * const customValidations = useMemo(() => [
 *   {
 *     field: 'richText',
 *     isValid: richTextContent.length > 0,
 *     message: 'Rich text content is required'
 *   }
 * ], [richTextContent]);
 *
 * const form = useZodForm({
 *   schema: mySchema,
 *   customValidations,
 *   onSubmit: handleSubmit
 * });
 * ```
 *
 * @param schema - Zod schema for form validation and TypeScript inference
 * @param onSubmit - Form submission handler that receives validated data
 * @param onSuccess - Optional callback executed after successful submission
 * @param onError - Optional callback executed when submission fails
 * @param customValidations - Additional validation rules for fields not covered by Zod
 * @param formProps - Additional React Hook Form configuration options
 * @returns Enhanced form object with validation and submission handling
 *
 * @template TFormValues - Form data type (automatically inferred from Zod schema)
 */
export function useZodForm<TFormValues extends FieldValues>({
  schema,
  onSubmit,
  onSuccess,
  onError,
  customValidations = [],
  ...formProps
}: UseZodFormProps<TFormValues>): UseZodFormReturn<TFormValues> {

  // ─────────────────────────────────────────────────────────────────────────
  // Form State (React Hook Form)
  // ─────────────────────────────────────────────────────────────────────────

  const form = useForm<TFormValues>({
    ...formProps,
    resolver: zodResolver(schema as any) as any,
  });

  const {
    formState: { errors: formErrors, isSubmitted },
  } = form;

  // ─────────────────────────────────────────────────────────────────────────
  // Submission State
  // ─────────────────────────────────────────────────────────────────────────

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────
  // Validation Errors Processing
  // ─────────────────────────────────────────────────────────────────────────

  const validationErrors = useMemo(() => {
    // Show file validation errors immediately (they validate on selection, not submission)
    const hasFileErrors = formErrors?.files;

    if (!isSubmitted && !hasFileErrors) {
      return [];
    }

    const errors: ValidationError[] = [];

    // First, collect custom validation errors (highest priority)
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

    // Then, collect React Hook Form field errors
    // Flatten nested errors to handle array fields like responsiblePersons[0].firstName
    const flattenedErrors = flattenErrors(formErrors);

    flattenedErrors.forEach(({ path: fieldPath, message }) => {
      // Show file errors immediately, other field errors only after submission
      const shouldShowError = isSubmitted || fieldPath === 'files' || fieldPath.startsWith('files.');

      if (shouldShowError) {
        // Check if we already have a custom validation error for this field
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
  }, [formErrors, customValidations, isSubmitted]);

  // ─────────────────────────────────────────────────────────────────────────
  // Submit Handler
  // ─────────────────────────────────────────────────────────────────────────

  const handleSubmit = async (data: TFormValues) => {
    setIsSubmitting(true);
    setSubmissionError(null);
    setSubmissionSuccess(false);

    try {
      await onSubmit(data);

      setSubmissionSuccess(true);
      if (onSuccess) onSuccess();

      // Scroll to top of form to show success message
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Form submission error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten.';
      setSubmissionError(errorMessage);

      // Scroll to top to show error message
      window.scrollTo({ top: 0, behavior: 'smooth' });

      if (onError) onError(error as Error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Return Enhanced Form Object
  // ─────────────────────────────────────────────────────────────────────────

  return {
    ...form,
    validationErrors,
    submissionError,
    isSubmitting,
    submissionSuccess,
    onSubmit: handleSubmit,
  };
}

export default useZodForm;
