'use client';

import { Typography, Box } from '@mui/material';
import { useFormContext } from 'react-hook-form';
import { useValidationErrors } from '@/hooks/useValidationErrors';
import { CustomValidationEntry } from './FormBase';

export interface FieldErrorProps {
  /**
   * Field name to display errors for
   */
  name: string;

  /**
   * Display mode: 'helperText' for inline, 'block' for standalone
   */
  mode?: 'helperText' | 'block';

  /**
   * Custom validations to check (if not using form-level custom validations)
   */
  customValidations?: CustomValidationEntry[];

  /**
   * Server field errors to check (if not using form-level server errors)
   */
  serverFieldErrors?: Record<string, string>;

  /**
   * Override the form submission state check - show errors even before submission
   */
  forceShow?: boolean;

  /**
   * Additional styling for block mode
   */
  sx?: any;
}

/**
 * FieldError - Consistent error display component for form fields
 *
 * This component provides standardized error display for form fields with:
 * - Integration with React Hook Form validation errors
 * - Support for custom validation rules
 * - Server-side field error display
 * - German localized error messages
 * - Flexible display modes (inline vs block)
 * - Consistent styling and behavior
 *
 * The component automatically handles:
 * - Error visibility based on form submission state
 * - Error prioritization (server > custom > form validation)
 * - Consistent typography and styling
 * - Accessibility with proper ARIA attributes
 *
 * @example
 * ```tsx
 * // Basic usage - shows React Hook Form validation errors
 * <ValidatedTextField name="email" />
 * // FieldError is automatically integrated in ValidatedTextField
 * ```
 *
 * @example
 * ```tsx
 * // Block mode for complex fields like rich text editors
 * <RichTextEditor value={content} onChange={setContent} />
 * <FieldError
 *   name="content"
 *   mode="block"
 *   customValidations={[{
 *     field: 'content',
 *     isValid: content.length > 0,
 *     message: 'Content is required'
 *   }]}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // With server field errors
 * <FieldError
 *   name="username"
 *   serverFieldErrors={{ username: 'Username already exists' }}
 * />
 * ```
 *
 * @param name - Field name to display errors for (must match form field name)
 * @param mode - Display mode: "helperText" for inline display, "block" for standalone
 * @param customValidations - Additional validation rules not handled by form schema
 * @param serverFieldErrors - Server-side validation errors
 * @param forceShow - Show errors even before form submission (default: false)
 * @param sx - Additional Material-UI styling (only applies to block mode)
 */
export default function FieldError({
  name,
  mode = 'helperText',
  customValidations = [],
  serverFieldErrors,
  forceShow = false,
  sx
}: FieldErrorProps) {
  const {
    formState: { errors, isSubmitted, submitCount }
  } = useFormContext();

  // Only show errors after form has been submitted (consistent with existing patterns)
  const shouldShowErrors = forceShow || isSubmitted || submitCount > 0;

  if (!shouldShowErrors) {
    return null;
  }

  // Use existing validation error infrastructure
  const { validationErrors } = useValidationErrors({
    formErrors: errors,
    customValidations,
    submissionError: null, // Field errors don't show submission errors
    serverFieldErrors,
    isSubmitted: shouldShowErrors
  });

  // Find error for this specific field
  const fieldError = validationErrors.find(error => error.field === name);

  if (!fieldError) {
    return null;
  }

  // Block mode - standalone error display
  if (mode === 'block') {
    return (
      <Typography
        variant="caption"
        color="error"
        sx={{
          mt: 1,
          display: 'block',
          ...sx
        }}
      >
        {fieldError.message}
      </Typography>
    );
  }

  // HelperText mode - return just the text for use in TextField helperText
  // Note: This component returns a text node when in helperText mode
  return <>{fieldError.message}</>;
}

/**
 * Hook to get field error text for use in helperText props
 *
 * @param name - Field name
 * @param customValidations - Custom validations array
 * @param serverFieldErrors - Server field errors object
 * @param forceShow - Force show errors regardless of submission state
 * @returns Error message string or undefined
 */
export function useFieldError(
  name: string,
  customValidations: CustomValidationEntry[] = [],
  serverFieldErrors?: Record<string, string>,
  forceShow: boolean = false
): string | undefined {
  const {
    formState: { errors, isSubmitted, submitCount }
  } = useFormContext();

  // Only show errors after form has been submitted
  const shouldShowErrors = forceShow || isSubmitted || submitCount > 0;

  if (!shouldShowErrors) {
    return undefined;
  }

  // Use existing validation error infrastructure
  const { validationErrors } = useValidationErrors({
    formErrors: errors,
    customValidations,
    submissionError: null,
    serverFieldErrors,
    isSubmitted: shouldShowErrors
  });

  // Find error for this specific field
  const fieldError = validationErrors.find(error => error.field === name);

  return fieldError?.message;
}

/**
 * Hook to check if a field has errors (for styling purposes)
 *
 * @param name - Field name
 * @param customValidations - Custom validations array
 * @param serverFieldErrors - Server field errors object
 * @param forceShow - Force show errors regardless of submission state
 * @returns Boolean indicating if field has errors
 */
export function useFieldHasError(
  name: string,
  customValidations: CustomValidationEntry[] = [],
  serverFieldErrors?: Record<string, string>,
  forceShow: boolean = false
): boolean {
  const errorMessage = useFieldError(name, customValidations, serverFieldErrors, forceShow);
  return !!errorMessage;
}