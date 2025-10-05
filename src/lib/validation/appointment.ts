/**
 * Zod schema for Appointment validation.
 * Migrates the validation logic from appointment-validator.ts to Zod while
 * preserving all existing business rules and German error messages.
 */

import { z } from 'zod';
import {
  createTitleSchema,
  createDateTimeSchema,
  createOptionalDateTimeSchema,
  createPersonNameSchema,
  createOptionalTextSchema,
  createRichTextSchema,
} from './schemas';
import { FILE_TYPES, FILE_SIZE_LIMITS, createSecureFilesSchema, createSecureFileSchema } from './file-schemas';
import { validationMessages } from './validation-messages';

// SINGLE SOURCE OF TRUTH for limits - internal only
const APPOINTMENT_LIMITS = {
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

// Vercel has 4.5MB limit, use 4MB for safety margin (allows other form fields)
const MAX_COMBINED_COVER_IMAGE_SIZE = 4 * 1024 * 1024; // 4MB in bytes


/**
 * Lazy schema creation to avoid SSR issues with file validation
 * Creates the schema at runtime instead of module load time
 * Internal only - use appointmentSubmitDataSchema or validateAppointmentSubmitWithZod()
 */
const getAppointmentSubmitDataSchema = () => z.object({
  title: createTitleSchema(APPOINTMENT_LIMITS.title.min, APPOINTMENT_LIMITS.title.max, 'title'),
  mainText: createRichTextSchema(APPOINTMENT_LIMITS.content.min, APPOINTMENT_LIMITS.content.max, 'description'),
  startDateTime: createDateTimeSchema('startDateTime'),
  endDateTime: createOptionalDateTimeSchema(),
  street: createOptionalTextSchema(200, 'Straße'),
  city: createOptionalTextSchema(100, 'Ort'),
  state: createOptionalTextSchema(100, 'Bundesland'),
  postalCode: createOptionalTextSchema(10, 'Postleitzahl'),
  firstName: createPersonNameSchema(2, 50, 'firstName'),
  lastName: createPersonNameSchema(2, 50, 'lastName').optional(),
  recurringText: createOptionalTextSchema(500, 'Wiederholungsbeschreibung'),
  featured: z.boolean().optional(),
  files: createSecureFilesSchema(
    5,
    FILE_SIZE_LIMITS.ATTACHMENT,
    FILE_TYPES.IMAGE_AND_PDF,
    'files'
  ),
  coverImage: createSecureFileSchema(
    FILE_SIZE_LIMITS.COVER_IMAGE,
    FILE_TYPES.IMAGE,
    'Cover-Bild'
  ).optional(),
  croppedCoverImage: createSecureFileSchema(
    FILE_SIZE_LIMITS.COVER_IMAGE,
    FILE_TYPES.IMAGE,
    'Zugeschnittenes Cover-Bild'
  ).optional(),
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

  // Validate combined cover image size for featured appointments
  if (data.featured && data.coverImage && data.croppedCoverImage) {
    const coverSize = data.coverImage.size;
    const croppedSize = data.croppedCoverImage.size;
    const combinedSize = coverSize + croppedSize;

    if (combinedSize > MAX_COMBINED_COVER_IMAGE_SIZE) {
      const combinedMB = (combinedSize / (1024 * 1024)).toFixed(1);
      const maxMB = MAX_COMBINED_COVER_IMAGE_SIZE / (1024 * 1024);

      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: validationMessages.combinedCoverImageSizeExceeds(combinedMB, maxMB),
        path: ['coverImage']  // Show error on coverImage field
      });
    }
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

  // Validate recurring text - allow empty recurring text (means not recurring)
  if (data.recurringText !== undefined && data.recurringText !== null && data.recurringText.trim().length === 0) {
    // Allow empty recurring text (means not recurring)
  }
});

/**
 * Zod schema for appointment form validation.
 * Use this in client-side forms with react-hook-form.
 */
export const appointmentSubmitDataSchema = getAppointmentSubmitDataSchema();

/**
 * TypeScript types derived from Zod schemas
 */
export type AppointmentSubmitData = z.infer<ReturnType<typeof getAppointmentSubmitDataSchema>>;


/**
 * Validation function for public appointment submissions
 */
export async function validateAppointmentSubmitWithZod(data: unknown) {
  const { zodToValidationResult } = await import('./helpers');
  return zodToValidationResult(getAppointmentSubmitDataSchema(), data);
}