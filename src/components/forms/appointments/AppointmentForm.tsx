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

/**
 * AppointmentForm - Create mode only
 * For editing appointments, use EditAppointmentForm instead
 */
export default function AppointmentForm() {

  const handleFormSubmit = useCallback(async (data: AppointmentSubmitData): Promise<void> => {
    const { files, coverImage, croppedCoverImage, existingFileUrls, deletedFileUrls, ...formFields } = data;

    const formData = createAppointmentFormData(
      formFields,
      files,
      coverImage,
      croppedCoverImage,
      existingFileUrls,
      deletedFileUrls
    );

    await submitForm('/api/appointments/submit', formData, 'POST');
  }, []);

  const form = useZodForm<AppointmentSubmitData>({
    schema: appointmentSubmitDataSchema,
    defaultValues: {
      title: '',
      mainText: '',
      startDateTime: undefined,
      endDateTime: null,
      street: '',
      city: '',
      state: '',
      postalCode: '',
      firstName: '',
      lastName: '',
      recurringText: '',
      featured: false,
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

  return (
    <FormBase
      form={form}
      submitButtonText="Termin einreichen"
      mode="create"
      successTitle="Vielen Dank für Ihre Terminanfrage!"
      successMessage="Ihr Termin wurde erfolgreich übermittelt. Wir werden Ihre Anfrage prüfen und Sie benachrichtigen."
    >
      <RequesterSection control={form.control} formState={form.formState} />
      <DescriptionSection control={form.control} formState={form.formState} />
      {isFeatured && (
        <CoverImageSection
          control={form.control}
          formState={form.formState}
          initialCoverImageUrl={undefined}
          initialCroppedCoverImageUrl={undefined}
        />
      )}
      <FileAttachmentsSection
        control={form.control}
        formState={form.formState}
        initialFileUrls={undefined}
      />
      <DateTimeSection
        control={form.control}
        formState={form.formState}
        initialRecurringText={undefined}
      />
      <AddressSection control={form.control} formState={form.formState} />
    </FormBase>
  );
}