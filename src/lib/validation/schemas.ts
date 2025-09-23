/**
 * Base Zod validation schemas that mirror the existing validation patterns from schemas.ts.
 * Maintains the same field length limits and requirements while providing TypeScript type inference.
 */

import { z } from 'zod';
import { zodCustomMessages } from './localization';

/**
 * Name schema (3-100 characters)
 * Used for group names, general names, etc.
 */
export const nameSchema = z.string()
  .min(1, 'Name ist erforderlich')
  .min(3, 'Name muss mindestens 3 Zeichen lang sein')
  .max(100, 'Name darf maximal 100 Zeichen lang sein')
  .trim();

/**
 * Title schema (3-200 characters)
 * Used for appointment titles, article titles, etc.
 */
export const titleSchema = z.string()
  .min(1, 'Titel ist erforderlich')
  .min(3, 'Titel muss mindestens 3 Zeichen lang sein')
  .max(200, 'Titel darf maximal 200 Zeichen lang sein')
  .trim();

/**
 * Long description schema (50-5000 characters)
 * Used for group descriptions, detailed content, etc.
 */
export const longDescriptionSchema = z.string()
  .min(1, 'Beschreibung ist erforderlich')
  .min(50, 'Beschreibung muss mindestens 50 Zeichen lang sein')
  .max(5000, 'Beschreibung darf maximal 5000 Zeichen lang sein')
  .trim();

/**
 * Short description/teaser schema (10-500 characters)
 * Used for teasers, short summaries, etc.
 */
export const shortDescriptionSchema = z.string()
  .min(1, 'Kurzbeschreibung ist erforderlich')
  .min(10, 'Kurzbeschreibung muss mindestens 10 Zeichen lang sein')
  .max(500, 'Kurzbeschreibung darf maximal 500 Zeichen lang sein')
  .trim();

/**
 * First name schema (2-50 characters)
 * Used for person names with German character validation
 */
export const firstNameSchema = z.string()
  .min(1, 'Vorname ist erforderlich')
  .min(2, 'Vorname muss mindestens 2 Zeichen lang sein')
  .max(50, 'Vorname darf maximal 50 Zeichen lang sein')
  .regex(/^[a-zA-ZäöüÄÖÜß\s\-']+$/, 'Vorname enthält ungültige Zeichen')
  .trim();

/**
 * Last name schema (2-50 characters)
 * Used for person names with German character validation
 */
export const lastNameSchema = z.string()
  .min(1, 'Nachname ist erforderlich')
  .min(2, 'Nachname muss mindestens 2 Zeichen lang sein')
  .max(50, 'Nachname darf maximal 50 Zeichen lang sein')
  .regex(/^[a-zA-ZäöüÄÖÜß\s\-']+$/, 'Nachname enthält ungültige Zeichen')
  .trim();

/**
 * Email schema with German error messages
 * Validates email format and length
 */
export const emailSchema = z.string()
  .min(1, 'E-Mail-Adresse ist erforderlich')
  .email('Bitte geben Sie eine gültige E-Mail-Adresse ein')
  .max(100, 'E-Mail-Adresse darf maximal 100 Zeichen lang sein')
  .trim()
  .toLowerCase();

/**
 * Content schema (10-10000 characters)
 * Used for main content fields like status report content
 */
export const contentSchema = z.string()
  .min(1, 'Inhalt ist erforderlich')
  .min(10, 'Inhalt muss mindestens 10 Zeichen lang sein')
  .max(10000, 'Inhalt darf maximal 10000 Zeichen lang sein')
  .trim();

/**
 * Summary schema for Antrag (10-300 characters)
 * Used for Antrag summaries
 */
export const summarySchema = z.string()
  .min(1, 'Zusammenfassung ist erforderlich')
  .min(10, 'Zusammenfassung muss mindestens 10 Zeichen lang sein')
  .max(300, 'Zusammenfassung darf maximal 300 Zeichen lang sein')
  .trim();

/**
 * Optional text schema with configurable maximum length
 * Returns a function that creates a Zod schema for optional text fields
 */
export const createOptionalTextSchema = (maxLength: number, fieldName: string = 'Text') =>
  z.string()
    .max(maxLength, `${fieldName} darf maximal ${maxLength} Zeichen lang sein`)
    .trim()
    .optional()
    .or(z.literal(''));

/**
 * Street address schema (optional, max 200 characters)
 */
export const streetSchema = createOptionalTextSchema(200, 'Straße');

/**
 * City schema (optional, max 100 characters)
 */
export const citySchema = createOptionalTextSchema(100, 'Ort');

/**
 * State schema (optional, max 100 characters)
 */
export const stateSchema = createOptionalTextSchema(100, 'Bundesland');

/**
 * Postal code schema (optional, max 20 characters)
 */
export const postalCodeSchema = createOptionalTextSchema(20, 'Postleitzahl');

/**
 * Phone number schema (optional, German format)
 */
export const phoneSchema = z.string()
  .regex(/^(\+49|0)[0-9\s\-\/()]+$/, 'Ungültiges Telefonnummer-Format')
  .min(6, 'Telefonnummer muss mindestens 6 Zeichen lang sein')
  .max(20, 'Telefonnummer darf maximal 20 Zeichen lang sein')
  .trim()
  .optional()
  .or(z.literal(''));

/**
 * Date/time string schema
 * Validates ISO date strings
 */
export const dateTimeSchema = z.string()
  .min(1, 'Datum und Uhrzeit sind erforderlich')
  .datetime('Ungültiges Datum oder Uhrzeit-Format')
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, 'Ungültiges Datum oder Uhrzeit-Format'));

/**
 * Optional date/time string schema
 */
export const optionalDateTimeSchema = dateTimeSchema.optional();

/**
 * File URL schema
 * Validates URL format for file references
 */
export const fileUrlSchema = z.string().url('Ungültige URL');

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
  .min(1, zodCustomMessages.atLeastOne('responsiblePersons'));

/**
 * Boolean schema with German error messages
 */
export const booleanSchema = z.boolean();

/**
 * Number schema with German error messages
 * Used for amounts, counts, etc.
 */
export const numberSchema = z.number();

/**
 * Positive integer schema
 * Used for counts, IDs, etc.
 */
export const positiveIntegerSchema = numberSchema
  .int('Muss eine ganze Zahl sein')
  .min(1, 'Muss mindestens 1 sein');

/**
 * Amount schema for financial values (1-999999)
 * Used for Antrag Zuschuss amounts
 */
export const amountSchema = numberSchema
  .min(1, zodCustomMessages.zuschussAmountMinimum)
  .max(999999, zodCustomMessages.zuschussAmountMaximum)
  .refine(val => !isNaN(val), zodCustomMessages.zuschussAmountInvalid);

/**
 * Group ID schema (CUID format)
 */
export const groupIdSchema = z.string()
  .min(1, 'Gruppe ist erforderlich')
  .regex(/^c[a-z0-9]{24}$/, 'Ungültige Gruppen-ID');

/**
 * Generic ID schema (UUID format)
 */
export const idSchema = z.string()
  .uuid('Ungültige ID');

/**
 * Status schema for Antrag
 */
export const antragStatusSchema = z.enum(['NEU', 'IN_BEARBEITUNG', 'GENEHMIGT', 'ABGELEHNT']);

/**
 * Featured flag schema for appointments
 */
export const featuredSchema = booleanSchema.optional().default(false);