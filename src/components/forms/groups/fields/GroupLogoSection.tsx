'use client';

import { Controller, Control, FieldValues, Path } from 'react-hook-form';
import { Typography } from '@mui/material';
import ImageCropUpload from '../../shared/ImageCropUpload';
import FormSection from '../../shared/FormSection';
import { FILE_SIZE_LIMITS, FILE_TYPES } from '@/lib/validation/file-schemas';

interface GroupLogoSectionProps<TFormValues extends FieldValues> {
  control: Control<TFormValues>;
  logoFieldName?: Path<TFormValues>;
  initialLogoUrl?: string | null;
  required?: boolean;
}

export function GroupLogoSection<TFormValues extends FieldValues>({
  control,
  logoFieldName = "logo" as Path<TFormValues>,
  initialLogoUrl = null,
  required = false
}: GroupLogoSectionProps<TFormValues>) {
  const maxInputSizeMB = 20; 
  const maxOutputSizeMB = FILE_SIZE_LIMITS.LOGO / (1024 * 1024);

  const helpText = `Ein Logo hilft, Ihre Gruppe auf der Website leichter erkennbar zu machen. Laden Sie ein quadratisches Logo hoch für optimale Darstellung. Unterstützt werden JPEG, PNG und GIF Dateien. Das zugeschnittene Bild darf maximal ${maxOutputSizeMB}MB groß sein.`;

  return (
    <FormSection
      title={`Gruppenlogo ${required ? '' : '(optional)'}`}
      helpTitle="Logo hochladen"
      helpText={helpText}
    >
      <Controller
        control={control}
        name={logoFieldName}
        render={({ field: { onChange }, fieldState: { error } }) => (
          <>
            <ImageCropUpload
              maxInputFileSize={maxInputSizeMB * 1024 * 1024}
              maxOutputFileSize={FILE_SIZE_LIMITS.LOGO}
              allowedFileTypes={FILE_TYPES.IMAGE}
              aspectRatio={1}
              initialImageUrl={initialLogoUrl}
              initialCroppedImageUrl={initialLogoUrl}
              uploadLabel="Gruppen-Logo hochladen"
              uploadDescription={`JPEG, PNG, GIF (max. ${maxInputSizeMB}MB)`}
              croppedImageLabel="Zugeschnittenes Logo"
              aspectRatioText="Quadratisches Logo (1:1) für optimale Darstellung"
              onImageSelect={(originalFile: File | Blob | null, croppedFile: File | Blob | null) => {
                onChange(croppedFile);
              }}
            />
            {error && (
              <Typography variant="caption" color="error" display="block" sx={{ mt: 1 }}>
                {error.message}
              </Typography>
            )}
          </>
        )}
      />
      {initialLogoUrl && (
        <Typography variant="caption" display="block" sx={{ mt: 2 }}>
          Laden Sie ein neues Logo hoch, um das aktuelle zu ersetzen. Um das Logo zu entfernen,
          leeren Sie die Auswahl im Upload-Feld.
        </Typography>
      )}
    </FormSection>
  );
}