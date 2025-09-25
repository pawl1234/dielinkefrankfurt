'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Controller } from 'react-hook-form';
import {
  Box,
  Typography,
  Select,
  MenuItem,
  CircularProgress
} from '@mui/material';
import RichTextEditor from '../../editor/RichTextEditor';
import FileUpload from '@/components/upload/FileUpload';
import { FILE_TYPES } from '@/lib/validation/file-schemas';
import FormSection from '../shared/FormSection';
import FormBase from '../shared/FormBase';
import ValidatedTextField from '../shared/ValidatedTextField';
import ValidatedController from '../shared/ValidatedController';
import { useZodForm } from '@/hooks/useZodForm';
import { statusReportSchema, STATUS_REPORT_LIMITS } from '@/lib/validation/status-report';

interface Group {
  id: string;
  name: string;
  slug: string;
}

interface FormInput {
  groupId: string;
  title: string;
  content: string;
  reporterFirstName: string;
  reporterLastName: string;
  files?: File[];
}

export type StatusReportFormInput = FormInput;

export default function StatusReportForm() {

  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);

  const form = useZodForm<FormInput>({
    schema: statusReportSchema,
    defaultValues: {
      groupId: '',
      title: '',
      content: '',
      reporterFirstName: '',
      reporterLastName: '',
      files: []
    },
    onSubmit: async (data: FormInput): Promise<void> => handleFormSubmit(data),
    onError: (error: Error) => {
      console.error('Form submission error:', error);
    }
  });

  const { control, watch, setError, clearErrors } = form;

  useEffect(() => {
    const fetchGroups = async () => {
      setLoadingGroups(true);
      try {
        const response = await fetch('/api/groups');
        if (response.ok) {
          const data = await response.json();
          if (data.success && Array.isArray(data.groups)) {
            setGroups(data.groups);
          }
        }
      } catch (error) {
        console.error('Error fetching groups:', error);
      } finally {
        setLoadingGroups(false);
      }
    };
    fetchGroups();
  }, []);


  const handleReset = useCallback(() => {
    clearErrors();
  }, [clearErrors]);

  const handleFormSubmit = useCallback(async (data: FormInput): Promise<void> => {
    const formData = new FormData();

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    if (data.files && data.files.length > 0) {
      data.files.forEach((file, index) => formData.append(`file-${index}`, file));
      formData.append('fileCount', data.files.length.toString());
    }

    const response = await fetch('/api/status-reports/submit', {
      method: 'POST',
      body: formData
    });

    if (response.status === 413) {
      setError('root', {
        type: 'server',
        message: 'Die hochgeladenen Dateien sind zu groß. Bitte reduzieren Sie die Dateigröße oder Anzahl der Anhänge.'
      });
      throw new Error('Dateien zu groß');
    }

    if (!response.ok) {
      let errorMessage = 'Ihr Bericht konnte nicht gesendet werden. Bitte versuchen Sie es später erneut.';

      try {
        const result = await response.json();

        if (result.fieldErrors && typeof result.fieldErrors === 'object') {
          Object.entries(result.fieldErrors).forEach(([field, message]) => {
            if (field in data) {
              setError(field as keyof FormInput, {
                type: 'server',
                message: message as string
              });
            }
          });

          const firstErrorField = Object.keys(result.fieldErrors)[0] as keyof FormInput;
          if (firstErrorField) {
            return;
          }
        }

        errorMessage = result.error || errorMessage;
      } catch (parseError) {
        if (response.status >= 500) {
          errorMessage = 'Ein Serverfehler ist aufgetreten.';
        } else if (response.status === 404) {
          errorMessage = 'Der angeforderte Endpunkt wurde nicht gefunden.';
        }
      }

      setError('root', {
        type: 'server',
        message: errorMessage
      });
      throw new Error(errorMessage);
    }

    await response.json();
    clearErrors();
  }, [setError, clearErrors]);


  // Help text constants
  const helpTextGroup = <Typography variant="body2"> Wählen Sie die Gruppe aus, für die Sie einen Bericht einreichen möchten. Nur aktive Gruppen können ausgewählt werden. </Typography>;
  const helpTextReportInfo = useMemo(() => (
    <>
      <Typography variant="body2">
        In diesem Abschnitt können Sie Ihren Bericht beschreiben:
      </Typography>
      <Box component="ul" sx={{ pl: 2, mt: 1 }}>
        <li>Der <strong>Titel</strong> sollte kurz und prägnant sein (max. {STATUS_REPORT_LIMITS.title.max} Zeichen).</li>
        <li>Der <strong>Inhalt</strong> kann Text, Listen und Links enthalten (max. {STATUS_REPORT_LIMITS.content.max} Zeichen).</li>
      </Box>
    </>
  ), []);
  const helpTextReporter = <Typography variant="body2"> Bitte geben Sie Ihre Kontaktdaten an. Diese Informationen werden nur intern verwendet und nicht veröffentlicht. </Typography>;
  const helpTextAttachments = useMemo(() => (
    <Typography variant="body2">
      Hier können Sie Anhänge wie Bilder oder PDFs hochladen, die mit Ihrem Bericht veröffentlicht werden sollen.
      Sie können maximal {STATUS_REPORT_LIMITS.files.maxCount} Dateien hochladen (jeweils max. {STATUS_REPORT_LIMITS.files.maxSizeMB}MB).
    </Typography>
  ), []);


  if (loadingGroups) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Lade Formular...</Typography>
      </Box>
    );
  }

  return (
    <FormBase
      formMethods={form}
      onSubmit={handleFormSubmit}
      submitButtonText="Bericht einreichen"
      mode="create"
      successTitle="Bericht erfolgreich übermittelt!"
      successMessage="Ihr Statusbericht wurde erfolgreich an uns gesendet. Vielen Dank!"
      onReset={handleReset}
    >
      <FormSection title="Gruppe auswählen" helpTitle="Gruppe auswählen" helpText={helpTextGroup}>
        <Box>
          <ValidatedController
            name="groupId"
            control={control}
            useFormControl
            formControlProps={{ fullWidth: true, disabled: loadingGroups }}
            render={({ field, fieldState: { error } }) => (
              <Select
                {...field}
                displayEmpty
                error={!!error && form.formState.isSubmitted}
              >
                <MenuItem value="" disabled>
                  {loadingGroups ? 'Gruppen werden geladen...' : 'Bitte wählen Sie eine Gruppe'}
                </MenuItem>
                {groups.map((group) => (
                  <MenuItem key={group.id} value={group.id}>
                    {group.name}
                  </MenuItem>
                ))}
              </Select>
            )}
          />
        </Box>
      </FormSection>

      <FormSection title="Berichtsinformationen" helpTitle="Details zum Bericht" helpText={helpTextReportInfo}>
        <Box sx={{ mb: 3 }}>
          <ValidatedTextField
            name="title"
            control={control as any}
            label="Titel"
            fullWidth
            placeholder="Titel des Berichts..."
            showCharacterCount
            helperText={`${watch('title')?.length || 0}/${STATUS_REPORT_LIMITS.title.max}`}
          />
        </Box>
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" component="label" sx={{ fontWeight: 600 }}>
            Inhalt
          </Typography>
          <Typography variant="body2" display="block" gutterBottom sx={{ mb: 2 }}>
            Beschreiben Sie die Aktivitäten, Erfolge oder Pläne Ihrer Gruppe.
          </Typography>

          <Controller
            control={control}
            name="content"
            render={({ field: { onChange, value } }) => (
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
          <ValidatedTextField
            name="reporterFirstName"
            control={control as any}
            label="Vorname"
            fullWidth
          />
          <ValidatedTextField
            name="reporterLastName"
            control={control as any}
            label="Nachname"
            fullWidth
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