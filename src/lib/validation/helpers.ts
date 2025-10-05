/**
 * Zod integration utilities for converting Zod validation results
 * to the existing ValidationResult interface.
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
 * Convert Zod validation to ValidationResult format with German messages.
 *
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns ValidationResult with German field errors
 */
export async function zodToValidationResult<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): Promise<ZodValidationResult<T>> {
  const result = await schema.safeParseAsync(data);

  if (result.success) {
    return {
      isValid: true,
      data: result.data
    };
  }

  const errors: Record<string, string> = {};

  result.error.issues.forEach(issue => {
    const originalFieldPath = issue.path.length > 0 ? issue.path.join('.') : 'general';
    const { fieldPath, message } = mapZodErrorWithFieldPath(issue, originalFieldPath);
    errors[fieldPath] = message;
  });

  return {
    isValid: false,
    errors
  };
}
