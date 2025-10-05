'use client';

import { ReactNode } from 'react';
import { Box } from '@mui/material';
import { FieldValues, FormProvider } from 'react-hook-form';
import FormSuccessMessage from './FormSuccessMessage';
import FormErrorMessage from './FormErrorMessage';
import FormButtons from './FormButtons';
import FormLoadingState from './FormLoadingState';
import { useZodForm } from '@/hooks/useZodForm';


export interface FormBaseProps<TFormValues extends FieldValues> {
  form: ReturnType<typeof useZodForm<TFormValues>>;
  submitButtonText?: string;
  resetButtonText?: string;
  mode?: 'create' | 'edit';
  successTitle?: string;
  successMessage?: string | ReactNode;
  children: ReactNode;
  onReset?: () => void;
  onCancel?: () => void;
  loading?: boolean;
  loadingMessage?: string;
}

/**
 * FormBase - Simplified form wrapper that works with useZodForm
 *
 * This component provides a standardized foundation for all forms, designed to work
 * seamlessly with useZodForm which handles validation, submission, and error state.
 *
 * @param form - useZodForm return object with validation and submission handling
 * @param submitButtonText - Submit button text
 * @param mode - Form mode ('create' | 'edit')
 * @param successTitle - Success message title
 * @param successMessage - Success message content
 * @param onReset - Optional reset handler
 * @param onCancel - Optional cancel handler (edit mode)
 * @param loading - Loading state
 * @param children - Form content
 */
export default function FormBase<TFormValues extends FieldValues>({
  form,
  submitButtonText = 'Absenden',
  resetButtonText = 'Zurücksetzen',
  mode = 'create',
  successTitle = 'Erfolgreich übermittelt!',
  successMessage = 'Ihre Daten wurden erfolgreich übermittelt.',
  children,
  onReset,
  onCancel,
  loading = false,
  loadingMessage = 'Lade Formular...',
}: FormBaseProps<TFormValues>) {
  const {
    handleSubmit: rhfHandleSubmit,
    reset,
    validationErrors,
    submissionError,
    isSubmitting,
    submissionSuccess,
    onSubmit: zodFormSubmit
  } = form;

  const resetForm = () => {
    reset();
    if (onReset) onReset();
  };


  if (loading) {
    return <FormLoadingState message={loadingMessage} />;
  }

  return (
    <FormProvider {...form}>
      <Box
        mb={5}
        component="form"
        onSubmit={rhfHandleSubmit(zodFormSubmit)}
        noValidate
        sx={{ '& > *': { mt: 3 } }}
      >
        {(validationErrors.length > 0 || submissionError) && (
          <FormErrorMessage
            title="Fehler beim Absenden des Formulars"
            message={submissionError}
            errors={validationErrors}
            showRetryButton={false}
            showResetButton={false}
          />
        )}

        {submissionSuccess && (
          <FormSuccessMessage
            title={successTitle}
            message={successMessage}
            resetForm={resetForm}
            resetButtonText={mode === 'create' ? "Neuen Eintrag erstellen" : "Zurück zum Formular"}
          />
        )}

        {!submissionSuccess && (
          <>
            {children}

            <FormButtons
              isSubmitting={isSubmitting}
              submitButtonText={submitButtonText}
              mode={mode}
              onCancel={onCancel}
              onReset={mode === 'create' ? resetForm : undefined}
              resetButtonText={resetButtonText}
            />
          </>
        )}
      </Box>
    </FormProvider>
  );
}