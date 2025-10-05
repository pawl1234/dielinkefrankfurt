/**
 * Common file validation schemas for consistent file handling across the application.
 * Centralizes file size, type, and count validation rules.
 */

import { z } from 'zod';
import { fileTypeFromBuffer } from 'file-type';
import { validationMessages } from './validation-messages';

/**
 * Common file size limits
 */
export const FILE_SIZE_LIMITS = {
  DEFAULT: 5 * 1024 * 1024, // 5MB
  LOGO: 5 * 1024 * 1024, // 5MB
  ATTACHMENT: 5 * 1024 * 1024, // 5MB
  COVER_IMAGE: 10 * 1024 * 1024, // 10MB
  ANTRAG: 5 * 1024 * 1024, // 5MB per file
  ANTRAG_TOTAL: 10 * 1024 * 1024, // 10MB total for all files
  ANTRAG_COUNT: 5 // Maximum 5 files
} as const;

/**
 * Common file type configurations
 */
export const FILE_TYPES = {
  IMAGE: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as string[],
  DOCUMENT: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'] as string[],
  IMAGE_AND_PDF: ['image/jpeg', 'image/png', 'application/pdf'] as string[],
  ALL: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'] as string[],
  // Context-specific file types
  ANTRAG: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'] as string[],
  EMAIL_ATTACHMENT: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'] as string[],
  STATUS_REPORT: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'] as string[]
};

/**
 * Secure single file schema with magic bytes validation
 * Validates file size, type (MIME), and actual file content using magic bytes
 *
 * @param maxSize - Maximum file size in bytes
 * @param allowedTypes - Array of allowed MIME types
 * @param fieldName - Field name for error messages
 * @returns Zod schema with async validation
 */
export const createSecureFileSchema = (
  maxSize: number = FILE_SIZE_LIMITS.DEFAULT,
  allowedTypes: string[] = FILE_TYPES.IMAGE_AND_PDF,
  fieldName: string = 'Datei'
) =>
  z.any()
    .refine(
      (file) => !file || file.size <= maxSize,
      { message: validationMessages.fileSizeExceeds(Math.round(maxSize / (1024 * 1024))) }
    )
    .refine(
      (file) => !file || allowedTypes.includes(file.type),
      { message: validationMessages.unsupportedFileType() }
    )
    .refine(
      async (file) => {
        if (!file) return true;
        try {
          const buffer = await file.arrayBuffer();
          const detectedType = await fileTypeFromBuffer(buffer);
          return detectedType && allowedTypes.includes(detectedType.mime);
        } catch {
          return false;
        }
      },
      { message: validationMessages.fileTypeMismatch(fieldName) }
    );

/**
 * Secure multiple files schema with magic bytes validation
 * Use this for forms that need enhanced security validation
 *
 * @param maxFiles - Maximum number of files allowed
 * @param maxSizePerFile - Maximum size per file in bytes
 * @param allowedTypes - Array of allowed MIME types
 * @param fieldName - Field name for error messages
 * @returns Zod schema with async validation
 */
export const createSecureFilesSchema = (
  maxFiles: number = 5,
  maxSizePerFile: number = FILE_SIZE_LIMITS.DEFAULT,
  allowedTypes: string[] = FILE_TYPES.IMAGE_AND_PDF,
  fieldName: string = 'files'
) =>
  z.array(createSecureFileSchema(maxSizePerFile, allowedTypes, fieldName))
    .max(maxFiles, validationMessages.tooManyFiles(maxFiles))
    .optional();

