/**
 * Admin API validation schemas.
 * Centralizes validation for admin endpoints to ensure consistency and DRY principles.
 */

import { z } from 'zod';
import {
  createNameSchema,
  createTitleSchema,
  TITLE_LIMITS,
  createDescriptionSchema,
  createContentSchema,
  createEmailSchema,
  createPersonNameSchema,
  createDateTimeSchema,
  createOptionalDateTimeSchema,
  createOptionalTextSchema,
  booleanSchema,
  createResponsiblePersonsSchema
} from './schemas';
import { validationMessages } from './validation-messages';

/**
 * Common admin update schema pattern - all fields optional
 */
const createAdminUpdateSchema = <T extends z.ZodRawShape>(shape: T) =>
  z.object(shape).partial();

/**
 * Group admin update schema
 */
export const adminGroupUpdateSchema = createAdminUpdateSchema({
  name: createNameSchema(3, 100, 'name'),
  description: createDescriptionSchema(50, 5000, 'description'),
  logoUrl: z.string().url().nullable(),
  status: z.enum(['NEW', 'ACTIVE', 'ARCHIVED']),
  responsiblePersons: createResponsiblePersonsSchema(1, 'responsiblePersons')
});

/**
 * Status report admin update schema
 */
export const adminStatusReportUpdateSchema = createAdminUpdateSchema({
  title: createTitleSchema(TITLE_LIMITS.STATUS_REPORT.min, TITLE_LIMITS.STATUS_REPORT.max, 'title'),
  content: createContentSchema(10, 10000, 'content'),
  reporterFirstName: createPersonNameSchema(2, 50, 'reporterFirstName'),
  reporterLastName: createPersonNameSchema(2, 50, 'reporterLastName'),
  status: z.enum(['NEW', 'ACCEPTED', 'REJECTED']),
  fileUrls: z.array(z.string().url()),
  groupId: z.string().cuid()
});

/**
 * Appointment admin update schema
 */
export const adminAppointmentUpdateSchema = createAdminUpdateSchema({
  title: createTitleSchema(TITLE_LIMITS.APPOINTMENT.min, TITLE_LIMITS.APPOINTMENT.max, 'title'),
  mainText: createContentSchema(10, 10000, 'mainText'),
  startDateTime: createDateTimeSchema('startDateTime'),
  endDateTime: createOptionalDateTimeSchema().nullable(),
  street: createOptionalTextSchema(200, 'Straße'),
  city: createOptionalTextSchema(100, 'Ort'),
  locationDetails: createOptionalTextSchema(100, 'Zusatzinformationen'),
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
  recipientEmails: z.array(createEmailSchema(100, 'email')).min(1, validationMessages.atLeastOneEmailRequired('recipientEmails')),
  ccEmails: z.array(createEmailSchema(100, 'email')).optional(),
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
  dateFrom: createDateTimeSchema('dateFrom').optional(),
  dateTo: createDateTimeSchema('dateTo').optional()
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