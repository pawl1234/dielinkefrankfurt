/**
 * Appointment validation using centralized schemas and ValidationResult pattern.
 * Consolidates validation from appointment-handlers.ts for consistency.
 */

import { validationSchemas, commonValidators } from './schemas';
import { ValidationResult } from '@/lib/errors';

/**
 * Types for appointment validation data (based on AppointmentCreateData from appointment-handlers.ts)
 */
export interface AppointmentCreateData {
  title: string;
  teaser: string;
  mainText: string;
  startDateTime: string;
  endDateTime?: string | null;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  firstName?: string;
  lastName?: string;
  recurringText?: string;
  featured?: boolean;
}

/**
 * Validates appointment submission data using centralized validation schemas
 *
 * @param data - Appointment data to validate
 * @returns ValidationResult with isValid flag and field errors in German
 */
export async function validateAppointmentData(data: Partial<AppointmentCreateData>): Promise<ValidationResult> {
  const errors: Record<string, string> = {};

  // Type guard to ensure we have an object to work with
  if (!data || typeof data !== 'object') {
    return {
      isValid: false,
      errors: { general: 'Ungültige Daten erhalten' }
    };
  }

  // Validate required fields using shared schemas
  const titleError = validationSchemas.title.validate(data.title || '', 'title');
  if (titleError) {
    errors.title = titleError;
  }

  // Validate teaser (optional but if provided, should meet requirements)
  if (data.teaser) {
    const teaserError = validationSchemas.shortDescription.validate(data.teaser, 'teaser');
    if (teaserError) {
      errors.teaser = teaserError;
    }
  }

  // Validate main text using content schema
  const mainTextError = validationSchemas.content.validate(data.mainText || '', 'mainText');
  if (mainTextError) {
    errors.mainText = mainTextError;
  }

  // Validate start date time is required
  const startDateTimeError = commonValidators.required(data.startDateTime, 'startDateTime');
  if (startDateTimeError) {
    errors.startDateTime = startDateTimeError;
  }

  // Validate optional location fields (if provided, should not be too long)
  const optionalLocationFields = {
    street: validationSchemas.optionalText(200),
    city: validationSchemas.optionalText(100),
    state: validationSchemas.optionalText(100),
    postalCode: validationSchemas.optionalText(20)
  };

  for (const [fieldName, schema] of Object.entries(optionalLocationFields)) {
    const fieldValue = data[fieldName as keyof AppointmentCreateData] as string;
    const fieldError = schema.validate(fieldValue, fieldName);
    if (fieldError) {
      errors[fieldName] = fieldError;
    }
  }

  // Validate optional contact person fields (if provided)
  if (data.firstName) {
    const firstNameError = validationSchemas.firstName.validate(data.firstName, 'firstName');
    if (firstNameError) {
      errors.firstName = firstNameError;
    }
  }

  if (data.lastName) {
    const lastNameError = validationSchemas.lastName.validate(data.lastName, 'lastName');
    if (lastNameError) {
      errors.lastName = lastNameError;
    }
  }

  // Validate optional recurring text (if provided)
  if (data.recurringText) {
    const recurringTextError = validationSchemas.optionalText(500).validate(data.recurringText, 'recurringText');
    if (recurringTextError) {
      errors.recurringText = recurringTextError;
    }
  }

  // Return validation result
  return {
    isValid: Object.keys(errors).length === 0,
    errors: Object.keys(errors).length > 0 ? errors : undefined
  };
}

/**
 * Legacy compatibility function that returns Record<string, string> | null
 * for existing code that hasn't been migrated to ValidationResult pattern
 *
 * @deprecated Use validateAppointmentData() which returns ValidationResult
 */
export async function validateAppointmentDataLegacy(data: Partial<AppointmentCreateData>): Promise<Record<string, string> | null> {
  const result = await validateAppointmentData(data);
  return result.errors || null;
}