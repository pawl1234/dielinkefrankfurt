'use client';

import { Controller, Control, FormState, FieldValues, Path } from 'react-hook-form';
import { Box, Typography } from '@mui/material';
import FormSection from '../../shared/FormSection';
import ImageCropUpload from '../../shared/ImageCropUpload';
import { FILE_SIZE_LIMITS, FILE_TYPES } from '@/lib/validation/file-schemas';

interface CoverImageSectionProps<TFormValues extends FieldValues> {
  control: Control<TFormValues>;
  formState: FormState<TFormValues>;
  initialCoverImageUrl?: string;
  initialCroppedCoverImageUrl?: string;
}

export function CoverImageSection<TFormValues extends FieldValues>({
  control,
  formState,
  initialCoverImageUrl,
  initialCroppedCoverImageUrl
}: CoverImageSectionProps<TFormValues>) {
  const helpText = "Für einen Featured Termin muss stets ein Cover-Bild hochgeladen und zugeschnitten werden, damit die Darstellung im Newsletter gewährleistet wird.";

  return (
    <FormSection title="Cover-Bild für Newsletter" helpTitle="Cover-Bild hochladen" helpText={helpText}>
      {/*
        Nested Controllers are needed here because:
        - The component produces TWO values (original + cropped) from one user interaction
        - The form schema has TWO separate fields: coverImage and croppedCoverImage
        - Both images are uploaded separately to Vercel Blob storage
        This is a valid pattern when one UI component needs to update multiple form fields
      */}
      <Controller
        control={control}
        name={"croppedCoverImage" as Path<TFormValues>}
        render={({ field: { onChange: onCroppedImageChange }, fieldState: { error: croppedError } }) => (
          <Controller
            control={control}
            name={"coverImage" as Path<TFormValues>}
            render={({ field: { onChange: onOriginalImageChange }, fieldState: { error: coverError } }) => (
              <Box>
                <ImageCropUpload
                  aspectRatio={5/4}
                  maxInputFileSize={FILE_SIZE_LIMITS.COVER_IMAGE}
                  maxOutputFileSize={FILE_SIZE_LIMITS.COVER_IMAGE}
                  allowedFileTypes={FILE_TYPES.IMAGE}
                  initialImageUrl={initialCoverImageUrl}
                  initialCroppedImageUrl={initialCroppedCoverImageUrl}
                  uploadLabel="Cover-Bild hochladen (JPEG, PNG, max. 10MB)"
                  uploadDescription="JPEG, PNG"
                  croppedImageLabel="Zugeschnittenes Cover-Bild (5:4)"
                  aspectRatioText="Optimales Seitenverhältnis für den Newsletter ist 5:4"
                  onImageSelect={(original, cropped) => {
                    onOriginalImageChange(original);
                    onCroppedImageChange(cropped);
                  }}
                />
                {formState.isSubmitted && coverError && (
                  <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                    {coverError.message}
                  </Typography>
                )}
                {formState.isSubmitted && croppedError && (
                  <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                    {croppedError.message}
                  </Typography>
                )}
              </Box>
            )}
          />
        )}
      />
    </FormSection>
  );
}