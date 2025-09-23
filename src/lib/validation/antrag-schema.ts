/**
 * Comprehensive Zod schema for Antrag validation.
 * Migrates the complex validation logic from antrag-validator.ts to Zod while
 * preserving all existing business rules and German error messages.
 */

import { z } from 'zod';
import {
  firstNameSchema,
  lastNameSchema,
  emailSchema,
  titleSchema,
  summarySchema,
  amountSchema,
  positiveIntegerSchema,
  booleanSchema,
  createOptionalTextSchema,
  fileUrlsSchema
} from './zod-schemas';
import { zodCustomMessages } from './zod-localization';

/**
 * Zuschuss (financial support) purpose schema
 * Matches the AntragPurposes interface from api-types.ts
 */
const zuschussPurposeSchema = z.object({
  enabled: booleanSchema,
  amount: z.number()
    .min(1, zodCustomMessages.zuschussAmountMinimum)
    .max(999999, zodCustomMessages.zuschussAmountMaximum)
    .refine(val => !isNaN(val), zodCustomMessages.zuschussAmountInvalid)
}).refine(
  (data) => {
    // If enabled is true, amount must be valid (amount is always required when object exists)
    if (data.enabled && data.amount < 1) {
      return false;
    }
    return true;
  },
  {
    message: zodCustomMessages.zuschussAmountRequired,
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
    .max(500, 'Details zur personellen Unterstützung dürfen maximal 500 Zeichen lang sein')
    .trim()
}).refine(
  (data) => {
    // If enabled is true, details must be provided
    if (data.enabled && (!data.details || data.details.trim().length === 0)) {
      return false;
    }
    return true;
  },
  {
    message: zodCustomMessages.personelleDetailsRequired,
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
    .max(200, 'Ort für Raumbuchung darf maximal 200 Zeichen lang sein')
    .trim(),
  numberOfPeople: z.number()
    .int('Anzahl der Personen muss eine ganze Zahl sein')
    .min(1, zodCustomMessages.raumbuchungPeopleMinimum)
    .max(1000, zodCustomMessages.raumbuchungPeopleMaximum),
  details: z.string()
    .max(500, 'Details zur Raumbuchung dürfen maximal 500 Zeichen lang sein')
    .trim()
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
    message: zodCustomMessages.raumbuchungDetailsRequired,
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
    .max(1000, 'Details zu weiteren Anliegen dürfen maximal 1000 Zeichen lang sein')
    .trim()
}).refine(
  (data) => {
    // If enabled is true, details must be provided
    if (data.enabled && (!data.details || data.details.trim().length === 0)) {
      return false;
    }
    return true;
  },
  {
    message: zodCustomMessages.weiteresDetailsRequired,
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
    message: zodCustomMessages.atLeastOnePurpose,
    path: ['general']
  }
);

/**
 * Main Antrag form data schema
 * Migrates all validation rules from validateAntragFormData()
 */
export const antragFormDataSchema = z.object({
  firstName: firstNameSchema,
  lastName: lastNameSchema,
  email: emailSchema,
  title: titleSchema,
  summary: summarySchema,
  purposes: purposesSchema,
  fileUrls: fileUrlsSchema,
  files: z.array(z.instanceof(File)).optional(),
  recaptchaToken: z.string().optional()
});

/**
 * Schema for updating an existing Antrag (all fields optional except purposes validation)
 */
export const antragUpdateDataSchema = z.object({
  firstName: firstNameSchema.optional(),
  lastName: lastNameSchema.optional(),
  email: emailSchema.optional(),
  title: titleSchema.optional(),
  summary: summarySchema.optional(),
  purposes: purposesSchema.optional(),
  fileUrls: fileUrlsSchema
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
  const { zodToValidationResult } = await import('./zod-helpers');
  return zodToValidationResult(antragFormDataSchema, data);
}

/**
 * Validation function for Antrag updates (admin API)
 * Replacement for admin update validation
 */
export async function validateAntragUpdateWithZod(data: unknown) {
  const { zodToValidationResult } = await import('./zod-helpers');
  return zodToValidationResult(antragUpdateDataSchema, data);
}

/**
 * Helper function to validate only the purposes object
 * Useful for partial validation scenarios
 */
export async function validateAntragPurposesWithZod(data: unknown) {
  const { zodToValidationResult } = await import('./zod-helpers');
  return zodToValidationResult(purposesSchema, data);
}

/**
 * Validation with file validation integration
 * Combines Zod schema validation with existing file validation from antrag-file-utils
 */
export async function validateAntragWithFilesWithZod(data: unknown) {
  const { zodToValidationResult } = await import('./zod-helpers');

  // First validate the schema
  const baseResult = zodToValidationResult(antragFormDataSchema, data);

  if (!baseResult.isValid) {
    return baseResult;
  }

  // If files are present, validate them using existing file validation
  const validatedData = baseResult.data!;
  if (validatedData.files && validatedData.files.length > 0) {
    try {
      const { validateAntragFiles } = await import('@/lib/antrag-file-utils');
      validateAntragFiles(validatedData.files);
    } catch (error) {
      return {
        isValid: false,
        errors: {
          files: error instanceof Error ? error.message : 'Fehler bei der Dateivalidierung'
        }
      };
    }
  }

  return baseResult;
}