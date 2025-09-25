'use client';

import { Box, Typography } from '@mui/material';
import FormSection from '../../shared/FormSection';
import FieldError from '../../shared/FieldError';
import FileUpload from '../../../upload/FileUpload';
import { FileThumbnailGrid, parseFileUrls } from '../../../ui/FileThumbnail';
import { CustomValidationEntry } from '../../shared/FormBase';

interface FileAttachmentsSectionProps {
  mode?: 'create' | 'edit';
  handleFileSelect: (files: (File | Blob)[]) => void;
  setFileUploadError: (error: string | null) => void;
  existingFileUrls: string[];
  setExistingFileUrls: React.Dispatch<React.SetStateAction<string[]>>;
  setDeletedFileUrls: React.Dispatch<React.SetStateAction<string[]>>;
  fileRef: React.RefObject<HTMLDivElement>;
  helpText: React.ReactNode;
  customValidations: CustomValidationEntry[];
}

export default function FileAttachmentsSection({
  mode = 'create',
  handleFileSelect,
  setFileUploadError,
  existingFileUrls,
  setExistingFileUrls,
  setDeletedFileUrls,
  fileRef,
  helpText,
  customValidations
}: FileAttachmentsSectionProps) {
  return (
    <FormSection title="Datei Anhänge (optional)" helpTitle="Anhänge hochladen" helpText={helpText}>
      <Box ref={fileRef} sx={{mb:2}}>
        <FileUpload onFilesSelect={handleFileSelect} maxFiles={5} onError={setFileUploadError} />
        <FieldError name="files" mode="block" customValidations={customValidations} />
      </Box>

      {mode === 'edit' && existingFileUrls.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Vorhandene Anhänge
          </Typography>
          <FileThumbnailGrid
            files={parseFileUrls(JSON.stringify(existingFileUrls))}
            gridSize={{ xs: 12, sm: 6, md: 4 }}
            height={140}
            showRemoveButton={true}
            onRemove={(file) => {
              if (file.url) {
                // Add URL to deletion list
                setDeletedFileUrls(prev => [...prev, file.url!]);
                // Remove from existing files list
                setExistingFileUrls(prev => prev.filter(url => url !== file.url));
              }
            }}
          />
        </Box>
      )}
    </FormSection>
  );
}