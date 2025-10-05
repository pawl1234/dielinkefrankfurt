/**
 * File validation for blob storage.
 * Uses centralized validation schemas from @/lib/validation/file-schemas
 */

import { FILE_TYPES, FILE_SIZE_LIMITS } from '@/lib/validation/file-schemas';
import { validationMessages } from '@/lib/validation/validation-messages';
import { FileUploadError } from '@/lib/errors';
import { logger } from '@/lib/logger';

/**
 * Validates a single file based on specified constraints
 *
 * @param file - File or Blob to validate
 * @param allowedTypes - Array of allowed MIME types (defaults to FILE_TYPES.ALL)
 * @param maxSize - Maximum file size in bytes (defaults to FILE_SIZE_LIMITS.DEFAULT)
 * @throws FileUploadError if validation fails
 */
export function validateFile(
  file: File | Blob,
  allowedTypes: string[] = FILE_TYPES.ALL,
  maxSize: number = FILE_SIZE_LIMITS.DEFAULT
): void {
  // Check if file exists
  if (!file) {
    throw new FileUploadError(
      validationMessages.required('file'),
      400,
      'INVALID_FILE'
    );
  }

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    const fileName = file instanceof File ? file.name : 'unknown';

    logger.error('File type validation failed', {
      module: 'blob-storage',
      context: {
        fileName,
        fileType: file.type,
        allowedTypes: allowedTypes.join(', ')
      },
      tags: ['file-upload', 'validation', 'invalid-type']
    });

    throw new FileUploadError(
      validationMessages.unsupportedFileType(),
      400,
      'INVALID_FILE_TYPE'
    );
  }

  // Check file size
  if (file.size > maxSize) {
    const maxSizeMB = maxSize / (1024 * 1024);
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    const fileName = file instanceof File ? file.name : 'unknown';

    logger.error('File size validation failed', {
      module: 'blob-storage',
      context: {
        fileName,
        fileSize: fileSizeMB + 'MB',
        maxSize: maxSizeMB + 'MB',
        fileType: file.type
      },
      tags: ['file-upload', 'validation', 'size-exceeded']
    });

    throw new FileUploadError(
      validationMessages.fileSizeExceeds(maxSizeMB),
      400,
      'FILE_TOO_LARGE'
    );
  }
}

/**
 * Validates multiple files
 * HELPER: Validates array of files
 *
 * @param files - Array of files to validate
 * @param allowedTypes - Array of allowed MIME types
 * @param maxSize - Maximum file size in bytes per file
 * @throws FileUploadError if any file validation fails
 */
export function validateFiles(
  files: (File | Blob)[],
  allowedTypes: string[] = FILE_TYPES.ALL,
  maxSize: number = FILE_SIZE_LIMITS.DEFAULT
): void {
  for (const file of files) {
    validateFile(file, allowedTypes, maxSize);
  }
}
