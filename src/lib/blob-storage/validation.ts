/**
 * File validation for blob storage.
 * Uses centralized validation schemas from @/lib/validation/file-schemas
 */

import { FILE_TYPES, FILE_SIZE_LIMITS } from '@/lib/validation/file-schemas';
import { validationMessages } from '@/lib/validation/validation-messages';
import { FileUploadError } from '@/lib/errors';

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
    throw new FileUploadError(
      validationMessages.unsupportedFileType(),
      400,
      'INVALID_FILE_TYPE'
    );
  }

  // Check file size
  if (file.size > maxSize) {
    const maxSizeMB = maxSize / (1024 * 1024);
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
