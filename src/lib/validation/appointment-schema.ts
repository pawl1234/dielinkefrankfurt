/**
 * Zod schema for Appointment validation.
 * Migrates the validation logic from appointment-validator.ts to Zod while
 * preserving all existing business rules and German error messages.
 */

import { z } from 'zod';
import {
  titleSchema,
  shortDescriptionSchema,
  contentSchema,
  dateTimeSchema,
  optionalDateTimeSchema,
  streetSchema,
  citySchema,
  stateSchema,
  postalCodeSchema,
  firstNameSchema,
  lastNameSchema,
  featuredSchema,
  createOptionalTextSchema
} from './zod-schemas';

/**
 * Complete appointment creation schema
 * Migrates validateAppointmentData() from appointment-validator.ts
 */
export const appointmentCreateDataSchema = z.object({
  title: titleSchema,
  teaser: shortDescriptionSchema.optional(),
  mainText: contentSchema,
  startDateTime: dateTimeSchema,
  endDateTime: optionalDateTimeSchema,
  street: streetSchema,
  city: citySchema,
  state: stateSchema,
  postalCode: postalCodeSchema,
  firstName: firstNameSchema.optional(),
  lastName: lastNameSchema.optional(),
  recurringText: createOptionalTextSchema(500, 'Wiederholungsbeschreibung'),
  featured: featuredSchema
});

/**
 * Schema for updating an existing appointment (all fields optional)
 */
export const appointmentUpdateDataSchema = z.object({
  title: titleSchema.optional(),
  teaser: shortDescriptionSchema.optional(),
  mainText: contentSchema.optional(),
  startDateTime: dateTimeSchema.optional(),
  endDateTime: optionalDateTimeSchema,
  street: streetSchema,
  city: citySchema,
  state: stateSchema,
  postalCode: postalCodeSchema,
  firstName: firstNameSchema.optional(),
  lastName: lastNameSchema.optional(),
  recurringText: createOptionalTextSchema(500, 'Wiederholungsbeschreibung'),
  featured: featuredSchema
}).partial();

/**
 * Schema for public appointment submission (may have different requirements)
 */
export const appointmentSubmitDataSchema = z.object({
  title: titleSchema,
  teaser: shortDescriptionSchema.optional(),
  mainText: contentSchema,
  startDateTime: dateTimeSchema,
  endDateTime: optionalDateTimeSchema,
  street: streetSchema,
  city: citySchema,
  state: stateSchema,
  postalCode: postalCodeSchema,
  firstName: firstNameSchema.optional(),
  lastName: lastNameSchema.optional(),
  recurringText: createOptionalTextSchema(500, 'Wiederholungsbeschreibung')
  // featured is not included in public submissions (admin only)
});

/**
 * TypeScript types derived from Zod schemas
 */
export type AppointmentCreateData = z.infer<typeof appointmentCreateDataSchema>;
export type AppointmentUpdateData = z.infer<typeof appointmentUpdateDataSchema>;
export type AppointmentSubmitData = z.infer<typeof appointmentSubmitDataSchema>;

/**
 * Validation function that uses Zod schema and returns ValidationResult
 * Direct replacement for validateAppointmentData() from appointment-validator.ts
 */
export async function validateAppointmentWithZod(data: unknown) {
  const { zodToValidationResult } = await import('./zod-helpers');
  return zodToValidationResult(appointmentCreateDataSchema, data);
}

/**
 * Validation function for appointment updates (admin)
 */
export async function validateAppointmentUpdateWithZod(data: unknown) {
  const { zodToValidationResult } = await import('./zod-helpers');
  return zodToValidationResult(appointmentUpdateDataSchema, data);
}

/**
 * Validation function for public appointment submissions
 */
export async function validateAppointmentSubmitWithZod(data: unknown) {
  const { zodToValidationResult } = await import('./zod-helpers');
  return zodToValidationResult(appointmentSubmitDataSchema, data);
}