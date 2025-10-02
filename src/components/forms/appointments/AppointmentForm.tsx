'use client';

import { useCallback } from 'react';
import { useWatch } from 'react-hook-form';
import FormBase from '../shared/FormBase';
import { useZodForm } from '@/hooks/useZodForm';
import { appointmentSubmitDataSchema, AppointmentSubmitData } from '@/lib/validation/appointment';
import { createAppointmentFormData, submitForm } from '@/lib/form-submission';
import {
  RequesterSection,
  DescriptionSection,
  CoverImageSection,
  FileAttachmentsSection,
  DateTimeSection,
  AddressSection
} from './fields';

interface AppointmentFormProps {
  initialValues?: {
    id?: number;
    title?: string;
    teaser?: string;
    mainText?: string;
    startDateTime?: string;
    endDateTime?: string | null;
    street?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    recurringText?: string | null;
    fileUrls?: string | null;
    featured?: boolean;
    metadata?: string | null;
  };
  mode?: 'create' | 'edit';
  submitButtonText?: string;
  onSubmit?: (data: AppointmentSubmitData) => Promise<void>;
  onCancel?: () => void;
}

export default function AppointmentForm({
  initialValues,
  mode = 'create',
  submitButtonText = 'Termin einreichen',
  onSubmit: customSubmit,
  onCancel
}: AppointmentFormProps) {

  // Helper to parse metadata
  const parseMetadata = (metadata: string | null) => {
    if (!metadata) return {};
    try {
      return JSON.parse(metadata);
    } catch {
      return {};
    }
  };

  const handleFormSubmit = useCallback(async (data: AppointmentSubmitData): Promise<void> => {
    if (customSubmit) {
      await customSubmit(data);
      return;
    }

    const { files, coverImage, croppedCoverImage, existingFileUrls, deletedFileUrls, ...formFields } = data;

    const formData = createAppointmentFormData(
      formFields,
      files,
      coverImage,
      croppedCoverImage,
      existingFileUrls,
      deletedFileUrls
    );

    const endpoint = mode === 'edit' && initialValues?.id
      ? `/api/appointments/submit/${initialValues.id}`
      : '/api/appointments/submit';
    const method = mode === 'edit' ? 'PUT' : 'POST';

    await submitForm(endpoint, formData, method);
  }, [mode, initialValues?.id, customSubmit]);

  const form = useZodForm<AppointmentSubmitData>({
    schema: appointmentSubmitDataSchema,
    defaultValues: {
      title: initialValues?.title || '',
      teaser: initialValues?.teaser || '',
      mainText: initialValues?.mainText || '',
      startDateTime: initialValues?.startDateTime || '',
      endDateTime: initialValues?.endDateTime || '',
      street: initialValues?.street || '',
      city: initialValues?.city || '',
      state: initialValues?.state || '',
      postalCode: initialValues?.postalCode || '',
      firstName: initialValues?.firstName || '',
      lastName: initialValues?.lastName || '',
      recurringText: initialValues?.recurringText || '',
      featured: initialValues?.featured || false,
      files: [],
      coverImage: null,
      croppedCoverImage: null,
      existingFileUrls: [],
      deletedFileUrls: []
    },
    onSubmit: handleFormSubmit,
    onError: (error: Error) => {
      console.error('Form submission error:', error);
    }
  });

  // Use useWatch for conditional rendering
  const isFeatured = useWatch({ control: form.control, name: 'featured' });

  // Parse metadata inline
  const metadata = parseMetadata(initialValues?.metadata || null);

  return (
    <FormBase
      form={form}
      submitButtonText={submitButtonText}
      mode={mode}
      onCancel={onCancel}
      successTitle={mode === 'create' ? "Vielen Dank für Ihre Terminanfrage!" : "Termin erfolgreich aktualisiert!"}
      successMessage={mode === 'create'
        ? "Ihr Termin wurde erfolgreich übermittelt. Wir werden Ihre Anfrage prüfen und Sie benachrichtigen."
        : "Die Änderungen wurden erfolgreich gespeichert."}
    >
      <RequesterSection control={form.control} formState={form.formState} />
      <DescriptionSection control={form.control} formState={form.formState} />
      {isFeatured && (
        <CoverImageSection
          control={form.control}
          formState={form.formState}
          initialCoverImageUrl={metadata.coverImageUrl}
        />
      )}
      <FileAttachmentsSection
        control={form.control}
        formState={form.formState}
        initialFileUrls={initialValues?.fileUrls}
      />
      <DateTimeSection
        control={form.control}
        formState={form.formState}
        initialRecurringText={initialValues?.recurringText}
      />
      <AddressSection control={form.control} formState={form.formState} />
    </FormBase>
  );
}