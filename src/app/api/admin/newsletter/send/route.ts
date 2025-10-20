import { NextRequest, NextResponse } from 'next/server';
import { processRecipientList, parseAndCleanEmailList } from '@/lib/newsletter';
import { AppError, apiErrorResponse } from '@/lib/errors';
import { logger } from '@/lib/logger';
import prisma from '@/lib/db/prisma';
import { getNewsletterSettings, createNewsletterAnalytics, addTrackingToNewsletter } from '@/lib/newsletter';
import { getBaseUrl } from '@/lib/base-url';
import { sendNewsletterSchema, zodToValidationResult } from '@/lib/validation';

/**
 * Process and send a newsletter to recipients
 */
async function handleSendNewsletter(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse request body
    const body = await request.json();

    // Validate with Zod schema
    const validation = await zodToValidationResult(sendNewsletterSchema, body);
    if (!validation.isValid) {
      logger.warn('Validation failed for newsletter sending', {
        module: 'api',
        context: {
          endpoint: '/api/admin/newsletter/send',
          errors: validation.errors
        }
      });

      return NextResponse.json(
        { error: 'Validierungsfehler', errors: validation.errors },
        { status: 400 }
      );
    }

    const { newsletterId, html, subject, emailText, settings } = validation.data!;

    // Check if newsletter exists and is in draft status
    const newsletter = await prisma.newsletterItem.findUnique({
      where: { id: newsletterId }
    });

    if (!newsletter) {
      return AppError.validation('Newsletter not found').toResponse();
    }

    if (!['draft', 'sent', 'failed', 'partially_failed'].includes(newsletter.status)) {
      return AppError.validation('Only draft, sent, failed, or partially failed newsletters can be sent').toResponse();
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

    // Parse the original email list to get the plain emails, with Excel-safe cleaning
    const plainEmails = parseAndCleanEmailList(emailText, validationResult.invalidEmails);

    // Prepare recipient IDs from validation results
    const recipientIds = validationResult.hashedEmails.map(recipient => recipient.id);

    // Create analytics record for this newsletter (optional - don't fail if it doesn't work)
    let trackedHtml = html;
    try {
      const analytics = await createNewsletterAnalytics(newsletterId, recipientIds.length);
      
      // Add tracking to the HTML content
      const baseUrl = getBaseUrl();
      trackedHtml = addTrackingToNewsletter(html, analytics.pixelToken, baseUrl);
      
      logger.info('Newsletter analytics created successfully', {
        context: { newsletterId, analyticsId: analytics.id }
      });
    } catch (analyticsError) {
      logger.warn('Failed to create newsletter analytics, proceeding without tracking', {
        context: { newsletterId, error: analyticsError }
      });
      // Continue with original HTML if analytics fails
      trackedHtml = html;
    }
    
    // Update newsletter to sending status
    logger.info(`Starting newsletter sending process to ${recipientIds.length} recipients`);
    
    await prisma.newsletterItem.update({
      where: { id: newsletterId },
      data: {
        status: 'sending',
        content: trackedHtml,
        recipientCount: recipientIds.length,
        sentAt: new Date(),
        settings: JSON.stringify({
          recipientCount: recipientIds.length,
          ...settings
        })
      }
    });
    
    // Get newsletter settings to determine chunk size
    const newsletterSettings = await getNewsletterSettings();
    const chunkSize = newsletterSettings.chunkSize || 50; // Use configured chunk size or default to 50
    const emailChunks: string[][] = [];
    
    // Divide plain emails into chunks
    for (let i = 0; i < plainEmails.length; i += chunkSize) {
      emailChunks.push(plainEmails.slice(i, i + chunkSize));
    }
    
    logger.info(`Newsletter prepared for chunked processing`, {
      context: {
        totalEmails: plainEmails.length,
        totalChunks: emailChunks.length,
        chunkSize,
        newsletterId
      }
    });
    
    // Store chunk information in newsletter settings
    await prisma.newsletterItem.update({
      where: { id: newsletterId },
      data: {
        settings: JSON.stringify({
          recipientCount: recipientIds.length,
          totalChunks: emailChunks.length,
          chunkSize,
          totalSent: 0,
          totalFailed: 0,
          completedChunks: 0,
          startedAt: new Date().toISOString(),
          ...settings
        })
      }
    });
    
    // Return chunks for frontend processing
    return NextResponse.json({
      success: true,
      message: 'Newsletter prepared for chunked sending',
      validRecipients: validationResult.valid,
      invalidRecipients: validationResult.invalid,
      newsletterId: newsletterId,
      emailChunks: emailChunks,
      totalChunks: emailChunks.length,
      chunkSize: chunkSize,
      html: trackedHtml,
      subject: subject,
      settings: settings
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
export const POST = handleSendNewsletter;

/**
 * GET handler is not supported for this endpoint
 */
export async function GET() {
  return new NextResponse('Method not allowed', { status: 405 });
}