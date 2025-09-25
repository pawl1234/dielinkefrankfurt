'use client';

import { useCallback } from 'react';
import { Controller } from 'react-hook-form';
import {
  Box,
  Typography,
  Select,
  MenuItem,
  TextField,
} from '@mui/material';
import RichTextEditor from '../../editor/RichTextEditor';
import FileUpload from '@/components/upload/FileUpload';
import { FILE_TYPES } from '@/lib/validation/file-schemas';
import FormSection from '../shared/FormSection';
import FormBase from '../shared/FormBase';
import { useZodForm } from '@/hooks/useZodForm';
import { statusReportSchema, STATUS_REPORT_LIMITS } from '@/lib/validation/status-report';
import { useDataFetch } from '@/lib/hooks/useDataFetch';
import { StatusReportSubmissionRequest, Group, GroupsListResponse } from '@/types/api-types';

export type StatusReportFormInput = StatusReportSubmissionRequest;

export default function StatusReportForm() {
  const { data: groupsData, loading: loadingGroups } = useDataFetch<GroupsListResponse>('/api/groups');
  const groups = groupsData?.groups || [];

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
    onSubmit: async (data: StatusReportSubmissionRequest): Promise<void> => handleFormSubmit(data),
    onError: (error: Error) => {
      console.error('Form submission error:', error);
    }
  });

  const { control, clearErrors } = form;

  const handleFormSubmit = useCallback(async (data: StatusReportSubmissionRequest): Promise<void> => {
  const formData = new FormData();
  
  formData.append('groupId', data.groupId);
  formData.append('title', data.title);
  formData.append('content', data.content);
  formData.append('reporterFirstName', data.reporterFirstName);
  formData.append('reporterLastName', data.reporterLastName);

  if (data.files) {
    data.files.forEach(file => formData.append('files', file));
  }

    const response = await fetch('/api/status-reports/submit', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error('Übermittlung fehlgeschlagen. Bitte versuchen Sie es erneut.');
    }

    await response.json();
    clearErrors();
  }, [clearErrors]);


  const helpTextGroup = `Wählen Sie die Gruppe aus, für die Sie einen Bericht einreichen möchten.`;
  const helpTextReportInfo = `In diesem Abschnitt können Sie Ihren Bericht beschreiben:
  • Der Titel sollte kurz und prägnant sein (max. ${STATUS_REPORT_LIMITS.title.max} Zeichen)
  • Der Inhalt kann Text, Listen und Links enthalten (max. ${STATUS_REPORT_LIMITS.content.max} Zeichen)`;
  const helpTextReporter = `Bitte geben Sie Ihre Kontaktdaten an. Diese Informationen werden nur intern verwendet und nicht veröffentlicht.`;
  const helpTextAttachments = `Hier können Sie Anhänge wie Bilder oder PDFs hochladen. Sie können maximal ${STATUS_REPORT_LIMITS.files.maxCount} Dateien hochladen (jeweils max. ${STATUS_REPORT_LIMITS.files.maxSizeMB}MB).`;


  return (
    <FormBase
      formMethods={form}
      onSubmit={handleFormSubmit}
      submitButtonText="Bericht einreichen"
      mode="create"
      successTitle="Bericht erfolgreich übermittelt!"
      successMessage="Ihr Statusbericht wurde erfolgreich an uns gesendet. Vielen Dank!"
      loading={loadingGroups}
    >
      <FormSection title="Gruppe auswählen" helpTitle="Gruppe auswählen" helpText={helpTextGroup}>
        <Controller
          control={control}
          name="groupId"
          render={({ field: { onChange, onBlur, value, name }, fieldState: { error } }) => (
            <Select
              onChange={onChange}
              onBlur={onBlur}
              value={value}
              name={name}
              fullWidth
              displayEmpty
              error={!!error && form.formState.isSubmitted}
            >
              <MenuItem value="">
                Bitte wählen Sie eine Gruppe
              </MenuItem>
              {groups.map((group) => (
                <MenuItem key={group.id} value={group.id}>
                  {group.name}
                </MenuItem>
              ))}
            </Select>
          )}
        />
      </FormSection>

      <FormSection title="Berichtsinformationen" helpTitle="Details zum Bericht" helpText={helpTextReportInfo}>
        <Box sx={{ mb: 3 }}>
          <Controller
            control={control}
            name="title"
            render={({ field: { onChange, onBlur, value, name }, fieldState: { error } }) => (
              <TextField
                onChange={onChange}
                onBlur={onBlur}
                value={value}
                name={name}
                label="Titel"
                fullWidth
                placeholder="Titel des Berichts..."
                error={!!error && form.formState.isSubmitted}
              />
            )}
          />
        </Box>
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1">
            Inhalt
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Beschreiben Sie die Aktivitäten, Erfolge oder Pläne Ihrer Gruppe.
          </Typography>

          <Controller
            control={control}
            name="content"
            render={({ field: { onChange, value }, fieldState: { error } }) => (
              <RichTextEditor
                value={value || ''}
                onChange={onChange}
                maxLength={STATUS_REPORT_LIMITS.content.max}
                placeholder="Inhalt des Berichts..."
              />
            )}
          />
        </Box>
      </FormSection>

      <FormSection title="Ansprechpartner" helpTitle="Kontaktdaten des Erstellers" helpText={helpTextReporter}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          <Controller
            control={control}
            name="reporterFirstName"
            render={({ field: { onChange, onBlur, value, name }, fieldState: { error } }) => (
              <TextField
                onChange={onChange}
                onBlur={onBlur}
                value={value}
                name={name}
                label="Vorname"
                fullWidth
                error={!!error && form.formState.isSubmitted}
              />
            )}
          />
          <Controller
            control={control}
            name="reporterLastName"
            render={({ field: { onChange, onBlur, value, name }, fieldState: { error } }) => (
              <TextField
                onChange={onChange}
                onBlur={onBlur}
                value={value}
                name={name}
                label="Nachname"
                fullWidth
                error={!!error && form.formState.isSubmitted}
              />
            )}
          />
        </Box>
      </FormSection>

      <FormSection title="Datei Anhänge (optional)" helpTitle="Zusätzliche Dateien" helpText={helpTextAttachments}>
        <Box sx={{ mb: 2 }}>
          <Controller
            control={control}
            name="files"
            render={({ field: { onChange, value }, fieldState: { error } }) => (
              <FileUpload
                files={value || []}
                onChange={onChange}
                error={error?.message}
                maxFiles={STATUS_REPORT_LIMITS.files.maxCount}
                maxFileSize={STATUS_REPORT_LIMITS.files.maxSizeMB * 1024 * 1024}
                allowedMimeTypes={FILE_TYPES.STATUS_REPORT}
              />
            )}
          />
        </Box>
      </FormSection>
    </FormBase>
  );
}