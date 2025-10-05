/**
 * Zod schema for Status Report validation.
 * Migrates the validation logic from status-report-validator.ts to Zod while
 * preserving configurable limits and German error messages.
 */

import { z } from 'zod';
import {
  createGroupIdSchema,
  createTitleSchema,
  createContentSchema,
  createPersonNameSchema,
  createFileUrlsSchema,
  createRichTextSchema
} from './schemas';
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
  groupId: createGroupIdSchema('groupId'),
  title: createTitleSchema(STATUS_REPORT_LIMITS.title.min, STATUS_REPORT_LIMITS.title.max, 'title'),
  content: createContentSchema(STATUS_REPORT_LIMITS.content.min, STATUS_REPORT_LIMITS.content.max, 'content'),
  reporterFirstName: createPersonNameSchema(2, 50, 'reporterFirstName'),
  reporterLastName: createPersonNameSchema(2, 50, 'reporterLastName'),
  fileUrls: createFileUrlsSchema('fileUrls')
});

/**
 * Lazy schema creation to avoid SSR issues with file validation
 * Creates the schema at runtime instead of module load time
 */
export const getStatusReportSchema = () => z.object({
  groupId: createGroupIdSchema('groupId'),
  title: createTitleSchema(STATUS_REPORT_LIMITS.title.min, STATUS_REPORT_LIMITS.title.max, 'title'),
  content: createRichTextSchema(STATUS_REPORT_LIMITS.content.min, STATUS_REPORT_LIMITS.content.max, 'content'),
  reporterFirstName: createPersonNameSchema(2, 50, 'reporterFirstName'),
  reporterLastName: createPersonNameSchema(2, 50, 'reporterLastName'),
  files: createSecureFilesSchema(
    STATUS_REPORT_LIMITS.files.maxCount,
    STATUS_REPORT_LIMITS.files.maxSizeMB * 1024 * 1024,
    FILE_TYPES.STATUS_REPORT,
    'files'
  ),
  fileUrls: z.array(z.string().url()).optional()
});

/**
 * Legacy export for backward compatibility
 * @deprecated Use getStatusReportSchema() instead for SSR safety
 */
export const statusReportSchema = getStatusReportSchema();

/**
 * Default status report schema (uses standard limits)
 */
export const statusReportCreateDataSchema = baseStatusReportSchema;

/**
 * Schema for updating an existing status report

export const statusReportUpdateDataSchema = z.object({
  groupId: groupIdSchema.optional(),
  title: titleSchema(STATUS_REPORT_LIMITS.title.min, STATUS_REPORT_LIMITS.title.max).optional(),
  content: contentSchema.optional(),
  reporterFirstName: firstNameSchema.optional(),
  reporterLastName: lastNameSchema.optional(),
  fileUrls: fileUrlsSchema
}).partial();
 */
/**
 * Admin schema for editing status reports (includes status field)
 */
export const getStatusReportAdminSchema = () => getStatusReportSchema().extend({
  status: z.enum(['NEW', 'ACTIVE', 'ARCHIVED', 'REJECTED'], {
    message: 'Status ist erforderlich'
  }),
  existingFileUrls: z.array(z.string().url()).optional()
});

/**
 * Legacy export for backward compatibility
 * @deprecated Use getStatusReportAdminSchema() instead for SSR safety
 */
export const statusReportAdminSchema = getStatusReportAdminSchema();

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
  return zodToValidationResult(getStatusReportSchema(), data);
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