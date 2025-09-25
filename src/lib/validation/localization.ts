/**
 * Centralized German localization for all Zod validation errors.
 * Single source of truth for mapping Zod error codes to German error messages.
 *
 * This file handles ALL error message localization logic, removing the need for
 * hard-coded error mapping in other validation files.
 */

import { z } from 'zod';
import { validationMessages, antragMessages, getFieldPathLabel } from '@/lib/validation-messages';

/**
 * Configuration for field-specific error message handling.
 * Defines special cases and mappings for complex validation scenarios.
 */
const fieldSpecificConfig = {
  // Purpose-related fields should map errors to top-level 'purposes' field
  purposeFields: ['purposes', 'purposes.zuschuss', 'purposes.personelleUnterstuetzung', 'purposes.raumbuchung', 'purposes.weiteres'],

  // File-related fields should map errors to top-level 'files' field
  fileFields: ['files'],

  // Amount fields use special validation messages
  amountFields: ['amount', 'purposes.zuschuss.amount'],

  // Name fields that should use between() validation message
  nameFields: ['firstName', 'lastName'],

  // Fields that should use custom error messages from antragMessages
  antragSpecificFields: {
    'purposes': 'atLeastOnePurpose',
    'purposes.zuschuss.amount': 'zuschussAmountMinimum',
    'purposes.personelleUnterstuetzung.details': 'personelleDetailsRequired',
    'purposes.raumbuchung.location': 'raumbuchungLocationRequired',
    'purposes.raumbuchung.numberOfPeople': 'raumbuchungPeopleMinimum',
    'purposes.raumbuchung.details': 'raumbuchungDetailsRequired',
    'purposes.weiteres.details': 'weiteresDetailsRequired'
  }
} as const;

/**
 * Map a Zod validation issue to a German error message.
 * This is the single function responsible for ALL error message localization.
 *
 * @param issue - Zod validation issue
 * @param fieldPath - Field path (e.g., 'name', 'purposes.zuschuss.amount')
 * @returns Localized German error message
 */
export function mapZodErrorToGerman(issue: z.ZodIssue, fieldPath: string): string {
  // Handle required field validation (invalid_type errors)
  if (issue.code === z.ZodIssueCode.invalid_type) {
    return handleRequiredFieldError(fieldPath);
  }

  // Handle minimum validation (too_small errors)
  if (issue.code === z.ZodIssueCode.too_small && 'minimum' in issue) {
    return handleMinimumValidationError(issue as z.ZodIssue & { minimum: number }, fieldPath);
  }

  // Handle maximum validation (too_big errors)
  if (issue.code === z.ZodIssueCode.too_big && 'maximum' in issue) {
    return handleMaximumValidationError(issue as z.ZodIssue & { maximum: number }, fieldPath);
  }

  // Handle custom validation and refinement errors
  if (issue.code === z.ZodIssueCode.custom && issue.message) {
    return handleCustomValidationError(issue.message, fieldPath);
  }


  // Default fallback using centralized message template
  return validationMessages.invalidFormat(fieldPath);
}

/**
 * Handle required field validation errors (invalid_type).
 * Maps different field types to appropriate German required messages.
 */
function handleRequiredFieldError(fieldPath: string): string {
  // Special case: purposes validation
  if (isPurposeField(fieldPath)) {
    return antragMessages.atLeastOnePurpose;
  }

  // Use centralized required message template
  return validationMessages.required(fieldPath);
}

/**
 * Handle minimum validation errors (too_small).
 * Supports string length, number values, and array length validation.
 */
function handleMinimumValidationError(
  issue: z.ZodIssue & { minimum: number },
  fieldPath: string
): string {
  const minimum = Number(issue.minimum);

  // If minimum is 1, treat as required field
  if (minimum === 1) {
    return validationMessages.required(fieldPath);
  }

  // Special handling for name fields (use between message)
  if (isNameField(fieldPath)) {
    return validationMessages.between(fieldPath, minimum, 50);
  }

  // Special handling for amount fields
  if (isAmountField(fieldPath)) {
    return antragMessages.zuschussAmountMinimum;
  }

  // Default to minimum length message
  return validationMessages.minLength(fieldPath, minimum);
}

/**
 * Handle maximum validation errors (too_big).
 * Supports string length, number values, and array length validation.
 */
function handleMaximumValidationError(
  issue: z.ZodIssue & { maximum: number },
  fieldPath: string
): string {
  const maximum = Number(issue.maximum);

  // Handle number validation
  if ('type' in issue && issue.type === 'number') {
    if (isAmountField(fieldPath)) {
      return antragMessages.zuschussAmountMaximum;
    }
    return validationMessages.maxValue(maximum);
  }

  // Handle array count validation
  if (isFileField(fieldPath)) {
    return validationMessages.tooManyFilesShort(maximum);
  }

  // Handle name field validation (use between message)
  if (isNameField(fieldPath)) {
    return validationMessages.between(fieldPath, 2, maximum);
  }

  // Default to maximum length message
  return validationMessages.maxLength(fieldPath, maximum);
}

/**
 * Handle custom validation and schema refinement errors.
 * Trusts that custom messages from our centralized system are properly localized.
 */
function handleCustomValidationError(message: string, fieldPath: string): string {
  // If the message is from our centralized antragMessages, use it directly
  if (Object.values(antragMessages).includes(message)) {
    return message;
  }

  // For other custom messages (including file validation, email validation, etc.)
  // trust that they come from our centralized validation system
  return message || validationMessages.invalidFormat(fieldPath);
}


/**
 * Handle array validation errors (minimum length requirements).
 */
function handleArrayValidationError(fieldPath: string): string {
  return validationMessages.atLeastOne(fieldPath);
}

/**
 * Determine the appropriate field path for error mapping.
 * Handles special cases where nested field errors should be mapped to parent fields.
 *
 * @param originalFieldPath - Original field path from Zod error
 * @returns Field path to use for error mapping
 */
export function getErrorFieldPath(originalFieldPath: string): string {
  // Map purpose-related errors to top-level 'purposes' field
  if (isPurposeField(originalFieldPath)) {
    return 'purposes';
  }

  // Map file-related errors to top-level 'files' field
  if (isFileField(originalFieldPath) || originalFieldPath.startsWith('files.')) {
    return 'files';
  }

  // For array items like 'responsiblePersons.0.firstName', keep the specific path
  // This allows frontend to highlight the specific field in error
  return originalFieldPath;
}

/**
 * Check if a field path is related to purposes validation.
 */
function isPurposeField(fieldPath: string): boolean {
  return fieldSpecificConfig.purposeFields.some(field =>
    fieldPath === field || fieldPath.startsWith(field + '.')
  );
}

/**
 * Check if a field path is related to file validation.
 */
function isFileField(fieldPath: string): boolean {
  return fieldSpecificConfig.fileFields.some(field =>
    fieldPath === field || fieldPath.startsWith(field + '.')
  );
}

/**
 * Check if a field path is an amount field requiring special validation.
 */
function isAmountField(fieldPath: string): boolean {
  return fieldSpecificConfig.amountFields.some(field =>
    fieldPath === field || fieldPath.includes('amount')
  );
}

/**
 * Check if a field path is a name field requiring between() validation.
 */
function isNameField(fieldPath: string): boolean {
  return fieldSpecificConfig.nameFields.includes(fieldPath as any);
}

/**
 * Create a Zod error map that uses German localization for all error messages.
 * This can be set globally with z.setErrorMap() to ensure consistent German messages.
 * Note: This feature is optional - the main zodToValidationResult() function doesn't require it.
 *
 * @returns Zod error map function
 */
export function createGermanZodErrorMap() {
  return (issue: any, ctx: any) => {
    const fieldPath = issue.path?.join('.') || 'field';
    const message = mapZodErrorToGerman(issue, fieldPath);
    return { message };
  };
}

/**
 * Enhanced error mapping that includes field path normalization.
 * Used by zodToValidationResult() for comprehensive error handling.
 *
 * @param issue - Zod validation issue
 * @param originalFieldPath - Original field path from Zod
 * @returns Object with normalized field path and localized message
 */
export function mapZodErrorWithFieldPath(
  issue: z.ZodIssue,
  originalFieldPath: string
): { fieldPath: string; message: string } {
  const normalizedFieldPath = getErrorFieldPath(originalFieldPath);
  const message = mapZodErrorToGerman(issue, originalFieldPath);

  return {
    fieldPath: normalizedFieldPath,
    message
  };
}