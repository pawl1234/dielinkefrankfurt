/**
 * Zod integration utilities that bridge Zod validation with the existing ValidationResult/ValidationError system.
 * Maintains German localization and existing error response patterns.
 */

import { z } from 'zod';
import { ValidationResult } from '@/lib/errors';
import { validationMessages } from '@/lib/validation-messages';
import { getZodFieldLabel } from './zod-localization';

/**
 * Extended ValidationResult that includes typed data when validation succeeds
 */
export interface ZodValidationResult<T> extends ValidationResult {
  data?: T;
}

/**
 * Convert Zod errors to existing ValidationResult format with German messages
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

  // Convert ZodError to Record<string, string> format
  const errors: Record<string, string> = {};

  result.error.issues.forEach(issue => {
    const fieldPath = issue.path.length > 0 ? issue.path.join('.') : 'general';
    errors[fieldPath] = getGermanErrorMessage(issue, fieldPath);
  });

  return {
    isValid: false,
    errors
  };
}

/**
 * Map Zod error codes to German messages using existing validation message patterns
 *
 * @param issue - Zod validation issue
 * @param fieldPath - Dot-separated field path (e.g., 'name', 'purposes.zuschuss.amount')
 * @returns German error message consistent with existing validation system
 */
function getGermanErrorMessage(issue: z.ZodIssue, fieldPath: string): string {
  const fieldLabel = getZodFieldLabel(fieldPath);

  // Handle basic required field validation
  if (issue.code === 'invalid_type') {
    return validationMessages.required(fieldPath);
  }

  // Handle string length validation
  if (issue.code === 'too_small' && 'minimum' in issue) {
    if (issue.minimum === 1) {
      return validationMessages.required(fieldPath);
    }
    return validationMessages.minLength(fieldPath, issue.minimum as number);
  }

  if (issue.code === 'too_big' && 'maximum' in issue) {
    return validationMessages.maxLength(fieldPath, issue.maximum as number);
  }

  // Handle email validation
  if (issue.message && issue.message.toLowerCase().includes('email')) {
    return validationMessages.email(fieldPath);
  }

  // Handle custom messages
  if (issue.code === 'custom' && issue.message) {
    return issue.message;
  }

  // Default fallback
  return issue.message || validationMessages.invalidFormat(fieldPath);
}

/**
 * Create a global Zod error map for consistent German messages
 * Set this globally with z.setErrorMap(createGermanErrorMap())
 *
 * @returns ZodErrorMap that produces German error messages
 * @deprecated Use zodToValidationResult() instead for better compatibility
 */
export function createGermanErrorMap(): any {
  // TODO: Fix Zod error map signature compatibility
  // For now, use zodToValidationResult() which handles German messages correctly
  return undefined;
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