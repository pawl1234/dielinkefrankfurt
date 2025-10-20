import { NextRequest, NextResponse } from 'next/server';
import { processRecipientList } from '@/lib/newsletter';
import { apiErrorResponse } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { validateRecipientsSchema, zodToValidationResult } from '@/lib/validation';

/**
 * POST /api/admin/newsletter/validate
 * 
 * Admin endpoint for validating newsletter recipient list.
 * Processes email list and returns validation statistics.
 * Authentication handled by middleware.
 * 
 * Request body:
 * - emailText: string - Raw text containing email addresses
 * 
 * Response:
 * - valid: number - Count of valid email addresses
 * - invalid: number - Count of invalid email addresses
 * - new: number - Count of new email addresses
 * - existing: number - Count of existing email addresses
 * - invalidEmails: string[] - List of invalid email addresses
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Validate with Zod schema
    const validation = await zodToValidationResult(validateRecipientsSchema, body);
    if (!validation.isValid) {
      logger.warn('Validation failed for recipient validation', {
        module: 'api',
        context: {
          endpoint: '/api/admin/newsletter/validate',
          method: 'POST',
          errors: validation.errors
        }
      });

      return NextResponse.json(
        { error: 'Validierungsfehler', errors: validation.errors },
        { status: 400 }
      );
    }

    const { emailText } = validation.data!;

    // Process recipient list
    logger.info('Processing newsletter recipient validation', {
      context: { 
        operation: 'validate_recipients'
      }
    });
    
    const validationResult = await processRecipientList(emailText);

    logger.info('Newsletter recipient validation completed', {
      context: {
        operation: 'validate_recipients',
        validCount: validationResult.valid,
        invalidCount: validationResult.invalid,
        newCount: validationResult.new,
        existingCount: validationResult.existing
      }
    });

    // Return validation results
    return NextResponse.json({
      valid: validationResult.valid,
      invalid: validationResult.invalid,
      new: validationResult.new,
      existing: validationResult.existing,
      invalidEmails: validationResult.invalidEmails
    });
  } catch (error) {
    logger.error('Error validating recipient list', { 
      context: { 
        operation: 'validate_recipients',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    });
    return apiErrorResponse(error, 'Failed to validate recipient list');
  }
}