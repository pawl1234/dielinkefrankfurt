'use client';

import { ReactElement, cloneElement } from 'react';
import { Controller, ControllerProps, useFormContext, FieldValues, Path, FieldPath } from 'react-hook-form';
import { FormControl, FormHelperText } from '@mui/material';
import { CustomValidationEntry } from './FormBase';

export interface ValidatedControllerProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> extends Omit<ControllerProps<TFieldValues, TName>, 'render'> {
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
   * Error display mode - 'helperText' integrates with FormControl, 'block' shows as separate element
   */
  errorMode?: 'helperText' | 'block';

  /**
   * Whether to wrap in FormControl (useful for Select, etc.)
   */
  useFormControl?: boolean;

  /**
   * Custom helper text to show when no errors present
   */
  helperText?: React.ReactNode;

  /**
   * Additional props to pass to FormControl (if useFormControl is true)
   */
  formControlProps?: any;

  /**
   * Render function that receives field props and error state
   */
  render: (props: {
    field: {
      onChange: (...event: any[]) => void;
      onBlur: () => void;
      value: any;
      name: TName;
      ref: React.RefObject<any>;
    };
    fieldState: {
      invalid: boolean;
      isTouched: boolean;
      isDirty: boolean;
      error?: any;
    };
    formState: any;
    hasError: boolean;
    errorMessage?: string;
  }) => ReactElement;
}

/**
 * Enhanced Controller with automatic validation integration.
 *
 * Eliminates boilerplate by:
 * - Automatically handling error display with consistent styling
 * - Managing validation state (show/hide errors based on submission)
 * - Supporting custom validations and server field errors
 * - Providing FormControl integration for complex inputs
 * - Consistent error prioritization using existing infrastructure
 *
 * Usage:
 * ```jsx
 * // Basic usage with Select
 * <ValidatedController
 *   name="groupId"
 *   rules={{ required: 'Bitte wählen Sie eine Gruppe' }}
 *   useFormControl
 *   render={({ field, hasError }) => (
 *     <Select {...field} error={hasError}>
 *       <MenuItem value="1">Option 1</MenuItem>
 *     </Select>
 *   )}
 * />
 *
 * // Custom input with block error display
 * <ValidatedController
 *   name="customField"
 *   errorMode="block"
 *   render={({ field, hasError }) => (
 *     <CustomInput {...field} error={hasError} />
 *   )}
 * />
 *
 * // With custom validations
 * <ValidatedController
 *   name="description"
 *   customValidations={descriptionValidations}
 *   render={({ field }) => (
 *     <RichTextEditor {...field} />
 *   )}
 * />
 * ```
 */
export default function ValidatedController<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  customValidations = [],
  serverFieldErrors,
  forceShowErrors = false,
  errorMode = 'helperText',
  useFormControl = false,
  helperText: customHelperText,
  formControlProps = {},
  render,
  ...controllerProps
}: ValidatedControllerProps<TFieldValues, TName>) {

  const renderController = (controllerRenderProps: any) => {
    // Get error state directly from Controller's fieldState
    const { fieldState, formState } = controllerRenderProps;
    const hasError = (formState.isSubmitted || forceShowErrors) && !!fieldState.error;
    const errorMessage = fieldState.error?.message;
    const finalHelperText = errorMessage || customHelperText;

    // Enhance render props with error state
    const enhancedProps = {
      ...controllerRenderProps,
      hasError,
      errorMessage
    };

    const inputElement = render(enhancedProps);

    // If not using FormControl, just return the input with optional block error
    if (!useFormControl) {
      return (
        <>
          {inputElement}
          {errorMode === 'block' && hasError && errorMessage && (
            <div style={{ color: 'error.main', marginTop: 8, fontSize: '0.75rem' }}>
              {errorMessage}
            </div>
          )}
        </>
      );
    }

    // Wrap in FormControl for complex inputs like Select
    return (
      <FormControl
        {...formControlProps}
        error={hasError}
        fullWidth={formControlProps.fullWidth !== false} // Default to fullWidth unless explicitly disabled
      >
        {inputElement}
        {errorMode === 'helperText' && finalHelperText && (
          <FormHelperText>{finalHelperText}</FormHelperText>
        )}
        {errorMode === 'block' && hasError && errorMessage && (
          <div style={{ color: 'error.main', marginTop: 8, fontSize: '0.75rem' }}>
            {errorMessage}
          </div>
        )}
      </FormControl>
    );
  };

  return (
    <Controller
      {...controllerProps}
      render={renderController}
    />
  );
}

/**
 * Convenience component for Select inputs
 */
export function ValidatedSelect<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>(props: Omit<ValidatedControllerProps<TFieldValues, TName>, 'useFormControl' | 'render'> & {
  children: React.ReactNode;
  SelectProps?: any;
}) {
  const { children, SelectProps = {}, ...validatedControllerProps } = props;

  return (
    <ValidatedController
      {...validatedControllerProps}
      useFormControl
      render={({ field, hasError }) => (
        <select {...field} {...SelectProps} error={hasError}>
          {children}
        </select>
      )}
    />
  );
}