/**
 * Zod schema for Status Report validation.
 * Migrates the validation logic from status-report-validator.ts to Zod while
 * preserving configurable limits and German error messages.
 */

import { z } from 'zod';
import {
  groupIdSchema,
  titleSchema,
  contentSchema,
  firstNameSchema,
  lastNameSchema,
  fileUrlsSchema,
  richTextSchema
} from './schemas';
import { validationMessages } from '@/lib/validation-messages';
import { FILE_TYPES, createSecureFilesSchema } from './file-schemas';

// SINGLE SOURCE OF TRUTH for limits
export const STATUS_REPORT_LIMITS = {
  title: {
    min: 3,
    max: 100
  },
  content: {
    min: 10,
    max: 5000
  },
  files: {
    maxCount: 5,
    maxSizeMB: 5
  }
} as const;

/**
 * Base status report schema with default limits
 */
const baseStatusReportSchema = z.object({
  groupId: groupIdSchema,
  title: titleSchema,
  content: contentSchema,
  reporterFirstName: firstNameSchema,
  reporterLastName: lastNameSchema,
  fileUrls: fileUrlsSchema
});

/**
 * Status report schema with FIXED limits
 * No more dynamic limits - they're defined in STATUS_REPORT_LIMITS
 */
export const statusReportSchema = z.object({
  groupId: z.string()
    .min(1, validationMessages.required('groupId'))
    .regex(/^c[a-z0-9]{24}$/, validationMessages.invalidGroupId('groupId')),
  title: z.string()
    .min(1, validationMessages.required('title'))
    .min(STATUS_REPORT_LIMITS.title.min, validationMessages.minLength('title', STATUS_REPORT_LIMITS.title.min))
    .max(STATUS_REPORT_LIMITS.title.max, validationMessages.maxLength('title', STATUS_REPORT_LIMITS.title.max))
    .trim(),
  content: richTextSchema,
  reporterFirstName: firstNameSchema,
  reporterLastName: lastNameSchema,
  files: createSecureFilesSchema(
    STATUS_REPORT_LIMITS.files.maxCount,
    STATUS_REPORT_LIMITS.files.maxSizeMB * 1024 * 1024,
    FILE_TYPES.STATUS_REPORT,
    'files'
  ),
  fileUrls: z.array(z.string().url()).optional()
});

/**
 * Default status report schema (uses standard limits)
 */
export const statusReportCreateDataSchema = baseStatusReportSchema;

/**
 * Schema for updating an existing status report

export const statusReportUpdateDataSchema = z.object({
  groupId: groupIdSchema.optional(),
  title: titleSchema.optional(),
  content: contentSchema.optional(),
  reporterFirstName: firstNameSchema.optional(),
  reporterLastName: lastNameSchema.optional(),
  fileUrls: fileUrlsSchema
}).partial();
 */
/**
 * Admin schema for editing status reports (includes status field)
 */
export const statusReportAdminSchema = statusReportSchema.extend({
  status: z.enum(['NEW', 'ACTIVE', 'ARCHIVED', 'REJECTED'], {
    message: 'Status ist erforderlich'
  }),
  existingFileUrls: z.array(z.string().url()).optional()
});

/**
 * TypeScript types derived from Zod schemas
 */
export type StatusReportCreateData = z.infer<typeof statusReportCreateDataSchema>;
//export type StatusReportUpdateData = z.infer<typeof statusReportUpdateDataSchema>;

/**
 * Validation function using fixed limits from STATUS_REPORT_LIMITS
 * Direct replacement for validateStatusReportData() from status-report-validator.ts
 */
export async function validateStatusReportWithZod(data: unknown) {
  const { zodToValidationResult } = await import('./helpers');
  return zodToValidationResult(statusReportSchema, data);
}

/**
 * Validation function for status report updates

export async function validateStatusReportUpdateWithZod(data: unknown) {
  const { zodToValidationResult } = await import('./helpers');
  return zodToValidationResult(statusReportUpdateDataSchema, data);
}
 */
/**
 * Simple validation without configurable limits (for cases where newsletter service is unavailable)
 */
export async function validateStatusReportSimpleWithZod(data: unknown) {
  const { zodToValidationResult } = await import('./helpers');
  return zodToValidationResult(statusReportCreateDataSchema, data);
}