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
  fileUrlsSchema
} from './schemas';
import { validationMessages } from '@/lib/validation-messages';

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
 * Create a status report schema with configurable limits
 * Used when newsletter settings are available
 */
export function createStatusReportSchema(titleLimit: number = 100, contentLimit: number = 5000) {
  return z.object({
    groupId: groupIdSchema,
    title: z.string()
      .min(1, validationMessages.required('title'))
      .min(3, validationMessages.minLength('title', 3))
      .max(titleLimit, validationMessages.maxLength('title', titleLimit))
      .trim(),
    content: z.string()
      .min(1, validationMessages.required('content'))
      .max(contentLimit, validationMessages.maxLength('content', contentLimit))
      .trim(),
    reporterFirstName: firstNameSchema,
    reporterLastName: lastNameSchema,
    fileUrls: fileUrlsSchema
  });
}

/**
 * Default status report schema (uses standard limits)
 */
export const statusReportCreateDataSchema = baseStatusReportSchema;

/**
 * Schema for updating an existing status report
 */
export const statusReportUpdateDataSchema = z.object({
  groupId: groupIdSchema.optional(),
  title: titleSchema.optional(),
  content: contentSchema.optional(),
  reporterFirstName: firstNameSchema.optional(),
  reporterLastName: lastNameSchema.optional(),
  fileUrls: fileUrlsSchema
}).partial();

/**
 * TypeScript types derived from Zod schemas
 */
export type StatusReportCreateData = z.infer<typeof statusReportCreateDataSchema>;
export type StatusReportUpdateData = z.infer<typeof statusReportUpdateDataSchema>;

/**
 * Validation function that uses Zod schema with configurable limits
 * Direct replacement for validateStatusReportData() from status-report-validator.ts
 */
export async function validateStatusReportWithZod(data: unknown) {
  const { zodToValidationResult } = await import('./helpers');

  try {
    // Try to get configurable limits from newsletter settings
    const { getNewsletterSettings } = await import('@/lib/newsletter-service');
    const settings = await getNewsletterSettings();
    const titleLimit = settings?.statusReportTitleLimit || 100;
    const contentLimit = settings?.statusReportContentLimit || 5000;

    // Use schema with configurable limits
    const schema = createStatusReportSchema(titleLimit, contentLimit);
    return zodToValidationResult(schema, data);
  } catch (settingsError) {
    // Fallback to default limits if settings cannot be retrieved (common in tests)
    // Only warn in non-test environments
    if (process.env.NODE_ENV !== 'test') {
      console.warn('Could not retrieve newsletter settings, using default limits:', settingsError);
    }
    return zodToValidationResult(statusReportCreateDataSchema, data);
  }
}

/**
 * Validation function for status report updates
 */
export async function validateStatusReportUpdateWithZod(data: unknown) {
  const { zodToValidationResult } = await import('./helpers');
  return zodToValidationResult(statusReportUpdateDataSchema, data);
}

/**
 * Simple validation without configurable limits (for cases where newsletter service is unavailable)
 */
export async function validateStatusReportSimpleWithZod(data: unknown) {
  const { zodToValidationResult } = await import('./helpers');
  return zodToValidationResult(statusReportCreateDataSchema, data);
}