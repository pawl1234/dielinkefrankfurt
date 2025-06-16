'use client';

import { ReactNode, RefObject } from 'react';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { FieldValues, UseFormReturn, FormProvider, SubmitHandler, FieldErrors } from 'react-hook-form';
import FormSuccessMessage from './FormSuccessMessage';
import { useFormSubmission } from '@/hooks/useFormSubmission';
import { FormValidationHelper } from './FormValidationHelper';

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
  files?: (File | Blob)[];
  children: ReactNode;
  onReset?: () => void;
  onCancel?: () => void;
  customValidations?: CustomValidationEntry[];
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
  files = [],
  children,
  onReset,
  onCancel,
  customValidations = [],
}: FormBaseProps<TFormValues>) {
  const { handleSubmit: rhfHandleSubmit, reset } = formMethods;

  const resetForm = () => {
    reset();
    if (onReset) onReset();
  };
  
  const { isSubmitting, submissionError, submissionSuccess, handleSubmit: executeActualSubmit } = useFormSubmission<TFormValues>({
    onSubmit: async (data) => {
      await onSubmit(data, files);
    },
    resetForm
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
      <Box mb={5} component="form" onSubmit={rhfHandleSubmit(handleValidRHFSubmit, handleInvalidRHFSubmit)} noValidate sx={{ '& > *': { mt: 3 } }}>
        {/* ... rest of JSX ... */}
        {submissionError && ( <Box sx={{ mb: 3, p:2, border: '1px solid', borderColor: 'error.main', borderRadius: 1, backgroundColor: 'error.lighter' }}> <Typography variant="subtitle1" color="error" component="div" fontWeight="bold"> Fehler beim Absenden des Formulars: </Typography> <Typography variant="body2" color="error">{submissionError}</Typography> </Box> )}
        {submissionSuccess && ( <FormSuccessMessage title={successTitle} message={successMessage} resetForm={resetForm} resetButtonText={mode === 'create' ? "Neuen Eintrag erstellen" : "Zurück zum Formular"}/> )}
        {!submissionSuccess && ( <> {children} <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}> {mode === 'create' && ( <Button type="button" variant="outlined" color="inherit" onClick={resetForm} disabled={isSubmitting}> {resetButtonText} </Button> )} {mode === 'edit' && onCancel && ( <Button type="button" variant="outlined" color="inherit" onClick={onCancel} disabled={isSubmitting}> Abbrechen </Button> )} <Button type="submit" variant="contained" color="primary" disabled={isSubmitting} endIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}> {isSubmitting ? 'Wird gesendet...' : submitButtonText} </Button> </Box> </> )}
      </Box>
    </FormProvider>
  );
}