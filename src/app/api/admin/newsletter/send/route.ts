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
    const { newsletterId, html, subject, emailText, settings } = body;

    // Validate required fields
    if (!newsletterId) {
      return AppError.validation('Newsletter ID is required').toResponse();
    }

    if (!html) {
      return AppError.validation('Newsletter HTML content is required').toResponse();
    }

    if (!emailText) {
      return AppError.validation('Email recipient list is required').toResponse();
    }

    // Check if newsletter exists and is in draft status
    const newsletter = await prisma.newsletterItem.findUnique({
      where: { id: newsletterId }
    });

    if (!newsletter) {
      return AppError.validation('Newsletter not found').toResponse();
    }

    if (newsletter.status !== 'draft') {
      return AppError.validation('Only draft newsletters can be sent').toResponse();
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
      context: {
        valid: validationResult.valid,
        invalid: validationResult.invalid,
        new: validationResult.new,
        existing: validationResult.existing
      }
    });

    // Parse the original email list to get the plain emails
    const plainEmails = emailText
      .split('\n')
      .map((email: string) => email.trim())
      .filter((email: string) => email.length > 0)
      .filter((email: string) => !validationResult.invalidEmails.includes(email));

    // Prepare recipient IDs from validation results
    const recipientIds = validationResult.hashedEmails.map(recipient => recipient.id);

    // Update newsletter to sending status
    logger.info(`Starting newsletter sending process to ${recipientIds.length} recipients`);
    
    await prisma.newsletterItem.update({
      where: { id: newsletterId },
      data: {
        status: 'sending',
        content: html,
        recipientCount: recipientIds.length,
        sentAt: new Date(),
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
        logger.info(`Background job started for newsletter ${newsletterId}`);
        
        const sendResult = await sendNewsletter({
          html,
          subject,
          validatedRecipientIds: recipientIds,
          plainEmails, // Pass the plain emails for sending
          settings
        });
        
        // Update the newsletter record with the results
        const finalStatus = sendResult.success ? 
          (sendResult.failedCount > 0 ? 'partially_failed' : 'sent') : 
          'failed';
          
        await prisma.newsletterItem.update({
          where: { id: newsletterId },
          data: {
            status: finalStatus,
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
        logger.error('Background newsletter sending failed:', { context: { error } });
        
        // Update the newsletter record with the error
        await prisma.newsletterItem.update({
          where: { id: newsletterId },
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
      newsletterId: newsletterId
    });
  } catch (error) {
    logger.error('Error sending newsletter:', { context: { error } });
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