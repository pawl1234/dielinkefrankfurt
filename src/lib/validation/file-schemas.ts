/**
 * Common file validation schemas for consistent file handling across the application.
 * Centralizes file size, type, and count validation rules.
 */

import { z } from 'zod';

/**
 * Common file size limits
 */
export const FILE_SIZE_LIMITS = {
  DEFAULT: 5 * 1024 * 1024, // 5MB
  LOGO: 5 * 1024 * 1024, // 5MB
  ATTACHMENT: 5 * 1024 * 1024, // 5MB
  COVER_IMAGE: 10 * 1024 * 1024 // 10MB
} as const;

/**
 * Common file type configurations
 */
export const FILE_TYPES = {
  IMAGE: ['image/jpeg', 'image/png', 'image/webp'],
  DOCUMENT: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  IMAGE_AND_PDF: ['image/jpeg', 'image/png', 'application/pdf'],
  ALL: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
} as const;

/**
 * Base file schema with size validation
 */
export const createFileSchema = (maxSize: number = FILE_SIZE_LIMITS.DEFAULT, fieldName: string = 'Datei') =>
  z.instanceof(File).refine(
    (file) => file.size <= maxSize,
    `${fieldName} überschreitet das ${(maxSize / (1024 * 1024)).toFixed(0)}MB Limit`
  );

/**
 * File schema with type validation
 */
export const createTypedFileSchema = (
  allowedTypes: readonly string[] = FILE_TYPES.IMAGE_AND_PDF,
  maxSize: number = FILE_SIZE_LIMITS.DEFAULT,
  fieldName: string = 'Datei'
) =>
  createFileSchema(maxSize, fieldName).refine(
    (file) => allowedTypes.includes(file.type),
    `Nicht unterstützter Dateityp für ${fieldName}`
  );

/**
 * Multiple files schema with count limit
 */
export const createMultipleFilesSchema = (
  maxFiles: number = 5,
  maxSizePerFile: number = FILE_SIZE_LIMITS.DEFAULT,
  allowedTypes: readonly string[] = FILE_TYPES.IMAGE_AND_PDF,
  fieldName: string = 'Dateien'
) =>
  z.array(createTypedFileSchema(allowedTypes, maxSizePerFile, fieldName))
    .max(maxFiles, `Maximal ${maxFiles} ${fieldName} erlaubt`)
    .optional();

/**
 * Common file schemas for reuse
 */

// Logo file schema (single image file, optional)
export const logoFileSchema = createTypedFileSchema(
  FILE_TYPES.IMAGE,
  FILE_SIZE_LIMITS.LOGO,
  'Logo'
).optional();

// Cover image schema (single image file, optional)
export const coverImageSchema = createTypedFileSchema(
  FILE_TYPES.IMAGE,
  FILE_SIZE_LIMITS.COVER_IMAGE,
  'Cover-Bild'
).optional();

// Attachment files schema (up to 5 files, images and PDFs)
export const attachmentFilesSchema = createMultipleFilesSchema(
  5,
  FILE_SIZE_LIMITS.ATTACHMENT,
  FILE_TYPES.IMAGE_AND_PDF,
  'Anhänge'
);

// Document files schema (up to 5 files, all document types)
export const documentFilesSchema = createMultipleFilesSchema(
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
  allowedTypes: readonly string[] = FILE_TYPES.IMAGE_AND_PDF
): { isValid: boolean; errors?: string[] } {
  const errors: string[] = [];

  if (files.length > maxFiles) {
    errors.push(`Maximal ${maxFiles} Dateien erlaubt`);
  }

  files.forEach((file, index) => {
    if (file.size > maxSizePerFile) {
      errors.push(`Datei ${index + 1} überschreitet das ${(maxSizePerFile / (1024 * 1024)).toFixed(0)}MB Limit`);
    }
    if (!allowedTypes.includes(file.type)) {
      errors.push(`Datei ${index + 1}: Nicht unterstützter Dateityp`);
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