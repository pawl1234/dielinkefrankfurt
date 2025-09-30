'use client';

import { Controller, Control, FieldValues, Path } from 'react-hook-form';
import { Box, Typography } from '@mui/material';
import FileUpload from '@/components/upload/FileUpload';
import FormSection from '../../shared/FormSection';
import { FILE_TYPES } from '@/lib/validation/file-schemas';
import { STATUS_REPORT_LIMITS } from '@/lib/validation/status-report';
import { FileThumbnailGrid, parseFileUrls } from '@/components/ui/FileThumbnail';

interface FileUploadSectionProps<TFormValues extends FieldValues> {
  control: Control<TFormValues>;
  maxFiles?: number;
  name?: Path<TFormValues>;
}

export function FileUploadSection<TFormValues extends FieldValues>({
  control,
  maxFiles = STATUS_REPORT_LIMITS.files.maxCount,
  name = "files" as Path<TFormValues>
}: FileUploadSectionProps<TFormValues>) {
  const helpText = `Hier können Sie Anhänge wie Bilder oder PDFs hochladen. Sie können maximal ${maxFiles} Dateien hochladen (jeweils max. ${STATUS_REPORT_LIMITS.files.maxSizeMB}MB).`;

  return (
    <FormSection title="Datei Anhänge (optional)" helpTitle="Zusätzliche Dateien" helpText={helpText}>
      <Box sx={{ mb: 2 }}>
        <Controller
          control={control}
          name={name}
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <FileUpload
              files={value || []}
              onChange={onChange}
              error={error?.message}
              maxFiles={maxFiles}
              maxFileSize={STATUS_REPORT_LIMITS.files.maxSizeMB * 1024 * 1024}
              allowedMimeTypes={FILE_TYPES.STATUS_REPORT}
            />
          )}
        />
      </Box>
    </FormSection>
  );
}

interface AdminFileSectionProps<TFormValues extends FieldValues> {
  control: Control<TFormValues>;
  existingFilesFieldName?: Path<TFormValues>;
  newFilesFieldName?: Path<TFormValues>;
}

export function AdminFileSection<TFormValues extends FieldValues>({
  control,
  existingFilesFieldName = "existingFileUrls" as Path<TFormValues>,
  newFilesFieldName = "files" as Path<TFormValues>
}: AdminFileSectionProps<TFormValues>) {
  const maxFiles = STATUS_REPORT_LIMITS.files.maxCount;
  const helpText = `Verwalten Sie bestehende und neue Anhänge. Sie können maximal ${maxFiles} Dateien haben (jeweils max. ${STATUS_REPORT_LIMITS.files.maxSizeMB}MB).`;

  return (
    <FormSection title="Datei Anhänge" helpTitle="Dateiverwaltung" helpText={helpText}>
      {/* Existing files */}
      <Controller
        control={control}
        name={existingFilesFieldName}
        render={({ field: { value: existingFiles, onChange: onExistingChange } }) => {
          if (!existingFiles || existingFiles.length === 0) return <></>;

          return (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Vorhandene Dateien ({existingFiles.length})
              </Typography>
              <FileThumbnailGrid
                files={parseFileUrls(JSON.stringify(existingFiles))}
                gridSize={{ xs: 12, sm: 6, md: 4 }}
                height={140}
                showRemoveButton={true}
                onRemove={(file: { url?: string }) => {
                  if (file.url) {
                    const updatedFiles = existingFiles.filter((url: string) => url !== file.url);
                    onExistingChange(updatedFiles);
                  }
                }}
              />
            </Box>
          );
        }}
      />

      {/* New file upload */}
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Neue Dateien hinzufügen
        </Typography>
        <Controller
          control={control}
          name={newFilesFieldName}
          render={({ field: { onChange, value: newFiles }, fieldState: { error } }) => {
            // Get existing files count for max files calculation
            const existingCount = control._formValues?.existingFileUrls?.length || 0;
            return (
              <FileUpload
                files={newFiles || []}
                onChange={onChange}
                error={error?.message}
                maxFiles={maxFiles - existingCount}
                maxFileSize={STATUS_REPORT_LIMITS.files.maxSizeMB * 1024 * 1024}
                allowedMimeTypes={FILE_TYPES.STATUS_REPORT}
              />
            );
          }}
        />
      </Box>
    </FormSection>
  );
}