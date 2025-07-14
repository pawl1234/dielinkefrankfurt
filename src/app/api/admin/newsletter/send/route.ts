import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api-auth';
import { processRecipientList } from '@/lib/newsletter-sending';
import { AppError, apiErrorResponse } from '@/lib/errors';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { getNewsletterSettings } from '@/lib/newsletter-service';
import { cleanEmail } from '@/lib/email-hashing';
import { createNewsletterAnalytics } from '@/lib/newsletter-analytics';
import { addTrackingToNewsletter } from '@/lib/newsletter-tracking';
import { getBaseUrl } from '@/lib/base-url';

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
    const plainEmails = emailText
      .split('\n')
      .map((email: string) => {
        const originalEmail = email;
        const cleanedEmail = cleanEmail(email);
        
        // Log if cleaning changed the email (indicates invisible characters from Excel)
        if (originalEmail !== cleanedEmail && cleanedEmail.length > 0) {
          logger.info(`Cleaned email during parsing`, {
            context: {
              original: JSON.stringify(originalEmail),
              cleaned: cleanedEmail,
              originalLength: originalEmail.length,
              cleanedLength: cleanedEmail.length
            }
          });
        }
        
        return cleanedEmail;
      })
      .filter((email: string) => email.length > 0)
      .filter((email: string) => !validationResult.invalidEmails.includes(email));

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
export const POST = withAdminAuth(handleSendNewsletter);

/**
 * GET handler is not supported for this endpoint
 */
export async function GET() {
  return new NextResponse('Method not allowed', { status: 405 });
}