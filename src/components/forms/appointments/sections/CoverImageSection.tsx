'use client';

import { Box } from '@mui/material';
import FormSection from '../../shared/FormSection';
import FieldError from '../../shared/FieldError';
import CoverImageUpload from '../../../upload/CoverImageUpload';
import { CustomValidationEntry } from '../../shared/FormBase';

interface CoverImageSectionProps {
  handleCoverImageSelect: (original: File | Blob | null, cropped: File | Blob | null) => void;
  initialCoverImageUrl?: string;
  coverImageRef: React.RefObject<HTMLDivElement>;
  helpText: React.ReactNode;
  customValidations: CustomValidationEntry[];
}

export default function CoverImageSection({
  handleCoverImageSelect,
  initialCoverImageUrl,
  coverImageRef,
  helpText,
  customValidations
}: CoverImageSectionProps) {
  return (
    <FormSection title="Cover-Bild für Newsletter" helpTitle="Cover-Bild hochladen" helpText={helpText}>
      <Box ref={coverImageRef}>
        <CoverImageUpload
          onImageSelect={handleCoverImageSelect}
          initialCoverImageUrl={initialCoverImageUrl}
        />
        <FieldError name="coverImage" mode="block" customValidations={customValidations} />
      </Box>
    </FormSection>
  );
}