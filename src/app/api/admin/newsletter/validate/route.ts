import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api-auth';
import { processRecipientList } from '@/lib/newsletter-sending';
import { AppError, apiErrorResponse } from '@/lib/errors';
import { logger } from '@/lib/logger';

/**
 * Handler for validating newsletter recipients
 */
async function handleValidateRecipients(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse request body
    const body = await request.json();
    const { emailText } = body;

    // Validate required fields
    if (!emailText) {
      return AppError.validation('Email recipient list is required').toResponse();
    }

    // Process recipient list
    logger.info('Processing newsletter recipient validation');
    const validationResult = await processRecipientList(emailText);

    // Return validation results
    return NextResponse.json({
      valid: validationResult.valid,
      invalid: validationResult.invalid,
      new: validationResult.new,
      existing: validationResult.existing,
      invalidEmails: validationResult.invalidEmails
    });
  } catch (error) {
    logger.error('Error validating recipient list:', { context: { error } });
    return apiErrorResponse(error, 'Failed to validate recipient list');
  }
}

/**
 * POST handler for validating newsletter recipients
 * Requires admin authentication
 */
export const POST = withAdminAuth(handleValidateRecipients);