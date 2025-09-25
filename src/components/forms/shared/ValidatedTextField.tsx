'use client';

import { forwardRef } from 'react';
import { TextField, TextFieldProps } from '@mui/material';
import { useFormContext, useController, RegisterOptions, FieldValues, Path, Control } from 'react-hook-form';
import { useFieldError, useFieldHasError } from './FieldError';
import { CustomValidationEntry } from './FormBase';

export interface ValidatedTextFieldProps<TFieldValues extends FieldValues = FieldValues>
  extends Omit<TextFieldProps, 'name' | 'error' | 'helperText'> {
  /**
   * Field name - must be a valid field path for the form
   */
  name: Path<TFieldValues>;

  /**
   * Form control - explicit control prop for reliability
   */
  control?: Control<TFieldValues>;

  /**
   * Validation rules for React Hook Form
   */
  rules?: RegisterOptions<TFieldValues>;

  /**
   * Custom validations to check (if not using form-level custom validations)
   */
  customValidations?: CustomValidationEntry[];

  /**
   * Server field errors to check (if not using form-level server errors)
   */
  serverFieldErrors?: Record<string, string>;

  /**
   * Force show errors regardless of submission state
   */
  forceShowErrors?: boolean;

  /**
   * Custom helper text to show when no errors present
   */
  helperText?: React.ReactNode;

  /**
   * Show character count (requires maxLength in rules or inputProps)
   */
  showCharacterCount?: boolean;
}

/**
 * Enhanced TextField with automatic validation integration.
 *
 * Eliminates boilerplate by:
 * - Automatically registering with React Hook Form
 * - Handling error display with consistent styling
 * - Managing validation state (show/hide errors based on submission)
 * - Supporting custom validations and server field errors
 * - Providing character count functionality
 *
 * Usage:
 * ```jsx
 * // Basic usage
 * <ValidatedTextField
 *   name="email"
 *   label="E-Mail"
 *   rules={{
 *     required: 'E-Mail ist erforderlich',
 *     pattern: { value: /^\S+@\S+\.\S+$/, message: 'Ungültige E-Mail' }
 *   }}
 * />
 *
 * // With character count
 * <ValidatedTextField
 *   name="title"
 *   label="Titel"
 *   rules={{ maxLength: { value: 100, message: 'Maximal 100 Zeichen' } }}
 *   showCharacterCount
 * />
 *
 * // With custom helper text
 * <ValidatedTextField
 *   name="description"
 *   label="Beschreibung"
 *   helperText="Beschreiben Sie Ihr Anliegen"
 *   multiline
 *   rows={4}
 * />
 * ```
 */
export const ValidatedTextField = forwardRef<
  HTMLDivElement,
  ValidatedTextFieldProps
>(function ValidatedTextField({
  name,
  control,
  rules,
  customValidations = [],
  serverFieldErrors,
  forceShowErrors = false,
  helperText: customHelperText,
  showCharacterCount = false,
  ...textFieldProps
}, ref) {

  // When explicit control is provided, use useController (best practice)
  if (control) {
    const {
      field,
      fieldState: { error }
    } = useController({
      name,
      control,
      rules
    });

    const shouldShowErrors = forceShowErrors || control._formState.isSubmitted;
    const hasError = shouldShowErrors && !!error;

    return (
      <TextField
        {...textFieldProps}
        {...field}
        name={name}
        error={hasError}
        helperText={customHelperText}
        ref={ref}
      />
    );
  }

  // Fallback to form context when no explicit control
  const contextMethods = useFormContext();
  const registration = contextMethods.register(name, rules);
  const hasError = useFieldHasError(name, customValidations, serverFieldErrors, forceShowErrors);

  return (
    <TextField
      {...textFieldProps}
      {...registration}
      name={name}
      error={hasError}
      helperText={customHelperText}
      ref={ref}
    />
  );
});

export default ValidatedTextField;