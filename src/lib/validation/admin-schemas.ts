/**
 * Admin API validation schemas.
 * Centralizes validation for admin endpoints to ensure consistency and DRY principles.
 */

import { z } from 'zod';
import {
  nameSchema,
  titleSchema,
  longDescriptionSchema,
  shortDescriptionSchema,
  contentSchema,
  emailSchema,
  firstNameSchema,
  lastNameSchema,
  dateTimeSchema,
  optionalDateTimeSchema,
  createOptionalTextSchema,
  booleanSchema,
  responsiblePersonsSchema
} from './schemas';
import { validationMessages } from '../validation-messages';

/**
 * Common admin update schema pattern - all fields optional
 */
const createAdminUpdateSchema = <T extends z.ZodRawShape>(shape: T) =>
  z.object(shape).partial();

/**
 * Group admin update schema
 */
export const adminGroupUpdateSchema = createAdminUpdateSchema({
  name: nameSchema,
  description: longDescriptionSchema,
  logoUrl: z.string().url().nullable(),
  logoMetadata: z.object({
    originalUrl: z.string().url(),
    croppedUrl: z.string().url()
  }).nullable(),
  status: z.enum(['NEW', 'ACTIVE', 'ARCHIVED']),
  responsiblePersons: responsiblePersonsSchema
});

/**
 * Status report admin update schema
 */
export const adminStatusReportUpdateSchema = createAdminUpdateSchema({
  title: titleSchema,
  content: contentSchema,
  reporterFirstName: firstNameSchema,
  reporterLastName: lastNameSchema,
  status: z.enum(['NEW', 'ACCEPTED', 'REJECTED']),
  fileUrls: z.array(z.string().url()),
  groupId: z.string().cuid()
});

/**
 * Appointment admin update schema
 */
export const adminAppointmentUpdateSchema = createAdminUpdateSchema({
  title: titleSchema,
  teaser: shortDescriptionSchema,
  mainText: contentSchema,
  startDateTime: dateTimeSchema,
  endDateTime: optionalDateTimeSchema.nullable(),
  street: createOptionalTextSchema(200, 'Straße'),
  city: createOptionalTextSchema(100, 'Ort'),
  state: createOptionalTextSchema(100, 'Bundesland'),
  postalCode: createOptionalTextSchema(20, 'Postleitzahl'),
  firstName: createOptionalTextSchema(50, 'Vorname'),
  lastName: createOptionalTextSchema(50, 'Nachname'),
  recurringText: createOptionalTextSchema(500, 'Wiederholungstext'),
  featured: booleanSchema,
  processed: booleanSchema,
  status: z.enum(['pending', 'accepted', 'rejected']),
  rejectionReason: createOptionalTextSchema(500, 'Ablehnungsgrund'),
  fileUrls: z.string().nullable(),
  metadata: z.string().nullable()
});

/**
 * Newsletter settings update schema
 */
export const adminNewsletterSettingsSchema = z.object({
  maxStatusReportsPerNewsletter: z.number().int().min(1).max(50),
  maxEventsPerNewsletter: z.number().int().min(1).max(50),
  newsletterFrequency: z.enum(['weekly', 'biweekly', 'monthly']),
  newsletterDayOfWeek: z.number().int().min(0).max(6), // 0 = Sunday, 6 = Saturday
  newsletterTimeOfDay: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, validationMessages.invalidTimeFormat('newsletterTimeOfDay'))
});

/**
 * Antrag config update schema
 */
export const adminAntragConfigSchema = z.object({
  recipientEmails: z.array(emailSchema).min(1, validationMessages.atLeastOneEmailRequired('recipientEmails')),
  ccEmails: z.array(emailSchema).optional(),
  enableAutoNotification: booleanSchema.optional().default(true),
  requireApproval: booleanSchema.optional().default(true)
});

/**
 * Query parameter schemas for list endpoints
 */
export const adminListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  dateFrom: dateTimeSchema.optional(),
  dateTo: dateTimeSchema.optional()
});

/**
 * Bulk operation schemas
 */
export const adminBulkDeleteSchema = z.object({
  ids: z.array(z.string()).min(1, validationMessages.atLeastOneIdRequired('ids'))
});

export const adminBulkUpdateStatusSchema = z.object({
  ids: z.array(z.string()).min(1, validationMessages.atLeastOneIdRequired('ids')),
  status: z.string().min(1, validationMessages.statusRequired('status')),
  rejectionReason: z.string().optional()
});

/**
 * Helper functions for admin validation
 */

/**
 * Validates admin update data and returns typed result
 */
export async function validateAdminUpdate<T extends z.ZodSchema>(
  schema: T,
  data: unknown
) {
  const { zodToValidationResult } = await import('./helpers');
  return zodToValidationResult(schema, data);
}

/**
 * Validates query parameters for list endpoints
 */
export async function validateAdminListQuery(query: unknown) {
  const { zodToValidationResult } = await import('./helpers');
  return zodToValidationResult(adminListQuerySchema, query);
}

/**
 * TypeScript types for admin operations
 */
export type AdminGroupUpdate = z.infer<typeof adminGroupUpdateSchema>;
export type AdminStatusReportUpdate = z.infer<typeof adminStatusReportUpdateSchema>;
export type AdminAppointmentUpdate = z.infer<typeof adminAppointmentUpdateSchema>;
export type AdminNewsletterSettings = z.infer<typeof adminNewsletterSettingsSchema>;
export type AdminAntragConfig = z.infer<typeof adminAntragConfigSchema>;
export type AdminListQuery = z.infer<typeof adminListQuerySchema>;
export type AdminBulkDelete = z.infer<typeof adminBulkDeleteSchema>;
export type AdminBulkUpdateStatus = z.infer<typeof adminBulkUpdateStatusSchema>;