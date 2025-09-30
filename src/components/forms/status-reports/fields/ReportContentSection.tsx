'use client';

import { Controller, Control, FormState, FieldValues, Path } from 'react-hook-form';
import { Box, Typography, TextField } from '@mui/material';
import RichTextEditor from '../../../editor/RichTextEditor';
import FormSection from '../../shared/FormSection';
import { STATUS_REPORT_LIMITS } from '@/lib/validation/status-report';

interface ReportContentSectionProps<TFormValues extends FieldValues> {
  control: Control<TFormValues>;
  formState: FormState<TFormValues>;
  titleFieldName?: Path<TFormValues>;
  contentFieldName?: Path<TFormValues>;
}

export function ReportContentSection<TFormValues extends FieldValues>({
  control,
  formState,
  titleFieldName = "title" as Path<TFormValues>,
  contentFieldName = "content" as Path<TFormValues>
}: ReportContentSectionProps<TFormValues>) {
  const helpText = `In diesem Abschnitt können Sie Ihren Bericht beschreiben:
  • Der Titel sollte kurz und prägnant sein (max. ${STATUS_REPORT_LIMITS.title.max} Zeichen)
  • Der Inhalt kann Text, Listen und Links enthalten (max. ${STATUS_REPORT_LIMITS.content.max} Zeichen)`;

  return (
    <FormSection title="Berichtsinformationen" helpTitle="Details zum Bericht" helpText={helpText}>
      <Box sx={{ mb: 3 }}>
        <Controller
          control={control}
          name={titleFieldName}
          render={({ field: { onChange, onBlur, value, name: fieldName }, fieldState: { error } }) => (
            <TextField
              onChange={onChange}
              onBlur={onBlur}
              value={value}
              name={fieldName}
              label="Titel"
              fullWidth
              placeholder="Titel des Berichts..."
              error={!!error && formState.isSubmitted}
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
          name={contentFieldName}
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
  );
}