/**
 * Zod schema for Group validation.
 * Migrates the validation logic from group-validator.ts to Zod while
 * preserving all existing business rules and German error messages.
 */

import { z } from 'zod';
import { validationMessages } from './validation-messages';
import { FILE_SIZE_LIMITS, FILE_TYPES, createSecureFileSchema } from './file-schemas';
import {
  createNameSchema,
  createDescriptionSchema,
  createFileUrlSchema,
  createResponsiblePersonsSchema
} from './schemas';


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
 * Regular meeting schema (optional text field)
 */
const regularMeetingSchema = z
  .string()
  .max(500, 'Regelmäßiges Treffen darf maximal 500 Zeichen lang sein')
  .trim()
  .optional();

/**
 * Meeting location schemas (optional fields)
 */
const meetingStreetSchema = z
  .string()
  .max(200, 'Straße darf maximal 200 Zeichen lang sein')
  .trim()
  .optional();

const meetingCitySchema = z
  .string()
  .max(100, 'Stadt darf maximal 100 Zeichen lang sein')
  .trim()
  .optional();

const meetingPostalCodeSchema = z
  .string()
  .max(5, 'Postleitzahl darf maximal 5 Zeichen lang sein')
  .regex(/^\d{5}$/, 'Postleitzahl muss 5 Ziffern enthalten')
  .trim()
  .optional()
  .or(z.literal(''));

const meetingLocationDetailsSchema = z
  .string()
  .max(1000, 'Ortsdetails dürfen maximal 1000 Zeichen lang sein')
  .trim()
  .optional();

/**
 * Complete group creation schema (for API validation)
 * Internal only - use validateGroupWithZod() for validation
 */
const groupCreateDataSchema = z.object({
  name: createNameSchema(3, 100, 'name'),
  description: createDescriptionSchema(50, 5000, 'description'),
  logoUrl: createFileUrlSchema('logoUrl').optional(),
  responsiblePersons: createResponsiblePersonsSchema(1, 'responsiblePersons'),
  regularMeeting: regularMeetingSchema,
  meetingStreet: meetingStreetSchema,
  meetingCity: meetingCitySchema,
  meetingPostalCode: meetingPostalCodeSchema,
  meetingLocationDetails: meetingLocationDetailsSchema
});

/**
 * Logo file schema with secure magic bytes validation
 */
const logoFileSchema = createSecureFileSchema(
  FILE_SIZE_LIMITS.LOGO,
  FILE_TYPES.IMAGE,
  'Logo'
).optional();

/**
 * Frontend group request form schema
 */
export const groupRequestFormSchema = z.object({
  name: createNameSchema(3, 100, 'name'),
  description: createDescriptionSchema(50, 5000, 'description'),
  responsiblePersons: createResponsiblePersonsSchema(1, 'responsiblePersons'),
  logo: logoFileSchema,
  regularMeeting: regularMeetingSchema,
  meetingStreet: meetingStreetSchema,
  meetingCity: meetingCitySchema,
  meetingPostalCode: meetingPostalCodeSchema,
  meetingLocationDetails: meetingLocationDetailsSchema
});

/**
 * Schema for updating an existing group
 * Internal only - use validateGroupUpdateWithZod() for validation
 */
const groupUpdateDataSchema = z.object({
  name: createNameSchema(3, 100, 'name').optional(),
  slug: slugSchema.optional(),
  description: createDescriptionSchema(50, 5000, 'description').optional(),
  status: groupStatusSchema.optional(),
  logoUrl: createFileUrlSchema('logoUrl').nullish(),
  responsiblePersons: createResponsiblePersonsSchema(1, 'responsiblePersons').optional(),
  regularMeeting: regularMeetingSchema,
  meetingStreet: meetingStreetSchema,
  meetingCity: meetingCitySchema,
  meetingPostalCode: meetingPostalCodeSchema,
  meetingLocationDetails: meetingLocationDetailsSchema
}).partial();

/**
 * Schema for EditGroupForm - includes logo file upload
 * Note: slug is not editable in the UI, only set on creation
 */
export const groupEditFormSchema = z.object({
  name: createNameSchema(3, 100, 'name'),
  description: createDescriptionSchema(50, 5000, 'description'),
  status: groupStatusSchema,
  responsiblePersons: createResponsiblePersonsSchema(1, 'responsiblePersons'),
  logo: logoFileSchema.nullable(),
  regularMeeting: regularMeetingSchema,
  meetingStreet: meetingStreetSchema,
  meetingCity: meetingCitySchema,
  meetingPostalCode: meetingPostalCodeSchema,
  meetingLocationDetails: meetingLocationDetailsSchema
});

/**
 * TypeScript types derived from Zod schemas
 * Note: GroupCreateData and GroupUpdateData types are defined in group-handlers.ts
 */
export type GroupRequestFormData = z.infer<typeof groupRequestFormSchema>;
export type GroupEditFormData = z.infer<typeof groupEditFormSchema>;

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