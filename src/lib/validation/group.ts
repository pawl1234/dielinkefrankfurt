/**
 * Zod schema for Group validation.
 * Migrates the validation logic from group-validator.ts to Zod while
 * preserving all existing business rules and German error messages.
 */

import { z } from 'zod';
import { validationMessages } from '@/lib/validation-messages';
import { FILE_SIZE_LIMITS, FILE_TYPES } from './file-schemas';

/**
 * Name schema with German error messages (3-100 characters)
 */
const nameSchema = z.string()
  .min(1, validationMessages.required('name'))
  .min(3, validationMessages.minLength('name', 3))
  .max(100, validationMessages.maxLength('name', 100))
  .trim();

/**
 * Long description schema with German error messages (50-5000 characters)
 */
const longDescriptionSchema = z.string()
  .min(1, validationMessages.required('description'))
  .min(50, validationMessages.minLength('description', 50))
  .max(5000, validationMessages.maxLength('description', 5000))
  .trim();

/**
 * First name schema with German error messages (2-50 characters)
 */
const firstNameSchema = z.string()
  .min(1, validationMessages.required('firstName'))
  .min(2, validationMessages.minLength('firstName', 2))
  .max(50, validationMessages.maxLength('firstName', 50))
  .regex(/^[a-zA-ZäöüÄÖÜß\s\-']+$/, validationMessages.invalidFormat('firstName'))
  .trim();

/**
 * Last name schema with German error messages (2-50 characters)
 */
const lastNameSchema = z.string()
  .min(1, validationMessages.required('lastName'))
  .min(2, validationMessages.minLength('lastName', 2))
  .max(50, validationMessages.maxLength('lastName', 50))
  .regex(/^[a-zA-ZäöüÄÖÜß\s\-']+$/, validationMessages.invalidFormat('lastName'))
  .trim();

/**
 * Email schema with German error messages
 */
const emailSchema = z.string()
  .min(1, validationMessages.required('email'))
  .email(validationMessages.email('email'))
  .max(100, validationMessages.maxLength('email', 100))
  .trim()
  .toLowerCase();

/**
 * File URL schema with German error messages
 */
const fileUrlSchema = z.string().url(validationMessages.invalidUrl('fileUrls'));

/**
 * Responsible person schema with German error messages
 */
const responsiblePersonSchema = z.object({
  firstName: firstNameSchema,
  lastName: lastNameSchema,
  email: emailSchema
});

/**
 * Array of responsible persons (at least one required)
 */
const responsiblePersonsSchema = z.array(responsiblePersonSchema)
  .min(1, validationMessages.atLeastOne('responsiblePersons'));

/**
 * Slug schema for group URLs (kebab-case format)
 */
const slugSchema = z.string()
  .min(1, validationMessages.required('slug'))
  .max(100, validationMessages.maxLength('slug', 100))
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, validationMessages.invalidFormat('slug'))
  .trim();

/**
 * Group status schema
 */
const groupStatusSchema = z.enum(['NEW', 'ACTIVE', 'ARCHIVED'], {
  message: validationMessages.statusRequired('status')
});

/**
 * Complete group creation schema (for API validation)
 */
export const groupCreateDataSchema = z.object({
  name: nameSchema,
  description: longDescriptionSchema,
  logoUrl: fileUrlSchema.optional(),
  responsiblePersons: responsiblePersonsSchema
});

/**
 * Logo file schema for client-side validation
 * Uses z.any() to avoid File/Blob issues in server environment
 */
const logoFileSchema = z.any()
  .optional()
  .refine(
    (file) => {
      if (!file || typeof file !== 'object' || !file.size) return true;
      return file.size <= FILE_SIZE_LIMITS.LOGO;
    },
    {
      message: validationMessages.fileSizeExceeds(FILE_SIZE_LIMITS.LOGO / (1024 * 1024))
    }
  )
  .refine(
    (file) => {
      if (!file || typeof file !== 'object' || !file.type) return true;
      return FILE_TYPES.IMAGE.includes(file.type);
    },
    {
      message: validationMessages.unsupportedFileType()
    }
  );

/**
 * Frontend group request form schema
 */
export const groupRequestFormSchema = z.object({
  name: nameSchema,
  description: longDescriptionSchema,
  responsiblePersons: responsiblePersonsSchema,
  logo: logoFileSchema
});

/**
 * Schema for updating an existing group
 */
export const groupUpdateDataSchema = z.object({
  name: nameSchema.optional(),
  slug: slugSchema.optional(),
  description: longDescriptionSchema.optional(),
  status: groupStatusSchema.optional(),
  logoUrl: fileUrlSchema.optional(),
  responsiblePersons: responsiblePersonsSchema.optional()
}).partial();

/**
 * Schema for EditGroupForm - includes logo file upload
 */
export const groupEditFormSchema = z.object({
  name: nameSchema,
  slug: slugSchema.optional(),
  description: longDescriptionSchema,
  status: groupStatusSchema,
  responsiblePersons: responsiblePersonsSchema,
  logo: logoFileSchema.nullable()
});

/**
 * TypeScript types derived from Zod schemas
 */
export type GroupCreateData = z.infer<typeof groupCreateDataSchema>;
export type GroupRequestFormData = z.infer<typeof groupRequestFormSchema>;
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