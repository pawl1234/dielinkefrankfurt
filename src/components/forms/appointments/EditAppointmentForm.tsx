'use client';

import { useEffect } from 'react';
import { useWatch } from 'react-hook-form';
import FormBase from '../shared/FormBase';
import { useZodForm } from '@/hooks/useZodForm';
import { appointmentSubmitDataSchema, AppointmentSubmitData } from '@/lib/validation/appointment';
import { EditAppointmentFormProps } from '@/types/form-types';
import {
  RequesterSection,
  DescriptionSection,
  CoverImageSection,
  FileAttachmentsSection,
  DateTimeSection,
  AddressSection
} from './fields';

export default function EditAppointmentForm({
  appointment,
  onSubmit,
  onCancel
}: EditAppointmentFormProps) {

  // Parse metadata for initial values
  const parseMetadata = (metadata: string | null | undefined) => {
    if (!metadata) return {};
    try {
      return JSON.parse(metadata);
    } catch {
      return {};
    }
  };

  const metadata = parseMetadata(appointment.metadata);

  const form = useZodForm<AppointmentSubmitData>({
    schema: appointmentSubmitDataSchema,
    defaultValues: {
      title: appointment.title,
      mainText: appointment.mainText,
      startDateTime: new Date(appointment.startDateTime),
      endDateTime: appointment.endDateTime ? new Date(appointment.endDateTime) : null,
      street: appointment.street || '',
      city: appointment.city || '',
      locationDetails: appointment.locationDetails || '',
      postalCode: appointment.postalCode || '',
      firstName: appointment.firstName || '',
      lastName: appointment.lastName || '',
      recurringText: appointment.recurringText || '',
      featured: appointment.featured,
      files: [],
      coverImage: null,
      croppedCoverImage: null,
      existingFileUrls: [],
      deletedFileUrls: []
    },
    onSubmit: onSubmit,
    onError: (error: Error) => {
      console.error('Form submission error:', error);
    }
  });

  // Initialize existing file URLs
  useEffect(() => {
    if (appointment.fileUrls) {
      try {
        const urls = JSON.parse(appointment.fileUrls);
        form.setValue('existingFileUrls', Array.isArray(urls) ? urls : []);
      } catch {
        form.setValue('existingFileUrls', []);
      }
    }
  }, [appointment.fileUrls, form]);

  // Use useWatch for conditional rendering
  const isFeatured = useWatch({ control: form.control, name: 'featured' });

  return (
    <FormBase
      form={form}
      submitButtonText="Änderungen speichern"
      mode="edit"
      onCancel={onCancel}
      successTitle="Termin erfolgreich aktualisiert!"
      successMessage="Die Änderungen wurden erfolgreich gespeichert."
    >
      <RequesterSection control={form.control} formState={form.formState} />
      <DescriptionSection control={form.control} formState={form.formState} />
      {isFeatured && (
        <CoverImageSection
          control={form.control}
          formState={form.formState}
          initialCoverImageUrl={metadata.coverImageUrl}
          initialCroppedCoverImageUrl={metadata.croppedCoverImageUrl}
        />
      )}
      <FileAttachmentsSection
        control={form.control}
        formState={form.formState}
        initialFileUrls={appointment.fileUrls}
      />
      <DateTimeSection
        control={form.control}
        formState={form.formState}
        initialRecurringText={appointment.recurringText}
      />
      <AddressSection
        control={form.control}
        formState={form.formState}
        setValue={form.setValue}
      />
    </FormBase>
  );
}
