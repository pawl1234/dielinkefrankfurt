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
  createOptionalTextSchema,
  richTextSchema
} from './schemas';
import { validationMessages } from '@/lib/validation-messages';
import { FILE_TYPES, FILE_SIZE_LIMITS, createSecureFilesSchema } from './file-schemas';

// SINGLE SOURCE OF TRUTH for limits
export const APPOINTMENT_LIMITS = {
  title: {
    min: 3,
    max: 100
  },
  content: {
    min: 10,
    max: 5000
  },
  files: {
    maxCount: 5,
    maxSizeMB: 5
  }
} as const;


/**
 * Schema for public appointment submission (may have different requirements)
 */
export const appointmentSubmitDataSchema = z.object({
  title: titleSchema(APPOINTMENT_LIMITS.title.min, APPOINTMENT_LIMITS.title.max),
  mainText: richTextSchema(APPOINTMENT_LIMITS.content.min, APPOINTMENT_LIMITS.content.max, 'description'),
  startDateTime: dateTimeSchema,
  endDateTime:optionalDateTimeSchema,
  street: createOptionalTextSchema(200),
  city: createOptionalTextSchema(100),
  state: createOptionalTextSchema(100),
  postalCode: createOptionalTextSchema(10),
  firstName: firstNameSchema,
  lastName: lastNameSchema.optional(),
  recurringText: createOptionalTextSchema(500, 'Wiederholungsbeschreibung'),
  featured: z.boolean().optional(),
  files: createSecureFilesSchema(
    5,
    FILE_SIZE_LIMITS.ATTACHMENT,
    FILE_TYPES.IMAGE_AND_PDF,
    'files'
  ),
  coverImage: z.any().optional(),
  croppedCoverImage: z.any().optional(),
  existingFileUrls: z.array(z.url()).optional(),
  deletedFileUrls: z.array(z.url()).optional()
}).superRefine((data, ctx) => {
  // Validate cover image is required when featured
  if (data.featured && !data.coverImage && !data.croppedCoverImage) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Cover-Bild ist für Featured Termine erforderlich',
      path: ['coverImage']
    });
  }

  // Validate end date is after start date
  if (data.endDateTime && data.startDateTime) {
    const start = new Date(data.startDateTime);
    const end = new Date(data.endDateTime);
    if (end < start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Enddatum darf nicht vor dem Startdatum liegen',
        path: ['endDateTime']
      });
    }
  }

  // Validate recurring text is required when recurringText is empty but implied
  const hasRecurringPattern = data.recurringText && data.recurringText.trim().length > 0;
  if (data.recurringText !== undefined && data.recurringText !== null && data.recurringText.trim().length === 0) {
    // Allow empty recurring text (means not recurring)
  }
});

/**
 * TypeScript types derived from Zod schemas
 */
export type AppointmentSubmitData = z.infer<typeof appointmentSubmitDataSchema>;


/**
 * Validation function for public appointment submissions
 */
export async function validateAppointmentSubmitWithZod(data: unknown) {
  const { zodToValidationResult } = await import('./helpers');
  return zodToValidationResult(appointmentSubmitDataSchema, data);
}