/**
 * Clean Zod validation schemas focused on validation rules.
 * All error message localization is handled by the centralized localization.ts module.
 * This keeps schemas simple and maintainable.
 */

import { z } from 'zod';

/**
 * Name schema (3-100 characters)
 * Used for group names, general names, etc.
 */
export const nameSchema = z.string()
  .min(1)
  .min(3)
  .max(100)
  .trim();

/**
 * Title schema (3-200 characters)
 * Used for appointment titles, article titles, etc.
 */
export const titleSchema = z.string()
  .min(1)
  .min(3)
  .max(200)
  .trim();

/**
 * Long description schema (50-5000 characters)
 * Used for group descriptions, detailed content, etc.
 */
export const longDescriptionSchema = z.string()
  .min(1)
  .min(50)
  .max(5000)
  .trim();

/**
 * Short description/teaser schema (10-500 characters)
 * Used for teasers, short summaries, etc.
 */
export const shortDescriptionSchema = z.string()
  .min(1)
  .min(10)
  .max(500)
  .trim();

/**
 * First name schema (2-50 characters)
 * Used for person names with German character validation
 */
export const firstNameSchema = z.string()
  .min(1)
  .min(2)
  .max(50)
  .regex(/^[a-zA-ZäöüÄÖÜß\s\-']+$/)
  .trim();

/**
 * Last name schema (2-50 characters)
 * Used for person names with German character validation
 */
export const lastNameSchema = z.string()
  .min(1)
  .min(2)
  .max(50)
  .regex(/^[a-zA-ZäöüÄÖÜß\s\-']+$/)
  .trim();

/**
 * Email schema
 * Validates email format and length
 */
export const emailSchema = z.string()
  .min(1)
  .email()
  .max(100)
  .trim()
  .toLowerCase();

/**
 * Content schema (10-10000 characters)
 * Used for main content fields like status report content
 */
export const contentSchema = z.string()
  .min(1)
  .min(10)
  .max(10000)
  .trim();

/**
 * Summary schema for Antrag (10-300 characters)
 * Used for Antrag summaries
 */
export const summarySchema = z.string()
  .min(1)
  .min(10)
  .max(300)
  .trim();

/**
 * Optional text schema with configurable maximum length
 * Returns a function that creates a Zod schema for optional text fields
 */
export const createOptionalTextSchema = (maxLength: number, _fieldName: string = 'text') =>
  z.string()
    .max(maxLength)
    .trim()
    .optional()
    .or(z.literal(''));

/**
 * Street address schema (optional, max 200 characters)
 */
export const streetSchema = createOptionalTextSchema(200, 'street');

/**
 * City schema (optional, max 100 characters)
 */
export const citySchema = createOptionalTextSchema(100, 'city');

/**
 * State schema (optional, max 100 characters)
 */
export const stateSchema = createOptionalTextSchema(100, 'state');

/**
 * Postal code schema (optional, max 20 characters)
 */
export const postalCodeSchema = createOptionalTextSchema(20, 'postalCode');

/**
 * Phone number schema (optional, German format)
 */
export const phoneSchema = z.string()
  .regex(/^(\+49|0)[0-9\s\-\/()]+$/)
  .min(6)
  .max(20)
  .trim()
  .optional()
  .or(z.literal(''));

/**
 * Date/time string schema
 * Validates ISO date strings
 */
export const dateTimeSchema = z.string()
  .min(1)
  .datetime()
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/));

/**
 * Optional date/time string schema
 */
export const optionalDateTimeSchema = dateTimeSchema.optional();

/**
 * File URL schema
 * Validates URL format for file references
 */
export const fileUrlSchema = z.string().url();

/**
 * Array of file URLs schema
 */
export const fileUrlsSchema = z.array(fileUrlSchema).optional();

/**
 * Responsible person schema for groups
 * Used in group validation for responsible persons array
 */
export const responsiblePersonSchema = z.object({
  firstName: firstNameSchema,
  lastName: lastNameSchema,
  email: emailSchema
});

/**
 * Array of responsible persons (at least one required)
 */
export const responsiblePersonsSchema = z.array(responsiblePersonSchema)
  .min(1);

/**
 * Boolean schema
 */
export const booleanSchema = z.boolean();

/**
 * Number schema
 * Used for amounts, counts, etc.
 */
export const numberSchema = z.number();

/**
 * Positive integer schema
 * Used for counts, IDs, etc.
 */
export const positiveIntegerSchema = numberSchema
  .int()
  .min(1);

/**
 * Amount schema for financial values (1-999999)
 * Used for Antrag Zuschuss amounts
 */
export const amountSchema = numberSchema
  .min(1)
  .max(999999)
  .refine(val => !isNaN(val));

/**
 * Group ID schema (CUID format)
 */
export const groupIdSchema = z.string()
  .min(1)
  .regex(/^c[a-z0-9]{24}$/);

/**
 * Generic ID schema (UUID format)
 */
export const idSchema = z.string()
  .uuid();

/**
 * Status schema for Antrag
 */
export const antragStatusSchema = z.enum(['NEU', 'IN_BEARBEITUNG', 'GENEHMIGT', 'ABGELEHNT']);

/**
 * Featured flag schema for appointments
 */
export const featuredSchema = booleanSchema.optional().default(false);