'use client';

import { useCallback } from 'react';
import FormBase from '../shared/FormBase';
import { useZodForm } from '@/hooks/useZodForm';
import { statusReportSchema } from '@/lib/validation/status-report';
import { useDataFetch } from '@/lib/hooks/useDataFetch';
import { StatusReportSubmissionRequest, GroupsListResponse } from '@/types/api-types';
import { createFormData, submitForm } from '@/lib/form-submission';
import {
  GroupSelectSection,
  ReportContentSection,
  ReporterSection,
  FileUploadSection
} from './fields';

export type StatusReportFormInput = StatusReportSubmissionRequest;

export default function StatusReportForm() {
  const { data: groupsData, loading: loadingGroups } = useDataFetch<GroupsListResponse>('/api/groups');
  const groups = groupsData?.groups || [];

  const handleFormSubmit = useCallback(async (data: StatusReportSubmissionRequest): Promise<void> => {
    const { files, ...formFields } = data;
    const formData = createFormData(formFields, files);
    await submitForm('/api/status-reports/submit', formData, 'POST');
  }, []);

  const form = useZodForm<StatusReportSubmissionRequest>({
    schema: statusReportSchema,
    defaultValues: {
      groupId: '',
      title: '',
      content: '',
      reporterFirstName: '',
      reporterLastName: '',
      files: []
    },
    onSubmit: handleFormSubmit,
    onError: (error: Error) => {
      console.error('Form submission error:', error);
    }
  });

  return (
    <FormBase
      form={form}
      submitButtonText="Bericht einreichen"
      mode="create"
      successTitle="Bericht erfolgreich übermittelt!"
      successMessage="Ihr Statusbericht wurde erfolgreich an uns gesendet. Vielen Dank!"
      loading={loadingGroups}
    >
      <GroupSelectSection control={form.control} groups={groups} formState={form.formState} />
      <ReportContentSection control={form.control} formState={form.formState} />
      <ReporterSection control={form.control} formState={form.formState} />
      <FileUploadSection control={form.control} />
    </FormBase>
  );
}