/**
 * Zod schema for Group validation.
 * Migrates the validation logic from group-validator.ts to Zod while
 * preserving all existing business rules and German error messages.
 */

import { z } from 'zod';
import {
  nameSchema,
  longDescriptionSchema,
  firstNameSchema,
  lastNameSchema,
  emailSchema,
  fileUrlSchema,
  responsiblePersonSchema,
  responsiblePersonsSchema
} from './schemas';

/**
 * Logo metadata schema for cropped images
 */
const logoMetadataSchema = z.object({
  originalUrl: z.string().url('Ungültige Original-URL'),
  croppedUrl: z.string().url('Ungültige zugeschnittene URL')
}).optional();

/**
 * Complete group creation schema
 * Migrates validateGroupData() from group-validator.ts
 */
export const groupCreateDataSchema = z.object({
  name: nameSchema,
  description: longDescriptionSchema,
  logoUrl: fileUrlSchema.optional(),
  logoMetadata: logoMetadataSchema,
  responsiblePersons: responsiblePersonsSchema
});

/**
 * Schema for updating an existing group (all fields optional except responsiblePersons validation)
 */
export const groupUpdateDataSchema = z.object({
  name: nameSchema.optional(),
  description: longDescriptionSchema.optional(),
  logoUrl: fileUrlSchema.optional(),
  logoMetadata: logoMetadataSchema,
  responsiblePersons: responsiblePersonsSchema.optional()
}).partial();

/**
 * TypeScript types derived from Zod schemas
 */
export type GroupCreateData = z.infer<typeof groupCreateDataSchema>;
export type GroupUpdateData = z.infer<typeof groupUpdateDataSchema>;
export type ResponsiblePersonData = z.infer<typeof responsiblePersonSchema>;

/**
 * Validation function that uses Zod schema and returns ValidationResult
 * Direct replacement for validateGroupData() from group-validator.ts
 */
export async function validateGroupWithZod(data: unknown) {
  const { zodToValidationResult } = await import('./helpers');
  return zodToValidationResult(groupCreateDataSchema, data);
}

/**
 * Validation function for group updates
 */
export async function validateGroupUpdateWithZod(data: unknown) {
  const { zodToValidationResult } = await import('./helpers');
  return zodToValidationResult(groupUpdateDataSchema, data);
}

/**
 * Helper function to validate only responsible persons array
 * Useful for partial validation scenarios
 */
export async function validateResponsiblePersonsWithZod(data: unknown) {
  const { zodToValidationResult } = await import('./helpers');
  return zodToValidationResult(responsiblePersonsSchema, data);
}