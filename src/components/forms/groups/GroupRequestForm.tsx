'use client';

import { useCallback } from 'react';
import FormBase from '../shared/FormBase';
import { useZodForm } from '@/hooks/useZodForm';
import { groupRequestFormSchema, GroupRequestFormData } from '@/lib/validation/group';
import { createGroupFormData, submitForm } from '@/lib/form-submission';
import {
  GroupInfoSection,
  GroupLogoSection,
  ResponsiblePersonsSection,
  GroupMeetingSection
} from './fields';

export default function GroupRequestForm() {
  const handleFormSubmit = useCallback(async (data: GroupRequestFormData): Promise<void> => {
    const { logo, ...formFields } = data;
    const formData = createGroupFormData(formFields, logo);
    await submitForm('/api/groups/submit', formData, 'POST');
  }, []);

  const form = useZodForm<GroupRequestFormData>({
    schema: groupRequestFormSchema,
    defaultValues: {
      name: '',
      description: '',
      responsiblePersons: [{ firstName: '', lastName: '', email: '' }],
      logo: undefined,
      regularMeeting: '',
      meetingStreet: '',
      meetingCity: '',
      meetingPostalCode: '',
      meetingLocationDetails: ''
    },
    onSubmit: handleFormSubmit,
    onError: (error: Error) => {
      console.error('Form submission error:', error);
    }
  });

  return (
    <FormBase
      form={form}
      submitButtonText="Gruppenvorschlag senden"
      mode="create"
      successTitle="Vielen Dank für Ihren Vorschlag!"
      successMessage="Ihre Anfrage für eine neue Arbeitsgruppe wurde erfolgreich übermittelt. Wir werden Ihren Vorschlag prüfen und Sie per E-Mail benachrichtigen, sobald die Gruppe freigeschaltet wurde."
    >
      <GroupInfoSection control={form.control} formState={form.formState} />
      <GroupLogoSection control={form.control} />
      <GroupMeetingSection control={form.control} formState={form.formState} />
      <ResponsiblePersonsSection control={form.control} formState={form.formState} />
    </FormBase>
  );
}