'use client';

import { ReactNode, RefObject, createContext, useContext } from 'react';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { FieldValues, UseFormReturn, FormProvider, SubmitHandler, FieldErrors } from 'react-hook-form';
import FormSuccessMessage from './FormSuccessMessage';
import FormErrorMessage from './FormErrorMessage';
import { useFormSubmission } from '@/hooks/useFormSubmission';
import { FormValidationHelper } from './FormValidationHelper';
import { useValidationErrors } from '@/hooks/useValidationErrors';

// Context for providing form error handling to child components
interface FormErrorContextType {
  setSubmissionError: (error: string | null) => void;
}

const FormErrorContext = createContext<FormErrorContextType | null>(null);

export const useFormError = () => {
  const context = useContext(FormErrorContext);
  if (!context) {
    throw new Error('useFormError must be used within a FormBase component');
  }
  return context;
};

export interface FieldRefMap {
  [key: string]: RefObject<HTMLElement>;
}

export interface CustomValidationEntry {
  field: string;
  isValid: boolean;
  message?: string;
}

export interface FormBaseProps<TFormValues extends FieldValues> {
  formMethods: UseFormReturn<TFormValues>;
  onSubmit: (data: TFormValues, files?: (File | Blob)[]) => Promise<void>;
  fieldRefs?: FieldRefMap;
  fieldOrder?: string[];
  submitButtonText?: string;
  resetButtonText?: string;
  mode?: 'create' | 'edit';
  successTitle?: string;
  successMessage?: string | ReactNode;
  errorTitle?: string;
  onRetry?: () => void;
  files?: (File | Blob)[];
  children: ReactNode;
  onReset?: () => void;
  onCancel?: () => void;
  customValidations?: CustomValidationEntry[];
  serverFieldErrors?: Record<string, string>;
  loading?: boolean;
  loadingMessage?: string;
}

/**
 * FormBase - Comprehensive form wrapper with validation and error handling
 *
 * This component provides a standardized foundation for all forms in the application,
 * including:
 * - Consistent form layout and styling
 * - Integrated error handling and display
 * - Automatic error scrolling to first validation error
 * - Form submission state management
 * - Success and error messaging
 * - Form reset functionality
 * - Cancel handling for edit forms
 *
 * @example
 * ```tsx
 * // Basic form usage
 * <FormBase
 *   formMethods={form}
 *   onSubmit={handleSubmit}
 *   fieldRefs={fieldRefs}
 *   fieldOrder={fieldOrder}
 *   submitButtonText="Submit"
 * >
 *   <ValidatedTextField name="title" label="Title" />
 * </FormBase>
 * ```
 *
 * @example
 * ```tsx
 * // Form with custom validations and file upload
 * <FormBase
 *   formMethods={form}
 *   onSubmit={handleSubmit}
 *   fieldRefs={fieldRefs}
 *   fieldOrder={fieldOrder}
 *   customValidations={customValidations}
 *   files={fileList}
 *   mode="edit"
 *   onCancel={handleCancel}
 * >
 *   <FormSection title="Content">
 *     <ValidatedTextField name="title" label="Title" />
 *     <FieldError name="customField" mode="block" customValidations={customValidations} />
 *   </FormSection>
 * </FormBase>
 * ```
 *
 * @template TFormValues - Form data type (should match the form schema)
 * @param formMethods - React Hook Form methods from useForm or useZodForm
 * @param onSubmit - Form submission handler
 * @param fieldRefs - Map of field names to DOM element references for error scrolling
 * @param fieldOrder - Array defining the order for error scrolling priority
 * @param submitButtonText - Text for the submit button (default: "Absenden")
 * @param resetButtonText - Text for the reset button (default: "Zurücksetzen")
 * @param mode - Form mode affecting button behavior ("create" | "edit")
 * @param successTitle - Title for success message (default: "Erfolgreich übermittelt!")
 * @param successMessage - Success message content
 * @param errorTitle - Title for error messages (default: "Fehler beim Absenden des Formulars")
 * @param onRetry - Optional retry handler for failed submissions
 * @param files - Optional files array for forms with file uploads
 * @param children - Form content (sections, fields, etc.)
 * @param onReset - Optional custom reset handler
 * @param onCancel - Optional cancel handler (shows cancel button if provided)
 * @param customValidations - Additional validation rules not handled by the form schema
 * @param serverFieldErrors - Server-side field validation errors
 */
export default function FormBase<TFormValues extends FieldValues>({
  formMethods,
  onSubmit,
  fieldRefs,
  fieldOrder,
  submitButtonText = 'Absenden',
  resetButtonText = 'Zurücksetzen',
  mode = 'create',
  successTitle = 'Erfolgreich übermittelt!',
  successMessage = 'Ihre Daten wurden erfolgreich übermittelt.',
  errorTitle = 'Fehler beim Absenden des Formulars',
  onRetry,
  files = [],
  children,
  onReset,
  onCancel,
  customValidations = [],
  serverFieldErrors,
  loading = false,
  loadingMessage = 'Lade Formular...',
}: FormBaseProps<TFormValues>) {
  const { handleSubmit: rhfHandleSubmit, reset, formState } = formMethods;

  const resetForm = () => {
    reset();
    if (onReset) onReset();
  };
  
  const { isSubmitting, submissionError, submissionSuccess, setSubmissionError, handleSubmit: executeActualSubmit } = useFormSubmission<TFormValues>({
    onSubmit: async (data) => {
      await onSubmit(data, files);
    },
    resetForm
  });

  // Collect all validation errors for prominent display
  const { validationErrors, hasAnyErrors } = useValidationErrors({
    formErrors: formState.errors,
    customValidations,
    submissionError,
    serverFieldErrors,
    isSubmitted: formState.isSubmitted || formState.submitCount > 0
  });

  const handleValidRHFSubmit: SubmitHandler<TFormValues> = (data) => {
    // Only check custom validations if they exist AND refs are provided
    if (customValidations.length > 0) {
      const firstInvalidCustom = customValidations.find(cv => !cv.isValid);
      if (firstInvalidCustom && fieldRefs && fieldOrder) {
        // Only scroll if we have the infrastructure
        FormValidationHelper.scrollToFirstError(
          {}, customValidations, fieldRefs, fieldOrder
        );
        return;
      }
    }
    executeActualSubmit(data);
  };

  const handleInvalidRHFSubmit = (rhfValidationErrors: FieldErrors<TFormValues>) => {
    // Only scroll to errors if refs are provided
    if (fieldRefs && fieldOrder) {
      FormValidationHelper.scrollToFirstError(
        rhfValidationErrors, customValidations, fieldRefs, fieldOrder
      );
    }
    // If no refs provided, let RHF handle focus naturally
  };

  // Handle loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>{loadingMessage}</Typography>
      </Box>
    );
  }

  return (
    <FormProvider {...formMethods}>
      <FormErrorContext.Provider value={{ setSubmissionError }}>
        <Box mb={5} component="form" onSubmit={rhfHandleSubmit(handleValidRHFSubmit, handleInvalidRHFSubmit)} noValidate sx={{ '& > *': { mt: 3 } }}>
          {/* ... rest of JSX ... */}
          {hasAnyErrors && (
            <FormErrorMessage
              title={validationErrors.length > 0 ? 'Bitte überprüfen Sie Ihre Eingaben' : errorTitle}
              message={validationErrors.length === 0 ? submissionError : undefined}
              errors={validationErrors}
              onRetry={onRetry}
              showRetryButton={!!onRetry}
              showResetButton={false}
            />
          )}
          {submissionSuccess && ( <FormSuccessMessage title={successTitle} message={successMessage} resetForm={resetForm} resetButtonText={mode === 'create' ? "Neuen Eintrag erstellen" : "Zurück zum Formular"}/> )}
          {!submissionSuccess && (
            <>
              {children}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
              {mode === 'create' && (
                <Button
                  type="button"
                  variant="outlined"
                  color="inherit"
                  onClick={resetForm}
                  disabled={isSubmitting}
                >
                  {resetButtonText}
                </Button>
              )}
              {mode === 'edit' && onCancel && (
                <Button
                  type="button"
                  variant="outlined"
                  color="inherit"
                  onClick={onCancel}
                  disabled={isSubmitting}
                >
                  Abbrechen
                </Button>
              )}
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={isSubmitting}
                data-testid="submit-button"
                endIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
              >
                {isSubmitting ? 'Wird gesendet...' : submitButtonText}
              </Button>
            </Box>
          </>
        )}
        </Box>
      </FormErrorContext.Provider>
    </FormProvider>
  );
}