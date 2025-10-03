'use client';

import { useState, useEffect } from 'react';
import { Controller, Control, FormState, FieldValues, Path } from 'react-hook-form';
import { Box, Typography } from '@mui/material';
import FormSection from '../../shared/FormSection';
import FileUpload from '../../../upload/FileUpload';
import { FileThumbnailGrid, parseFileUrls } from '../../../ui/FileThumbnail';
import { FILE_TYPES, FILE_SIZE_LIMITS } from '@/lib/validation/file-schemas';

interface FileAttachmentsSectionProps<TFormValues extends FieldValues> {
  control: Control<TFormValues>;
  formState: FormState<TFormValues>;
  initialFileUrls?: string | null;
}

export function FileAttachmentsSection<TFormValues extends FieldValues>({
  control,
  formState,
  initialFileUrls
}: FileAttachmentsSectionProps<TFormValues>) {
  const [existingFileUrls, setExistingFileUrls] = useState<string[]>([]);

  useEffect(() => {
    if (initialFileUrls) {
      try {
        const urls = JSON.parse(initialFileUrls);
        setExistingFileUrls(Array.isArray(urls) ? urls : []);
      } catch (err) {
        console.error('Error parsing file URLs:', err);
      }
    }
  }, [initialFileUrls]);

  const helpText = "Hier können Sie Anhänge wie Flyer oder Plakate als Bild oder PDF hochladen (max. 5 Dateien, je max. 5MB).";

  const handleRemoveExistingFile = (fileUrl: string, onDeletedChange: (urls: string[]) => void, onExistingChange: (urls: string[]) => void, currentDeleted: string[], currentExisting: string[]) => {
    // Add to deleted list
    const updatedDeleted = [...currentDeleted, fileUrl];
    onDeletedChange(updatedDeleted);

    // Remove from existing list
    const updatedExisting = currentExisting.filter(url => url !== fileUrl);
    onExistingChange(updatedExisting);

    // Update local UI state
    setExistingFileUrls(updatedExisting);
  };

  return (
    <FormSection title="Datei Anhänge (optional)" helpTitle="Anhänge hochladen" helpText={helpText}>
      {/* New Files Upload */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
          Neue Dateien hochladen
        </Typography>
        <Controller
          control={control}
          name={"files" as Path<TFormValues>}
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <>
              <FileUpload
                files={value || []}
                onChange={onChange}
                maxFiles={5}
                maxFileSize={FILE_SIZE_LIMITS.ATTACHMENT}
                allowedMimeTypes={FILE_TYPES.IMAGE_AND_PDF}
              />
              {formState.isSubmitted && error && (
                <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                  {error.message}
                </Typography>
              )}
            </>
          )}
        />
      </Box>

      {/* Existing Files (Edit Mode) */}
      {existingFileUrls.length > 0 && (
        <Controller
          control={control}
          name={"deletedFileUrls" as Path<TFormValues>}
          render={({ field: { value: deletedValue, onChange: onDeletedChange } }) => (
            <Controller
              control={control}
              name={"existingFileUrls" as Path<TFormValues>}
              render={({ field: { value: existingValue, onChange: onExistingChange } }) => (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    Vorhandene Anhänge
                  </Typography>
                  <FileThumbnailGrid
                    files={parseFileUrls(JSON.stringify(existingFileUrls))}
                    gridSize={{ xs: 12, sm: 6, md: 4 }}
                    height={140}
                    showRemoveButton={true}
                    onRemove={(file) => {
                      if (file.url) {
                        handleRemoveExistingFile(
                          file.url,
                          onDeletedChange,
                          onExistingChange,
                          deletedValue || [],
                          existingValue || []
                        );
                      }
                    }}
                  />
                </Box>
              )}
            />
          )}
        />
      )}
    </FormSection>
  );
}