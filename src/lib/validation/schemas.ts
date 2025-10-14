/**
 * Reusable factory functions for Zod validation schemas.
 * All schemas use factory pattern for maximum flexibility and reusability.
 * Error message localization is handled by the centralized validation-messages module.
 */

import { z } from 'zod';
import { validationMessages } from './validation-messages';
import sanitizeHtml from 'sanitize-html';

/**
 * Standard title limits
 * Used across different entities (Antrag, StatusReport, etc.)
 */
export const TITLE_LIMITS = {
  STANDARD: { min: 3, max: 200 },
  STATUS_REPORT: { min: 3, max: 100 },
  APPOINTMENT: { min: 3, max: 100 }
} as const;

/**
 * Factory: Name schema with configurable length
 *
 * @param minLength - Minimum character length (default: 3)
 * @param maxLength - Maximum character length (default: 100)
 * @param fieldName - Field name for error messages (default: 'name')
 */
export const createNameSchema = (
  minLength: number = 3,
  maxLength: number = 100,
  fieldName: string = 'name'
) => z.string()
  .min(1, validationMessages.required(fieldName))
  .min(minLength, validationMessages.minLength(fieldName, minLength))
  .max(maxLength, validationMessages.maxLength(fieldName, maxLength))
  .trim();

/**
 * Factory: Title schema with configurable length
 *
 * @param minLength - Minimum character length
 * @param maxLength - Maximum character length
 * @param fieldName - Field name for error messages (default: 'title')
 */
export const createTitleSchema = (
  minLength: number,
  maxLength: number,
  fieldName: string = 'title'
) => z.string()
  .min(1, validationMessages.required(fieldName))
  .min(minLength, validationMessages.minLength(fieldName, minLength))
  .max(maxLength, validationMessages.maxLength(fieldName, maxLength))
  .trim();

/**
 * Factory: Description schema with configurable length
 *
 * @param minLength - Minimum character length
 * @param maxLength - Maximum character length
 * @param fieldName - Field name for error messages (default: 'description')
 */
export const createDescriptionSchema = (
  minLength: number,
  maxLength: number,
  fieldName: string = 'description'
) => z.string()
  .min(1, validationMessages.required(fieldName))
  .min(minLength, validationMessages.minLength(fieldName, minLength))
  .max(maxLength, validationMessages.maxLength(fieldName, maxLength))
  .trim();

/**
 * Factory: Person name schema with German character validation
 *
 * @param minLength - Minimum character length (default: 2)
 * @param maxLength - Maximum character length (default: 50)
 * @param fieldName - Field name for error messages
 */
export const createPersonNameSchema = (
  minLength: number = 2,
  maxLength: number = 50,
  fieldName: string
) => z.string()
  .min(1, validationMessages.required(fieldName))
  .min(minLength, validationMessages.minLength(fieldName, minLength))
  .max(maxLength, validationMessages.maxLength(fieldName, maxLength))
  .regex(/^[a-zA-ZäöüÄÖÜß\s\-']+$/, validationMessages.invalidFormat(fieldName))
  .trim();

/**
 * Factory: Email schema with configurable length
 *
 * @param maxLength - Maximum character length (default: 100)
 * @param fieldName - Field name for error messages (default: 'email')
 */
export const createEmailSchema = (
  maxLength: number = 100,
  fieldName: string = 'email'
) => z.string()
  .min(1, validationMessages.required(fieldName))
  .email(validationMessages.email(fieldName))
  .max(maxLength, validationMessages.maxLength(fieldName, maxLength))
  .trim()
  .toLowerCase();

/**
 * Factory: Text content schema with configurable length
 *
 * @param minLength - Minimum character length
 * @param maxLength - Maximum character length
 * @param fieldName - Field name for error messages (default: 'content')
 */
export const createContentSchema = (
  minLength: number,
  maxLength: number,
  fieldName: string = 'content'
) => z.string()
  .min(1, validationMessages.required(fieldName))
  .min(minLength, validationMessages.minLength(fieldName, minLength))
  .max(maxLength, validationMessages.maxLength(fieldName, maxLength))
  .trim();

/**
 * Factory: Optional text schema with configurable maximum length
 *
 * @param maxLength - Maximum character length
 * @param fieldName - Field name for error messages (default: 'text')
 */
export const createOptionalTextSchema = (
  maxLength: number,
  fieldName: string = 'text'
) => z.string()
  .max(maxLength, validationMessages.maxLength(fieldName, maxLength))
  .trim()
  .optional()
  .or(z.literal(''));

/**
 * Factory: Date/time schema
 *
 * @param fieldName - Field name for error messages (default: 'dateTime')
 */
export const createDateTimeSchema = (fieldName: string = 'dateTime') => z.date({
  error: issue =>
    issue.input === undefined
      ? validationMessages.required(fieldName)
      : validationMessages.invalidDateTime()
});

/**
 * Factory: Optional date/time schema
 */
export const createOptionalDateTimeSchema = () => z.date({
  error: validationMessages.invalidDateTime()
}).optional().nullable();

/**
 * Factory: File URL schema
 *
 * @param fieldName - Field name for error messages (default: 'fileUrl')
 */
export const createFileUrlSchema = (fieldName: string = 'fileUrl') =>
  z.string().url(validationMessages.invalidUrl(fieldName));

/**
 * Factory: Array of file URLs schema
 *
 * @param fieldName - Field name for error messages (default: 'fileUrls')
 */
export const createFileUrlsSchema = (fieldName: string = 'fileUrls') =>
  z.array(createFileUrlSchema(fieldName)).optional();

/**
 * Factory: Group ID schema (CUID format)
 *
 * @param fieldName - Field name for error messages (default: 'groupId')
 */
export const createGroupIdSchema = (fieldName: string = 'groupId') => z.string()
  .min(1, validationMessages.required(fieldName))
  .regex(/^c[a-z0-9]{24}$/, validationMessages.invalidGroupId(fieldName));

/**
 * Factory: Responsible person schema for groups
 *
 * @param firstNameField - Field name for first name (default: 'firstName')
 * @param lastNameField - Field name for last name (default: 'lastName')
 * @param emailField - Field name for email (default: 'email')
 */
export const createResponsiblePersonSchema = (
  firstNameField: string = 'firstName',
  lastNameField: string = 'lastName',
  emailField: string = 'email'
) => z.object({
  firstName: createPersonNameSchema(2, 50, firstNameField),
  lastName: createPersonNameSchema(2, 50, lastNameField),
  email: createEmailSchema(100, emailField)
});

/**
 * Factory: Array of responsible persons (at least one required)
 *
 * @param minCount - Minimum number of persons required (default: 1)
 * @param fieldName - Field name for error messages (default: 'responsiblePersons')
 */
export const createResponsiblePersonsSchema = (
  minCount: number = 1,
  fieldName: string = 'responsiblePersons'
) => z.array(createResponsiblePersonSchema())
  .min(minCount, validationMessages.atLeastOne(fieldName));

/**
 * Boolean schema
 */
export const booleanSchema = z.boolean();

/**
 * Factory: Rich text schema with HTML sanitization
 *
 * @param minLength - Minimum character length
 * @param maxLength - Maximum character length
 * @param fieldName - Field name for error messages
 */
const sanitizeConfig = {
  allowedTags: ["b", "strong", "i", "em", "ul", "ol", "li", "a", "p", "br"],
  allowedAttributes: {
    'a': ['href', 'target', 'rel']
  }
};

/**
 * Removes invisible Unicode characters that can cause validation issues
 * - Zero-width spaces, soft hyphens, directional marks, etc.
 *
 * @param text - Text to normalize
 * @returns Normalized text without invisible characters
 */
const removeInvisibleCharacters = (text: string): string => {
  return text
    // Normalize Unicode to composed form (NFC)
    .normalize('NFC')
    // Remove zero-width spaces and other invisible characters
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // Remove soft hyphens
    .replace(/\u00AD/g, '')
    // Remove directional marks
    .replace(/[\u200E\u200F\u202A-\u202E]/g, '');
};

export const createRichTextSchema = (
  minLength: number,
  maxLength: number,
  fieldName: string
) => z.string()
  .min(1, validationMessages.required(fieldName))
  .trim()
  // Transform: sanitize HTML and remove invisible characters
  .transform((val) => {
    // First remove invisible Unicode characters
    const normalized = removeInvisibleCharacters(val);
    // Then sanitize HTML to prevent XSS attacks
    return sanitizeHtml(normalized, sanitizeConfig);
  })
  // Validate length after sanitization
  .pipe(
    z.string()
      .min(minLength, validationMessages.minLength(fieldName, minLength))
      .max(maxLength, validationMessages.maxLength(fieldName, maxLength))
  );
