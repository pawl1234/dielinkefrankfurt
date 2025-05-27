import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api-auth';
import { processRecipientList, sendNewsletter } from '@/lib/newsletter-sending';
import { AppError, apiErrorResponse, ErrorType } from '@/lib/errors';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';

/**
 * Process and send a newsletter to recipients
 */
async function handleSendNewsletter(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse request body
    const body = await request.json();
    const { html, subject, emailText, settings } = body;

    // Validate required fields
    if (!html) {
      return AppError.validation('Newsletter HTML content is required').toResponse();
    }

    if (!emailText) {
      return AppError.validation('Email recipient list is required').toResponse();
    }

    // Process recipient list
    logger.info('Processing newsletter recipient list');
    const validationResult = await processRecipientList(emailText);

    // Ensure we have valid recipients
    if (validationResult.valid === 0) {
      return AppError.validation('No valid email recipients found', {
        validCount: validationResult.valid,
        invalidCount: validationResult.invalid
      }).toResponse();
    }

    // Log recipient statistics
    logger.info('Newsletter recipient validation completed', {
      valid: validationResult.valid,
      invalid: validationResult.invalid,
      new: validationResult.new,
      existing: validationResult.existing
    });

    // Parse the original email list to get the plain emails
    const plainEmails = emailText
      .split('\n')
      .map(email => email.trim())
      .filter(email => email.length > 0)
      .filter(email => !validationResult.invalidEmails.includes(email));

    // Prepare recipient IDs from validation results
    const recipientIds = validationResult.hashedEmails.map(recipient => recipient.id);

    // Create a newsletter record first
    logger.info(`Starting newsletter sending process to ${recipientIds.length} recipients`);
    
    // Start the email sending process in the background
    // Create a pending newsletter record
    const sentNewsletter = await prisma.sentNewsletter.create({
      data: {
        sentAt: new Date(),
        subject: subject || 'Newsletter - Die Linke Frankfurt',
        recipientCount: recipientIds.length,
        content: html,
        status: 'processing',
        settings: JSON.stringify({
          recipientCount: recipientIds.length,
          ...settings
        })
      }
    });
    
    // Start background processing without awaiting it
    // This allows the API to respond immediately
    (async () => {
      try {
        logger.info(`Background job started for newsletter ${sentNewsletter.id}`);
        
        const sendResult = await sendNewsletter({
          html,
          subject,
          validatedRecipientIds: recipientIds,
          plainEmails, // Pass the plain emails for sending
          settings
        });
        
        // Update the newsletter record with the results
        await prisma.sentNewsletter.update({
          where: { id: sentNewsletter.id },
          data: {
            status: sendResult.success ? 'completed' : 'failed',
            settings: JSON.stringify({
              recipientCount: recipientIds.length,
              sentCount: sendResult.sentCount,
              failedCount: sendResult.failedCount,
              ...settings
            })
          }
        });
        
        // Log a single summary message
        logger.info(`Newsletter sending completed: ${sendResult.sentCount} sent, ${sendResult.failedCount} failed`);
      } catch (error) {
        logger.error('Background newsletter sending failed:', error);
        
        // Update the newsletter record with the error
        await prisma.sentNewsletter.update({
          where: { id: sentNewsletter.id },
          data: {
            status: 'failed',
            settings: JSON.stringify({
              error: error instanceof Error ? error.message : String(error),
              ...settings
            })
          }
        });
      }
    })();
    
    // Return immediate success response
    return NextResponse.json({
      success: true,
      message: 'Newsletter sending started in background',
      validRecipients: validationResult.valid,
      invalidRecipients: validationResult.invalid,
      newsletterId: sentNewsletter.id
    });
  } catch (error) {
    logger.error('Error sending newsletter:', error);
    return apiErrorResponse(error, 'Failed to process and send newsletter');
  }
}

/**
 * POST handler for sending newsletters
 * Requires admin authentication
 */
export const POST = withAdminAuth(handleSendNewsletter);

/**
 * GET handler is not supported for this endpoint
 */
export async function GET() {
  return new NextResponse('Method not allowed', { status: 405 });
}