'use client';

import { Controller, Control, FieldValues, Path } from 'react-hook-form';
import { Typography } from '@mui/material';
import GroupLogoUpload from '../../../upload/GroupLogoUpload';
import FormSection from '../../shared/FormSection';
import { FILE_SIZE_LIMITS } from '@/lib/validation/file-schemas';

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
  const maxSizeMB = FILE_SIZE_LIMITS.LOGO / (1024 * 1024);

  const helpText = `Ein Logo hilft, Ihre Gruppe auf der Website leichter erkennbar zu machen. Laden Sie ein quadratisches Logo hoch für optimale Darstellung. Unterstützt werden JPEG, PNG und GIF Dateien. Das zugeschnittene Bild darf maximal ${maxSizeMB}MB groß sein.`;

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
            <GroupLogoUpload
              onImageSelect={(originalFile: File | Blob | null, croppedFile: File | Blob | null) => {
                onChange(croppedFile);
              }}
              initialImageUrl={initialLogoUrl}
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