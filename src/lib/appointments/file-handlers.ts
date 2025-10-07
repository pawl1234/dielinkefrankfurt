import { uploadFiles, deleteFiles } from '@/lib/blob-storage';
import { FILE_TYPES, FILE_SIZE_LIMITS } from '@/lib/validation/file-schemas';
import { logger } from '@/lib/logger';
import { parseAppointmentMetadata, type AppointmentMetadata } from './metadata-utils';

const ALLOWED_ATTACHMENT_TYPES = FILE_TYPES.EMAIL_ATTACHMENT;

/**
 * Uploads regular file attachments for an appointment.
 *
 * @param files - Array of files to upload
 * @returns Promise resolving to array of uploaded file URLs
 */
export async function uploadAppointmentFiles(files: (File | Blob)[]): Promise<string[]> {
  if (files.length === 0) {
    return [];
  }

  const uploadResults = await uploadFiles(files, {
    category: 'appointments',
    allowedTypes: ALLOWED_ATTACHMENT_TYPES
  });

  return uploadResults.map(r => r.url);
}

/**
 * Uploads cover images for a featured appointment.
 *
 * @param coverImage - Main cover image file
 * @param croppedCoverImage - Cropped version of cover image (optional)
 * @returns Promise resolving to metadata object with cover image URLs
 */
export async function uploadCoverImages(
  coverImage: File,
  croppedCoverImage: File | null
): Promise<AppointmentMetadata> {
  const coverImagesToUpload = [coverImage, croppedCoverImage].filter((img): img is File => img !== null);

  const coverUploadResults = await uploadFiles(coverImagesToUpload, {
    category: 'appointments',
    allowedTypes: FILE_TYPES.IMAGE,
    maxSizePerFile: FILE_SIZE_LIMITS.COVER_IMAGE,
    prefix: 'cover'
  });

  return {
    coverImageUrl: coverUploadResults[0]?.url,
    croppedCoverImageUrl: coverUploadResults[1]?.url || null
  };
}

/**
 * Deletes old cover images when updating or removing featured status.
 *
 * @param metadata - Appointment metadata containing cover image URLs
 */
export async function deleteCoverImages(metadata: AppointmentMetadata): Promise<void> {
  const urlsToDelete: string[] = [];

  if (metadata.coverImageUrl) {
    urlsToDelete.push(metadata.coverImageUrl);
  }

  if (metadata.croppedCoverImageUrl) {
    urlsToDelete.push(metadata.croppedCoverImageUrl);
  }

  if (urlsToDelete.length > 0) {
    logger.info('Deleting cover images', {
      module: 'appointments/file-handlers',
      context: { urlsToDelete }
    });
    await deleteFiles(urlsToDelete);
  }
}

/**
 * Processes file uploads for appointment update.
 * Handles both new file uploads and preservation of existing files.
 *
 * @param formData - Form data containing file information
 * @returns Promise resolving to JSON string of file URLs
 */
export async function processFileUpdates(formData: FormData): Promise<string | null> {
  const fileCount = formData.get('fileCount');

  if (!fileCount || parseInt(fileCount as string) === 0) {
    // No new files, preserve existing files
    const existingFileUrls = formData.get('existingFileUrls');
    if (existingFileUrls && typeof existingFileUrls === 'string') {
      try {
        const existingFiles = JSON.parse(existingFileUrls);
        return JSON.stringify(existingFiles);
      } catch (e) {
        logger.warn('Error parsing existing file URLs', {
          module: 'appointments/file-handlers',
          context: { error: e }
        });
        return null;
      }
    }
    return null;
  }

  // Upload new files
  const count = parseInt(fileCount as string);
  const filesToUpload: File[] = [];

  for (let i = 0; i < count; i++) {
    const file = formData.get(`file-${i}`);
    if (file instanceof File) {
      filesToUpload.push(file);
    }
  }

  let uploadedUrls: string[] = [];
  if (filesToUpload.length > 0) {
    try {
      const uploadResults = await uploadFiles(filesToUpload, {
        category: 'appointments',
        allowedTypes: ALLOWED_ATTACHMENT_TYPES,
      });
      uploadedUrls = uploadResults.map(result => result.url);

      logger.debug('Files uploaded successfully', {
        module: 'appointments/file-handlers',
        context: { count: uploadedUrls.length }
      });
    } catch (uploadError) {
      logger.error('Error uploading files', {
        module: 'appointments/file-handlers',
        context: { error: uploadError }
      });
    }
  }

  // Get existing file URLs
  let existingFiles: string[] = [];
  const existingFileUrls = formData.get('existingFileUrls');
  if (existingFileUrls && typeof existingFileUrls === 'string') {
    try {
      existingFiles = JSON.parse(existingFileUrls);
    } catch (e) {
      logger.warn('Error parsing existing file URLs', {
        module: 'appointments/file-handlers',
        context: { error: e }
      });
    }
  }

  // Combine existing and new file URLs
  return JSON.stringify([...existingFiles, ...uploadedUrls]);
}

/**
 * Processes file deletions from form data.
 * Deletes files that were removed by the user.
 *
 * @param formData - Form data containing deleted file URLs
 */
export async function processFileDeletions(formData: FormData): Promise<void> {
  const deletedFileUrls = formData.get('deletedFileUrls');

  if (!deletedFileUrls || typeof deletedFileUrls !== 'string') {
    return;
  }

  try {
    const urlsToDelete = JSON.parse(deletedFileUrls);
    if (Array.isArray(urlsToDelete) && urlsToDelete.length > 0) {
      logger.info('Deleting removed attachment files', {
        module: 'appointments/file-handlers',
        context: { count: urlsToDelete.length, urlsToDelete }
      });
      await deleteFiles(urlsToDelete);
    }
  } catch (deleteError) {
    logger.error('Error deleting removed attachment files', {
      module: 'appointments/file-handlers',
      context: { error: deleteError }
    });
    // Continue with the update even if deletion fails
  }
}

/**
 * Processes cover image updates for featured appointments.
 * Handles upload of new cover images and deletion of old ones.
 *
 * @param formData - Form data containing cover image information
 * @param appointmentId - ID of the appointment being updated
 * @param existingMetadata - Current appointment metadata
 * @returns Promise resolving to updated metadata JSON string
 */
export async function processCoverImageUpdate(
  formData: FormData,
  appointmentId: number,
  existingMetadata: string | null
): Promise<string> {
  const featured = formData.get('featured') === 'true';
  const coverImage = formData.get('coverImage') as File | null;
  const croppedCoverImage = formData.get('croppedCoverImage') as File | null;

  // Parse existing metadata
  const metadata = parseAppointmentMetadata(existingMetadata);

  // If not featured anymore, delete cover images and clear metadata
  if (!featured) {
    try {
      await deleteCoverImages(metadata);
      return JSON.stringify({});
    } catch (error) {
      logger.error('Error removing cover images', {
        module: 'appointments/file-handlers',
        context: { error }
      });
      return JSON.stringify({});
    }
  }

  // If featured but no new cover image, keep existing metadata
  if (!coverImage) {
    return existingMetadata || JSON.stringify({});
  }

  try {
    // Upload new cover images
    const newCoverImages = await uploadCoverImages(coverImage, croppedCoverImage);

    // Delete old cover images if they exist
    try {
      await deleteCoverImages(metadata);
    } catch (deleteError) {
      logger.error('Error deleting old cover images', {
        module: 'appointments/file-handlers',
        context: { error: deleteError }
      });
      // Continue with the update even if deletion fails
    }

    // Update metadata with new cover image URLs
    return JSON.stringify({
      ...metadata,
      ...newCoverImages
    });
  } catch (uploadError) {
    logger.error('Error uploading cover image to Blob Store', {
      module: 'appointments/file-handlers',
      context: { error: uploadError }
    });
    // Return existing metadata on error
    return existingMetadata || JSON.stringify({});
  }
}

/**
 * Deletes all files associated with an appointment.
 * Includes both regular attachments and cover images.
 *
 * @param fileUrls - JSON string of regular file URLs
 * @param metadata - JSON string of appointment metadata
 */
export async function deleteAllAppointmentFiles(
  fileUrls: string | null,
  metadata: string | null
): Promise<void> {
  const filesToDelete: string[] = [];

  // Check for regular file attachments
  if (fileUrls) {
    try {
      const urls = JSON.parse(fileUrls);
      if (Array.isArray(urls)) {
        filesToDelete.push(...urls);
      }
    } catch (e) {
      logger.warn('Error parsing file URLs', {
        module: 'appointments/file-handlers',
        context: { error: e }
      });
    }
  }

  // Check for cover images in metadata
  if (metadata) {
    const parsedMetadata = parseAppointmentMetadata(metadata);
    if (parsedMetadata.coverImageUrl) {
      filesToDelete.push(parsedMetadata.coverImageUrl);
    }
    if (parsedMetadata.croppedCoverImageUrl) {
      filesToDelete.push(parsedMetadata.croppedCoverImageUrl);
    }
  }

  // Delete files from blob storage
  if (filesToDelete.length > 0) {
    try {
      logger.info('Deleting files from blob storage', {
        module: 'appointments/file-handlers',
        context: { count: filesToDelete.length }
      });
      await deleteFiles(filesToDelete);
    } catch (deleteError) {
      logger.error('Error deleting files from blob storage', {
        module: 'appointments/file-handlers',
        context: { error: deleteError }
      });
      // Continue even if file deletion fails
    }
  }
}
