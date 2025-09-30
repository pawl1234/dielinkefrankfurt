'use client';

import { useEffect } from 'react';
import FormBase from '../shared/FormBase';
import { useZodForm } from '@/hooks/useZodForm';
import { statusReportAdminSchema } from '@/lib/validation/status-report';
import { useDataFetch } from '@/lib/hooks/useDataFetch';
import {
  GroupsListResponse,
  StatusReportData,
  StatusReportAdminSubmission
} from '@/types/api-types';
import { EditStatusReportFormProps } from '@/types/form-types';
import {
  GroupSelectSection,
  ReportContentSection,
  StatusSection,
  ReporterSection,
  AdminFileSection
} from './fields';

export default function EditStatusReportForm({
  statusReport,
  onSubmit,
  onCancel
}: EditStatusReportFormProps) {
  const { data: groupsData, loading: loadingGroups } = useDataFetch<GroupsListResponse>('/api/groups');
  const groups = groupsData?.groups || [];



  const form = useZodForm<StatusReportAdminSubmission>({
    schema: statusReportAdminSchema,
    defaultValues: {
      groupId: statusReport.groupId,
      title: statusReport.title,
      content: statusReport.content,
      reporterFirstName: statusReport.reporterFirstName,
      reporterLastName: statusReport.reporterLastName,
      status: statusReport.status,
      files: [],
      existingFileUrls: []
    },
    onSubmit: onSubmit,
    onError: (error: Error) => {
      console.error('Form submission error:', error);
    }
  });

  useEffect(() => {
    if (statusReport.fileUrls) {
      try {
        const urls = JSON.parse(statusReport.fileUrls);
        const validUrls = Array.isArray(urls) ? urls : [];
        form.setValue('existingFileUrls', validUrls);
      } catch (err) {
        form.setValue('existingFileUrls', []);
      }
    }
  }, [statusReport.fileUrls, form]);

  return (
    <FormBase
      form={form}
      submitButtonText="Änderungen speichern"
      mode="edit"
      onCancel={onCancel}
      successTitle="Bericht erfolgreich aktualisiert!"
      successMessage="Die Änderungen wurden erfolgreich gespeichert."
      loading={loadingGroups}
    >
      <GroupSelectSection control={form.control} groups={groups} formState={form.formState} />
      <ReportContentSection control={form.control} formState={form.formState} />
      <StatusSection control={form.control} formState={form.formState} />
      <ReporterSection control={form.control} formState={form.formState} />
      <AdminFileSection
        control={form.control}
      />
    </FormBase>
  );
}