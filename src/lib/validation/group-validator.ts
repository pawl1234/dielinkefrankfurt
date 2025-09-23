/**
 * Group validation using centralized schemas and ValidationResult pattern.
 * Replaces the validation logic from group-handlers.ts for consistency.
 */

import { validationSchemas, validateFields } from './schemas';
import { ValidationResult } from '@/lib/errors';
import { responsiblePersonMessages } from '@/lib/validation-messages';

/**
 * Types for group validation data
 */
export interface GroupCreateData {
  name: string;
  description: string;
  logoUrl?: string;
  logoMetadata?: {
    originalUrl: string;
    croppedUrl: string;
  };
  responsiblePersons: ResponsiblePersonCreateData[];
}

export interface ResponsiblePersonCreateData {
  firstName: string;
  lastName: string;
  email: string;
}

/**
 * Validates group submission data using centralized validation schemas
 *
 * @param data - Group data to validate
 * @returns ValidationResult with isValid flag and field errors in German
 */
export async function validateGroupData(data: Partial<GroupCreateData>): Promise<ValidationResult> {
  const errors: Record<string, string> = {};

  // Type guard to ensure we have an object to work with
  if (!data || typeof data !== 'object') {
    return {
      isValid: false,
      errors: { general: 'Ungültige Daten erhalten' }
    };
  }

  // Validate basic fields using centralized schemas
  const basicFieldValidation = validateFields(data, {
    name: validationSchemas.name,
    description: validationSchemas.longDescription
  });

  // Merge basic field errors
  Object.assign(errors, basicFieldValidation);

  // Validate responsible persons array
  if (!data.responsiblePersons || !Array.isArray(data.responsiblePersons) || data.responsiblePersons.length === 0) {
    errors.responsiblePersons = responsiblePersonMessages.firstNameRequired.replace('für alle verantwortlichen Personen', '');
  } else {
    // Validate each responsible person
    for (const person of data.responsiblePersons) {
      // Validate first name
      const firstNameError = validationSchemas.firstName.validate(person?.firstName, 'firstName');
      if (firstNameError) {
        errors.responsiblePersons = responsiblePersonMessages.firstNameLength;
        break;
      }

      // Validate last name
      const lastNameError = validationSchemas.lastName.validate(person?.lastName, 'lastName');
      if (lastNameError) {
        errors.responsiblePersons = responsiblePersonMessages.lastNameLength;
        break;
      }

      // Validate email
      const emailError = validationSchemas.email.validate(person?.email, 'email');
      if (emailError) {
        if (!person?.email) {
          errors.responsiblePersons = responsiblePersonMessages.emailRequired;
        } else {
          errors.responsiblePersons = responsiblePersonMessages.emailInvalid;
        }
        break;
      }
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
 * @deprecated Use validateGroupData() which returns ValidationResult
 */
export async function validateGroupDataLegacy(data: Partial<GroupCreateData>): Promise<Record<string, string> | null> {
  const result = await validateGroupData(data);
  return result.errors || null;
}