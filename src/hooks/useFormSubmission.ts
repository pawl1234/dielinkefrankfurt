'use client';

import { useState, useRef } from 'react';

interface UseFormSubmissionProps<T> {
  onSubmit: (data: T, files?: (File | Blob)[]) => Promise<void>;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  resetForm?: () => void;
  fieldRefs?: Record<string, React.RefObject<any>>;
}

interface FieldError {
  fieldName: string;
  message: string;
}

/**
 * Custom hook to handle form submissions with consistent state management
 * @returns Object with submission state and submit handler
 */
export function useFormSubmission<T>({
  onSubmit,
  onSuccess,
  onError,
  resetForm,
  fieldRefs = {}
}: UseFormSubmissionProps<T>) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldError[]>([]);

  // Function to scroll to a field with an error
  const scrollToField = (fieldName: string) => {
    const ref = fieldRefs[fieldName];
    if (ref && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return true;
    }
    return false;
  };

  // Helper function to detect field-specific errors
  const parseFieldError = (error: Error): FieldError | null => {
    // Check for common field patterns in error messages
    const fieldPatterns = [
      { regex: /name/i, field: 'name' },
      { regex: /(title|titel)/i, field: 'title' },
      { regex: /(beschreibung|description|content)/i, field: 'description' },
      { regex: /email/i, field: 'email' },
      { regex: /(first|vor)name/i, field: 'firstName' },
      { regex: /(last|nach)name/i, field: 'lastName' },
      { regex: /group/i, field: 'group' },
      { regex: /logo/i, field: 'logo' },
      { regex: /adresse/i, field: 'address' },
      { regex: /street/i, field: 'street' },
      { regex: /city/i, field: 'city' },
      { regex: /date/i, field: 'date' },
      { regex: /time/i, field: 'time' },
      { regex: /file/i, field: 'file' }
    ];

    for (const pattern of fieldPatterns) {
      if (pattern.regex.test(error.message)) {
        return {
          fieldName: pattern.field,
          message: error.message
        };
      }
    }

    return null;
  };

  const handleSubmit = async (data: T, files?: (File | Blob)[]) => {
    setIsSubmitting(true);
    setSubmissionError(null);
    setSubmissionSuccess(false);
    setFieldErrors([]);

    try {
      await onSubmit(data, files);
      
      setSubmissionSuccess(true);
      if (onSuccess) onSuccess();
      
      // Scroll to top of form to show success message
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Form submission error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten.';
      setSubmissionError(errorMessage);
      
      if (error instanceof Error) {
        // Try to detect field-specific errors
        const fieldError = parseFieldError(error);
        if (fieldError) {
          setFieldErrors([fieldError]);
          // Try to scroll to the field with error
          setTimeout(() => {
            if (!scrollToField(fieldError.fieldName)) {
              // If no field ref found, scroll to top to show the error message
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }, 100);
        } else {
          // If no specific field error detected, scroll to top
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        
        if (onError) onError(error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    submissionError,
    submissionSuccess,
    fieldErrors,
    setSubmissionError,
    setSubmissionSuccess,
    handleSubmit
  };
}