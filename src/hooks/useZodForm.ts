'use client';

import { useForm, UseFormProps, FieldValues, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useValidationErrors } from './useValidationErrors';
import { useFormSubmission } from './useFormSubmission';
import { CustomValidationEntry } from '@/types/form-types';

interface UseZodFormProps<TFormValues extends FieldValues>
  extends Omit<UseFormProps<TFormValues>, 'resolver'> {
  schema: z.ZodSchema<TFormValues>;
  onSubmit: (data: TFormValues) => Promise<void>;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  customValidations?: CustomValidationEntry[];
  fieldRefs?: Record<string, React.RefObject<HTMLElement>>;
}

interface UseZodFormReturn<TFormValues extends FieldValues> extends UseFormReturn<TFormValues> {
  validationErrors: Array<{ field: string; label: string; message: string }>;
  submissionError: string | null;
  hasValidationErrors: boolean;
  hasAnyErrors: boolean;
  isSubmitting: boolean;
  submissionSuccess: boolean;
  onSubmit: (data: TFormValues) => Promise<void>;
  setSubmissionError: (error: string | null) => void;
  setSubmissionSuccess: (success: boolean) => void;
}

/**
 * Enhanced React Hook Form hook with Zod validation integration.
 *
 * This hook combines React Hook Form with Zod schema validation to provide:
 * - Automatic TypeScript type inference from Zod schemas
 * - German localized error messages
 * - Integration with existing validation error handling
 * - Form submission state management
 * - Custom validation support for complex fields
 * - Consistent error scrolling behavior
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
 *     // Handle form submission
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
 * @param fieldRefs - Map of field references for automatic error scrolling
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
  fieldRefs = {},
  ...formProps
}: UseZodFormProps<TFormValues>): UseZodFormReturn<TFormValues> {

  // Initialize React Hook Form with Zod resolver
  const form = useForm<TFormValues>({
    ...formProps,
    resolver: zodResolver(schema as any) as any, // Type assertion needed due to Zod/RHF version compatibility
  });

  const {
    formState: { errors: formErrors, isSubmitted },
  } = form;

  // Initialize form submission handling
  const {
    isSubmitting,
    submissionError,
    submissionSuccess,
    setSubmissionError,
    setSubmissionSuccess,
    handleSubmit: handleSubmission
  } = useFormSubmission({
    onSubmit,
    onSuccess,
    onError,
    fieldRefs
  });

  // Integrate with existing validation error handling
  // The useValidationErrors hook already supports serverFieldErrors which will handle
  // Zod validation errors that come from the backend through the existing infrastructure
  const {
    validationErrors,
    hasValidationErrors,
    hasAnyErrors
  } = useValidationErrors({
    formErrors,
    customValidations,
    submissionError,
    serverFieldErrors: undefined, // Zod errors come through formErrors, server errors through submission
    isSubmitted
  });

  return {
    ...form,
    validationErrors,
    submissionError,
    hasValidationErrors,
    hasAnyErrors,
    isSubmitting,
    submissionSuccess,
    onSubmit: handleSubmission,
    setSubmissionError,
    setSubmissionSuccess
  };
}

export default useZodForm;