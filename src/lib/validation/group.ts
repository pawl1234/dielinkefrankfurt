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
import { validationMessages } from '@/lib/validation-messages';

/**
 * Slug schema for group URLs (kebab-case format)
 * Used for group slugs in URLs
 */
const slugSchema = z.string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .trim();

/**
 * Group status schema
 * Matches Prisma GroupStatus enum
 */
const groupStatusSchema = z.enum(['NEW', 'ACTIVE', 'ARCHIVED']);

/**
 * Logo metadata schema for cropped images
 */
const logoMetadataSchema = z.object({
  originalUrl: z.string().url(validationMessages.invalidUrl('originalUrl')),
  croppedUrl: z.string().url(validationMessages.invalidUrl('croppedUrl'))
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
  slug: slugSchema.optional(),
  description: longDescriptionSchema.optional(),
  status: groupStatusSchema.optional(),
  logoUrl: fileUrlSchema.optional(),
  logoMetadata: logoMetadataSchema,
  responsiblePersons: responsiblePersonsSchema.optional()
}).partial();

/**
 * Schema specifically for EditGroupForm with required fields for editing
 * Includes slug and status which are not in the basic update schema
 */
export const groupEditFormSchema = z.object({
  name: nameSchema,
  slug: slugSchema,
  description: longDescriptionSchema,
  status: groupStatusSchema,
  responsiblePersons: responsiblePersonsSchema
});

/**
 * TypeScript types derived from Zod schemas
 */
export type GroupCreateData = z.infer<typeof groupCreateDataSchema>;
export type GroupUpdateData = z.infer<typeof groupUpdateDataSchema>;
export type GroupEditFormData = z.infer<typeof groupEditFormSchema>;
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