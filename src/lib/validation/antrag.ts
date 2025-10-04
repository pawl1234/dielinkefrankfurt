/**
 * Comprehensive Zod schema for Antrag validation.
 * Migrates the complex validation logic from antrag-validator.ts to Zod while
 * preserving all existing business rules and German error messages.
 */

import { z } from 'zod';
import {
  createPersonNameSchema,
  createEmailSchema,
  createTitleSchema,
  TITLE_LIMITS,
  createContentSchema,
  booleanSchema,
  createFileUrlsSchema
} from './schemas';
import { antragMessages, validationMessages } from './validation-messages';
import { FILE_TYPES, FILE_SIZE_LIMITS, createSecureFilesSchema } from './file-schemas';

/**
 * Zuschuss (financial support) purpose schema
 * Matches the AntragPurposes interface from api-types.ts
 */
const zuschussPurposeSchema = z.object({
  enabled: booleanSchema,
  amount: z.number()
    .min(1, antragMessages.zuschussAmountMinimum)
    .max(999999, antragMessages.zuschussAmountMaximum)
    .refine(val => !isNaN(val), antragMessages.zuschussAmountInvalid)
}).refine(
  (data) => {
    // If enabled is true, amount must be valid (amount is always required when object exists)
    if (data.enabled && data.amount < 1) {
      return false;
    }
    return true;
  },
  {
    message: antragMessages.zuschussAmountRequired,
    path: ['amount']
  }
);

/**
 * Personelle Unterstützung (personnel support) purpose schema
 * Matches the AntragPurposes interface from api-types.ts
 */
const personelleUnterstuetzungPurposeSchema = z.object({
  enabled: booleanSchema,
  details: z.string()
    .max(500, validationMessages.maxLength('purposes.personelleUnterstuetzung.details', 500))
    .trim()
    .optional()
    .or(z.literal(''))
}).refine(
  (data) => {
    // If enabled is true, details must be provided
    if (data.enabled && (!data.details || data.details.trim().length === 0)) {
      return false;
    }
    return true;
  },
  {
    message: antragMessages.personelleDetailsRequired,
    path: ['details']
  }
);

/**
 * Raumbuchung (room booking) purpose schema
 * Matches the AntragPurposes interface from api-types.ts
 */
const raumbuchungPurposeSchema = z.object({
  enabled: booleanSchema,
  location: z.string()
    .max(200, validationMessages.maxLength('purposes.raumbuchung.location', 200))
    .trim()
    .optional()
    .or(z.literal('')),
  numberOfPeople: z.number()
    .int(validationMessages.mustBeInteger('numberOfPeople'))
    .min(1, antragMessages.raumbuchungPeopleMinimum)
    .max(1000, antragMessages.raumbuchungPeopleMaximum)
    .optional(),
  details: z.string()
    .max(500, validationMessages.maxLength('purposes.raumbuchung.details', 500))
    .trim()
    .optional()
    .or(z.literal(''))
}).refine(
  (data) => {
    if (!data.enabled) return true;

    // If enabled, all fields must be provided and valid
    if (!data.location || data.location.trim().length === 0) {
      return false;
    }
    if (!data.numberOfPeople || data.numberOfPeople < 1) {
      return false;
    }
    if (!data.details || data.details.trim().length === 0) {
      return false;
    }
    return true;
  },
  {
    message: antragMessages.raumbuchungDetailsRequired,
    path: ['details']
  }
);

/**
 * Weiteres (other) purpose schema
 * Matches the AntragPurposes interface from api-types.ts
 */
const weiteresPurposeSchema = z.object({
  enabled: booleanSchema,
  details: z.string()
    .max(1000, antragMessages.weiteresDetailsMaxLength)
    .trim()
    .optional()
    .or(z.literal(''))
}).refine(
  (data) => {
    // If enabled is true, details must be provided
    if (data.enabled && (!data.details || data.details.trim().length === 0)) {
      return false;
    }
    return true;
  },
  {
    message: antragMessages.weiteresDetailsRequired,
    path: ['details']
  }
);

/**
 * Complete purposes schema with cross-field validation
 */
const purposesSchema = z.object({
  zuschuss: zuschussPurposeSchema.optional(),
  personelleUnterstuetzung: personelleUnterstuetzungPurposeSchema.optional(),
  raumbuchung: raumbuchungPurposeSchema.optional(),
  weiteres: weiteresPurposeSchema.optional()
}).refine(
  (purposes) => {
    // Check if at least one purpose is enabled
    const hasEnabledPurpose = Object.values(purposes).some(
      purpose => purpose && typeof purpose === 'object' && purpose.enabled === true
    );
    return hasEnabledPurpose;
  },
  {
    message: antragMessages.atLeastOnePurpose,
    path: ['general']
  }
);

/**
 * Main Antrag form data schema
 * Migrates all validation rules from validateAntragFormData()
 */
export const antragFormDataSchema = z.object({
  firstName: createPersonNameSchema(2, 50, 'firstName'),
  lastName: createPersonNameSchema(2, 50, 'lastName'),
  email: createEmailSchema(100, 'email'),
  title: createTitleSchema(TITLE_LIMITS.STANDARD.min, TITLE_LIMITS.STANDARD.max, 'title'),
  summary: createContentSchema(10, 300, 'summary'),
  purposes: purposesSchema,
  fileUrls: createFileUrlsSchema('fileUrls'),
  files: createSecureFilesSchema(
    FILE_SIZE_LIMITS.ANTRAG_COUNT,
    FILE_SIZE_LIMITS.ANTRAG,
    FILE_TYPES.ANTRAG,
    'files'
  )
});

/**
 * Schema for updating an existing Antrag (all fields optional except purposes validation)
 */
export const antragUpdateDataSchema = z.object({
  firstName: createPersonNameSchema(2, 50, 'firstName').optional(),
  lastName: createPersonNameSchema(2, 50, 'lastName').optional(),
  email: createEmailSchema(100, 'email').optional(),
  title: createTitleSchema(TITLE_LIMITS.STANDARD.min, TITLE_LIMITS.STANDARD.max, 'title').optional(),
  summary: createContentSchema(10, 300, 'summary').optional(),
  purposes: purposesSchema.optional(),
  fileUrls: createFileUrlsSchema('fileUrls')
}).partial();

/**
 * TypeScript types derived from Zod schemas
 */
export type AntragFormData = z.infer<typeof antragFormDataSchema>;
export type AntragUpdateData = z.infer<typeof antragUpdateDataSchema>;
export type AntragPurposes = z.infer<typeof purposesSchema>;
export type ZuschussPurpose = z.infer<typeof zuschussPurposeSchema>;
export type PersonelleUnterstuetzungPurpose = z.infer<typeof personelleUnterstuetzungPurposeSchema>;
export type RaumbuchungPurpose = z.infer<typeof raumbuchungPurposeSchema>;
export type WeiteresPurpose = z.infer<typeof weiteresPurposeSchema>;

/**
 * Validation function that uses Zod schema and returns ValidationResult
 * Direct replacement for validateAntragFormData() from antrag-validator.ts
 */
export async function validateAntragWithZod(data: unknown) {
  const { zodToValidationResult } = await import('./helpers');
  return zodToValidationResult(antragFormDataSchema, data);
}

/**
 * Validation function for Antrag updates (admin API)
 * Replacement for admin update validation
 */
export async function validateAntragUpdateWithZod(data: unknown) {
  const { zodToValidationResult } = await import('./helpers');
  return zodToValidationResult(antragUpdateDataSchema, data);
}

/**
 * Helper function to validate only the purposes object
 * Useful for partial validation scenarios
 */
export async function validateAntragPurposesWithZod(data: unknown) {
  const { zodToValidationResult } = await import('./helpers');
  return zodToValidationResult(purposesSchema, data);
}