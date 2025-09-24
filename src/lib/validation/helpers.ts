/**
 * Clean Zod integration utilities focused on converting Zod validation results
 * to the existing ValidationResult interface. All error message localization
 * is delegated to the centralized localization.ts module.
 */

import { z } from 'zod';
import { ValidationResult } from '@/lib/errors';
import { mapZodErrorWithFieldPath } from './localization';

/**
 * Extended ValidationResult that includes typed data when validation succeeds
 */
export interface ZodValidationResult<T> extends ValidationResult {
  data?: T;
}

/**
 * Convert Zod errors to existing ValidationResult format with German messages.
 * All error message localization is handled by the centralized localization module.
 *
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns ValidationResult with German field errors matching existing patterns
 */
export function zodToValidationResult<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ZodValidationResult<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    return {
      isValid: true,
      data: result.data
    };
  }

  // Convert ZodError to Record<string, string> format using centralized localization
  const errors: Record<string, string> = {};

  result.error.issues.forEach(issue => {
    const originalFieldPath = issue.path.length > 0 ? issue.path.join('.') : 'general';

    // Delegate all error mapping logic to the centralized localization module
    const { fieldPath, message } = mapZodErrorWithFieldPath(issue, originalFieldPath);

    // Use the normalized field path and localized message
    errors[fieldPath] = message;
  });

  return {
    isValid: false,
    errors
  };
}


/**
 * Wrapper function to create a validator that uses Zod with existing ValidationResult pattern
 *
 * @param schema - Zod schema to wrap
 * @returns Function that validates data and returns ValidationResult
 */
export function createZodValidator<T>(schema: z.ZodSchema<T>) {
  return (data: unknown): ZodValidationResult<T> => {
    return zodToValidationResult(schema, data);
  };
}

/**
 * Helper to validate data and throw ValidationError if invalid
 * Integrates seamlessly with existing error handling patterns
 *
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Validated and typed data
 * @throws ValidationError if validation fails
 */
export function validateWithZod<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = zodToValidationResult(schema, data);

  if (!result.isValid && result.errors) {
    // Import ValidationError here to avoid circular dependency
    const { ValidationError } = require('@/lib/errors');
    throw new ValidationError(result.errors);
  }

  return result.data!;
}

/**
 * Helper to safely parse with Zod and return typed result
 * Alternative to validateWithZod that doesn't throw
 *
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns ZodValidationResult with typed data or errors
 */
export function safeValidateWithZod<T>(schema: z.ZodSchema<T>, data: unknown): ZodValidationResult<T> {
  return zodToValidationResult(schema, data);
}

/**
 * Type guard to check if a ZodValidationResult is valid and has data
 *
 * @param result - ZodValidationResult to check
 * @returns Type predicate for successful validation with data
 */
export function isValidZodResult<T>(result: ZodValidationResult<T>): result is ZodValidationResult<T> & { data: T } {
  return result.isValid && result.data !== undefined;
}