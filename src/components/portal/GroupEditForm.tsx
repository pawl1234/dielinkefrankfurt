'use client';

import { useEffect, useCallback } from 'react';
import FormBase from '../forms/shared/FormBase';
import { useZodForm } from '@/hooks/useZodForm';
import { ResponsiblePerson as PrismaResponsiblePerson } from '@prisma/client';
import { rrulesToPatterns } from '@/lib/groups/recurring-patterns';
import { z } from 'zod';
import {
  createNameSchema,
  createDescriptionSchema,
  createResponsiblePersonsSchema
} from '@/lib/validation/schemas';
import { FILE_SIZE_LIMITS, FILE_TYPES, createSecureFileSchema } from '@/lib/validation/file-schemas';
import { recurringMeetingDataSchema } from '@/lib/validation/group';
import {
  GroupInfoSection,
  GroupLogoSection,
  ResponsiblePersonsSection,
  GroupMeetingSection
} from '../forms/groups/fields';

/**
 * Portal-specific group edit form schema (without status field)
 * Responsible persons can edit all group details except status/delete/archive
 */
const portalGroupEditFormSchema = z.object({
  name: createNameSchema(3, 100, 'name'),
  description: createDescriptionSchema(50, 5000, 'description'),
  responsiblePersons: createResponsiblePersonsSchema(1, 'responsiblePersons'),
  logo: createSecureFileSchema(
    FILE_SIZE_LIMITS.LOGO,
    FILE_TYPES.IMAGE,
    'Logo'
  ).nullable().optional(),
  regularMeeting: z
    .string()
    .max(500, 'Regelmäßiges Treffen darf maximal 500 Zeichen lang sein')
    .trim()
    .optional(),
  recurringMeeting: recurringMeetingDataSchema.optional(),
  meetingStreet: z
    .string()
    .max(200, 'Straße darf maximal 200 Zeichen lang sein')
    .trim()
    .optional(),
  meetingCity: z
    .string()
    .max(100, 'Stadt darf maximal 100 Zeichen lang sein')
    .trim()
    .optional(),
  meetingPostalCode: z
    .string()
    .max(5, 'Postleitzahl darf maximal 5 Zeichen lang sein')
    .regex(/^\d{5}$/, 'Postleitzahl muss 5 Ziffern enthalten')
    .trim()
    .optional()
    .or(z.literal('')),
  meetingLocationDetails: z
    .string()
    .max(1000, 'Ortsdetails dürfen maximal 1000 Zeichen lang sein')
    .trim()
    .optional()
});

export type PortalGroupEditFormData = z.infer<typeof portalGroupEditFormSchema>;

export interface InitialGroupData {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl?: string | null;
  metadata?: string | null;
  responsiblePersons: PrismaResponsiblePerson[];
  recurringPatterns?: string | null;
  meetingTime?: string | null;
  meetingStreet?: string | null;
  meetingCity?: string | null;
  meetingPostalCode?: string | null;
  meetingLocationDetails?: string | null;
}

interface GroupEditFormProps {
  group: InitialGroupData;
  onSubmit: (
    data: PortalGroupEditFormData,
    newLogoFile: File | Blob | null
  ) => Promise<void>;
  onCancel: () => void;
}

/**
 * Portal group edit form for responsible persons.
 * Similar to admin EditGroupForm but without status management.
 */
export default function GroupEditForm({ group, onSubmit, onCancel }: GroupEditFormProps) {
  const handleFormSubmit = useCallback(async (data: PortalGroupEditFormData) => {
    const { logo, ...formFields } = data;
    await onSubmit(formFields as PortalGroupEditFormData, logo || null);
  }, [onSubmit]);

  /**
   * Convert rrule strings back to PatternConfig for editing
   */
  const convertRecurringPatternsToFormData = () => {
    if (!group.recurringPatterns) {
      return { patterns: [], time: undefined, hasNoMeeting: false };
    }

    try {
      const rruleStrings: string[] = JSON.parse(group.recurringPatterns);
      if (rruleStrings.length === 0) {
        return { patterns: [], time: undefined, hasNoMeeting: true };
      }

      const patterns = rrulesToPatterns(rruleStrings);
      return {
        patterns,
        time: group.meetingTime || undefined,
        hasNoMeeting: false
      };
    } catch (_error) {
      return { patterns: [], time: undefined, hasNoMeeting: false };
    }
  };

  const form = useZodForm<PortalGroupEditFormData>({
    schema: portalGroupEditFormSchema,
    defaultValues: {
      name: group.name,
      description: group.description,
      responsiblePersons: group.responsiblePersons?.map(rp => ({
        firstName: rp.firstName,
        lastName: rp.lastName,
        email: rp.email
      })) || [{ firstName: '', lastName: '', email: '' }],
      logo: null,
      recurringMeeting: convertRecurringPatternsToFormData(),
      meetingStreet: group.meetingStreet || '',
      meetingCity: group.meetingCity || '',
      meetingPostalCode: group.meetingPostalCode || '',
      meetingLocationDetails: group.meetingLocationDetails || ''
    },
    onSubmit: handleFormSubmit,
    onError: () => {
      // Error will be displayed by FormBase
      // No logging needed here as errors are handled by the form
    }
  });

  useEffect(() => {
    form.reset({
      name: group.name,
      description: group.description,
      responsiblePersons: group.responsiblePersons?.map(rp => ({
        firstName: rp.firstName,
        lastName: rp.lastName,
        email: rp.email
      })) || [{ firstName: '', lastName: '', email: '' }],
      logo: null,
      recurringMeeting: convertRecurringPatternsToFormData(),
      meetingStreet: group.meetingStreet || '',
      meetingCity: group.meetingCity || '',
      meetingPostalCode: group.meetingPostalCode || '',
      meetingLocationDetails: group.meetingLocationDetails || ''
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group.id, group.name, group.description, group.responsiblePersons, group.recurringPatterns, group.meetingTime, group.meetingStreet, group.meetingCity, group.meetingPostalCode, group.meetingLocationDetails]);

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
      {/* Note: GroupStatusSection is intentionally omitted for portal users */}
    </FormBase>
  );
}
