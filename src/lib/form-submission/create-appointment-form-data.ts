/**
 * Creates FormData for appointment submission with files and cover images
 */
export function createAppointmentFormData<T extends Record<string, unknown>>(
  data: T,
  files?: (File | Blob)[],
  coverImage?: File | Blob | null,
  croppedCoverImage?: File | Blob | null,
  existingFileUrls?: string[],
  deletedFileUrls?: string[]
): FormData {
  console.log('[FormData] Creating FormData for appointment submission', {
    hasFiles: !!files && files.length > 0,
    fileCount: files?.length || 0,
    hasCoverImage: !!coverImage,
    hasCroppedCoverImage: !!croppedCoverImage,
    coverImageSize: coverImage ? `${(coverImage.size / (1024 * 1024)).toFixed(2)}MB` : 'N/A',
    croppedCoverImageSize: croppedCoverImage ? `${(croppedCoverImage.size / (1024 * 1024)).toFixed(2)}MB` : 'N/A'
  });

  try {
    const formData = new FormData();

    Object.entries(data).forEach(([key, value]) => {
      if (value === null || value === undefined) return;

      // Skip file-related fields that are handled separately
      if (['files', 'coverImage', 'croppedCoverImage', 'existingFileUrls', 'deletedFileUrls'].includes(key)) {
        return;
      }

      if (value instanceof Date) {
        formData.append(key, value.toISOString());
      } else if (typeof value === 'boolean') {
        formData.append(key, value.toString());
      } else if (typeof value === 'string' || typeof value === 'number') {
        formData.append(key, String(value));
      }
    });

    // Handle file attachments
    if (files && files.length > 0) {
      files.forEach(file => formData.append('files', file));
    }

    // Handle cover images for featured appointments
    if (coverImage) {
      formData.append('coverImage', coverImage);
    }
    if (croppedCoverImage) {
      formData.append('croppedCoverImage', croppedCoverImage);
    }

    // Handle existing and deleted files (edit mode)
    if (existingFileUrls && existingFileUrls.length > 0) {
      formData.append('existingFileUrls', JSON.stringify(existingFileUrls));
    }
    if (deletedFileUrls && deletedFileUrls.length > 0) {
      formData.append('deletedFileUrls', JSON.stringify(deletedFileUrls));
    }

    console.log('[FormData] FormData created successfully');
    return formData;
  } catch (error) {
    console.error('[FormData] Error creating FormData:', error);
    throw error;
  }
}