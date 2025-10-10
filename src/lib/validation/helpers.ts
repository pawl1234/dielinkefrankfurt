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
  // Dev-only: Log input data before validation
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 [Zod Validation Middleware] Input:', JSON.stringify(data, null, 2));
  }

  const result = await schema.safeParseAsync(data);

  if (result.success) {
    // Dev-only: Log successful validation
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ [Zod Validation Middleware] Validation PASSED');
    }

    return {
      isValid: true,
      data: result.data
    };
  }

  // Dev-only: Log validation failures with detailed error info
  if (process.env.NODE_ENV === 'development') {
    console.log('❌ [Zod Validation Middleware] Validation FAILED');
    console.log('📋 [Zod Validation Middleware] Zod Issues:', JSON.stringify(result.error.issues, null, 2));
  }

  const errors: Record<string, string> = {};

  result.error.issues.forEach(issue => {
    const originalFieldPath = issue.path.length > 0 ? issue.path.join('.') : 'general';
    const { fieldPath, message } = mapZodErrorWithFieldPath(issue, originalFieldPath);
    errors[fieldPath] = message;
  });

  // Dev-only: Log mapped errors
  if (process.env.NODE_ENV === 'development') {
    console.log('🗺️  [Zod Validation Middleware] Mapped Errors:', JSON.stringify(errors, null, 2));
  }

  return {
    isValid: false,
    errors
  };
}
