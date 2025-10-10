'use client';

import { useEffect, useCallback } from 'react';
import FormBase from '../shared/FormBase';
import { useZodForm } from '@/hooks/useZodForm';
import { groupEditFormSchema, GroupEditFormData } from '@/lib/validation/group';
import { GroupStatus, ResponsiblePerson as PrismaResponsiblePerson } from '@prisma/client';
import {
  GroupInfoSection,
  GroupLogoSection,
  ResponsiblePersonsSection,
  GroupStatusSection,
  GroupMeetingSection
} from './fields';

export interface InitialGroupData {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl?: string | null;
  metadata?: string | null;
  status: GroupStatus;
  responsiblePersons: PrismaResponsiblePerson[];
  regularMeeting?: string | null;
  meetingStreet?: string | null;
  meetingCity?: string | null;
  meetingPostalCode?: string | null;
  meetingLocationDetails?: string | null;
}

// Export for backward compatibility with admin pages
export type EditGroupFormInput = GroupEditFormData;

interface EditGroupFormProps {
  group: InitialGroupData;
  onSubmit: (
    data: GroupEditFormData,
    newLogoFile: File | Blob | null
  ) => Promise<void>;
  onCancel: () => void;
}

export default function EditGroupForm({ group, onSubmit, onCancel }: EditGroupFormProps) {
  const handleFormSubmit = useCallback(async (data: GroupEditFormData) => {
    const { logo, ...formFields } = data;
    await onSubmit(formFields as GroupEditFormData, logo || null);
  }, [onSubmit]);

  const form = useZodForm<GroupEditFormData>({
    schema: groupEditFormSchema,
    defaultValues: {
      name: group.name,
      description: group.description,
      status: group.status,
      responsiblePersons: group.responsiblePersons?.map(rp => ({
        firstName: rp.firstName,
        lastName: rp.lastName,
        email: rp.email
      })) || [{ firstName: '', lastName: '', email: '' }],
      logo: null,
      regularMeeting: group.regularMeeting || '',
      meetingStreet: group.meetingStreet || '',
      meetingCity: group.meetingCity || '',
      meetingPostalCode: group.meetingPostalCode || '',
      meetingLocationDetails: group.meetingLocationDetails || ''
    },
    onSubmit: handleFormSubmit,
    onError: (error: Error) => {
      console.error('Form submission error:', error);
    }
  });

  useEffect(() => {
    form.reset({
      name: group.name,
      description: group.description,
      status: group.status,
      responsiblePersons: group.responsiblePersons?.map(rp => ({
        firstName: rp.firstName,
        lastName: rp.lastName,
        email: rp.email
      })) || [{ firstName: '', lastName: '', email: '' }],
      logo: null,
      regularMeeting: group.regularMeeting || '',
      meetingStreet: group.meetingStreet || '',
      meetingCity: group.meetingCity || '',
      meetingPostalCode: group.meetingPostalCode || '',
      meetingLocationDetails: group.meetingLocationDetails || ''
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group.id, group.name, group.description, group.status, group.responsiblePersons, group.regularMeeting, group.meetingStreet, group.meetingCity, group.meetingPostalCode, group.meetingLocationDetails]);

  return (
    <FormBase
      form={form}
      submitButtonText="Änderungen speichern"
      mode="edit"
      onCancel={onCancel}
      successTitle="Gruppe erfolgreich aktualisiert!"
      successMessage="Die Änderungen wurden erfolgreich gespeichert."
    >
      <GroupInfoSection control={form.control} formState={form.formState} />
      <GroupLogoSection
        control={form.control}
        initialLogoUrl={group.logoUrl}
      />
      <GroupMeetingSection control={form.control} formState={form.formState} />
      <ResponsiblePersonsSection control={form.control} formState={form.formState} />
      <GroupStatusSection control={form.control} formState={form.formState} />
    </FormBase>
  );
}