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
  fieldRefs: FieldRefMap; // Now explicitly non-optional
  fieldOrder: string[];  // Now explicitly non-optional
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
  serverFieldErrors?: Record<string, string>; // NEW: Server field errors
}

export default function FormBase<TFormValues extends FieldValues>({
  formMethods,
  onSubmit,
  fieldRefs, // Destructure non-optional prop
  fieldOrder, // Destructure non-optional prop
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
    if (customValidations.length > 0) {
      const firstInvalidCustom = customValidations.find(cv => !cv.isValid);
      if (firstInvalidCustom) {
        FormValidationHelper.scrollToFirstError(
          {}, customValidations, fieldRefs, fieldOrder || [] // Pass fieldOrder (guaranteed by props) or empty array as ultimate fallback
        );
        return;
      }
    }
    executeActualSubmit(data);
  };

  const handleInvalidRHFSubmit = (rhfValidationErrors: FieldErrors<TFormValues>) => {
    FormValidationHelper.scrollToFirstError(
      rhfValidationErrors, customValidations, fieldRefs, fieldOrder || [] // Pass fieldOrder or empty array
    );
  };

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