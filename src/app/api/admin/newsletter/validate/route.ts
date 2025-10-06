import { NextRequest, NextResponse } from 'next/server';
import { ApiHandler, SimpleRouteContext } from '@/types/api-types';
import { withAdminAuth } from '@/lib/auth';
import { processRecipientList } from '@/lib/newsletter';
import { AppError, apiErrorResponse } from '@/lib/errors';
import { logger } from '@/lib/logger';

/**
 * POST /api/admin/newsletter/validate
 * 
 * Admin endpoint for validating newsletter recipient list.
 * Processes email list and returns validation statistics.
 * Authentication required.
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
export const POST: ApiHandler<SimpleRouteContext> = withAdminAuth(async (request: NextRequest) => {
  try {
    // Parse request body
    const body = await request.json();
    const { emailText } = body;

    // Validate required fields
    if (!emailText) {
      logger.warn('Newsletter recipient validation attempted without email text');
      return AppError.validation('Email recipient list is required').toResponse();
    }

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
});