/**
 * Common file validation schemas for consistent file handling across the application.
 * Centralizes file size, type, and count validation rules.
 */

import { z } from 'zod';
import { validationMessages } from '../validation-messages';

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
 * Base file schema with size validation
 */
export const createFileSchema = (maxSize: number = FILE_SIZE_LIMITS.DEFAULT, fieldName: string = 'Datei') =>
  z.instanceof(File).refine(
    (file) => file.size <= maxSize,
    validationMessages.fileSizeExceeds(fieldName, Math.round(maxSize / (1024 * 1024)))
  );

/**
 * File schema with type validation
 */
export const createTypedFileSchema = (
  allowedTypes: string[] = FILE_TYPES.IMAGE_AND_PDF,
  maxSize: number = FILE_SIZE_LIMITS.DEFAULT,
  fieldName: string = 'Datei'
) =>
  createFileSchema(maxSize, fieldName).refine(
    (file) => allowedTypes.includes(file.type),
    validationMessages.unsupportedFileType(fieldName)
  );

/**
 * Multiple files schema with count limit
 */
export const createMultipleFilesSchema = (
  maxFiles: number = 5,
  maxSizePerFile: number = FILE_SIZE_LIMITS.DEFAULT,
  allowedTypes: string[] = FILE_TYPES.IMAGE_AND_PDF,
  fieldName: string = 'Dateien'
) =>
  z.array(createTypedFileSchema(allowedTypes, maxSizePerFile, fieldName))
    .max(maxFiles, validationMessages.tooManyFiles(fieldName, maxFiles))
    .optional();

/**
 * Common file schemas for reuse - lazy evaluation to prevent server crashes
 */

// Logo file schema (single image file, optional)
export const createLogoFileSchema = () => createTypedFileSchema(
  FILE_TYPES.IMAGE,
  FILE_SIZE_LIMITS.LOGO,
  'Logo'
).optional();

// Cover image schema (single image file, optional)
export const createCoverImageSchema = () => createTypedFileSchema(
  FILE_TYPES.IMAGE,
  FILE_SIZE_LIMITS.COVER_IMAGE,
  'Cover-Bild'
).optional();

// Attachment files schema (up to 5 files, images and PDFs)
export const createAttachmentFilesSchema = () => createMultipleFilesSchema(
  5,
  FILE_SIZE_LIMITS.ATTACHMENT,
  FILE_TYPES.IMAGE_AND_PDF,
  'Anhänge'
);

// Document files schema (up to 5 files, all document types)
export const createDocumentFilesSchema = () => createMultipleFilesSchema(
  5,
  FILE_SIZE_LIMITS.ATTACHMENT,
  FILE_TYPES.ALL,
  'Dokumente'
);

/**
 * Helper to validate files outside of Zod schemas
 * Useful for progressive validation in form handlers
 */
export function validateFiles(
  files: File[],
  maxFiles: number = 5,
  maxSizePerFile: number = FILE_SIZE_LIMITS.DEFAULT,
  allowedTypes: string[] = FILE_TYPES.IMAGE_AND_PDF
): { isValid: boolean; errors?: string[] } {
  const errors: string[] = [];

  if (files.length > maxFiles) {
    errors.push(validationMessages.tooManyFilesShort(maxFiles));
  }

  files.forEach((file, index) => {
    if (file.size > maxSizePerFile) {
      errors.push(`Datei ${index + 1} ${validationMessages.fileSizeExceedsShort('file')}`);
    }
    if (!allowedTypes.includes(file.type)) {
      errors.push(`Datei ${index + 1}: ${validationMessages.unsupportedFileTypeShort('file')}`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * TypeScript types for file validation results
 */
export type FileValidationResult = {
  isValid: boolean;
  errors?: string[];
};

export type ValidatedFile = File & {
  validatedSize: number;
  validatedType: string;
};