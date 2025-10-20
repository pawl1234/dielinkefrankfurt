import { NextRequest, NextResponse } from 'next/server';
import { sendNewsletterTestEmail, fixUrlsInNewsletterHtml } from '@/lib/newsletter';
import { AppError, apiErrorResponse } from '@/lib/errors';
import { logger } from '@/lib/logger';
import prisma from '@/lib/db/prisma';
import { sendTestEmailSchema, zodToValidationResult } from '@/lib/validation';

/**
 * POST /api/admin/newsletter/send-test
 * 
 * Admin endpoint for sending a test newsletter email.
 * Sends test email to configured test recipients.
 * Authentication handled by middleware.
 * 
 * Request body:
 * - html: string (optional) - HTML content to send
 * - newsletterId: number (optional) - ID of existing newsletter to send
 * 
 * Response:
 * - success: boolean - Whether the test was sent successfully
 * - message: string - Success message with recipient count
 * - messageId: string - Email provider message ID
 * - recipientCount: number - Number of recipients
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate with Zod schema
    const validation = await zodToValidationResult(sendTestEmailSchema, body);
    if (!validation.isValid) {
      logger.warn('Validation failed for send test email', {
        module: 'api',
        context: {
          endpoint: '/api/admin/newsletter/send-test',
          method: 'POST',
          errors: validation.errors
        }
      });

      return NextResponse.json(
        { error: 'Validierungsfehler', errors: validation.errors },
        { status: 400 }
      );
    }

    const { html, newsletterId } = validation.data!;

    let newsletterHtml = html;
    let testRecipients: string | undefined;
    
    // If newsletterId is provided, fetch the newsletter content
    if (newsletterId && !html) {
      logger.info('Fetching newsletter content for test email', {
        context: { 
          operation: 'send_test_newsletter',
          newsletterId 
        }
      });
      
      const newsletter = await prisma.newsletterItem.findUnique({
        where: { id: newsletterId }
      });
      
      if (!newsletter) {
        logger.warn('Newsletter not found for test email', {
          context: { 
            operation: 'send_test_newsletter',
            newsletterId 
          }
        });
        return AppError.notFound('Newsletter not found').toResponse();
      }
      
      newsletterHtml = fixUrlsInNewsletterHtml(newsletter.content || '');
      
      // Extract test recipients from newsletter settings if available
      if (newsletter.settings) {
        try {
          const newsletterSettings = JSON.parse(newsletter.settings);
          testRecipients = newsletterSettings.testEmailRecipients;
        } catch (error) {
          logger.warn('Failed to parse newsletter settings', {
            context: { 
              operation: 'send_test_newsletter',
              newsletterId,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          });
        }
      }
    } else if (html) {
      // Fix URLs in the provided HTML as well
      newsletterHtml = fixUrlsInNewsletterHtml(html);
    }
    
    if (!newsletterHtml) {
      logger.warn('Test newsletter attempted without HTML content');
      return AppError.validation('Newsletter HTML content is required').toResponse();
    }
    
    logger.info('Sending test newsletter email', {
      context: { 
        operation: 'send_test_newsletter',
        hasNewsletterHtml: !!newsletterHtml,
        newsletterId: newsletterId || null
      }
    });
    
    const result = await sendNewsletterTestEmail(newsletterHtml, testRecipients);
    
    if (result.success) {
      logger.info('Test newsletter email sent successfully', {
        context: {
          operation: 'send_test_newsletter',
          recipientCount: result.recipientCount,
          messageId: result.messageId
        }
      });
      
      return NextResponse.json({
        success: true,
        message: `Test emails sent successfully to ${result.recipientCount} recipient${result.recipientCount !== 1 ? 's' : ''}`,
        messageId: result.messageId,
        recipientCount: result.recipientCount
      });
    } else {
      logger.error('Failed to send test newsletter email', {
        context: {
          operation: 'send_test_newsletter',
          error: result.error instanceof Error ? result.error.message : 'Unknown error'
        }
      });
      
      return NextResponse.json(
        { 
          error: 'Failed to send test email', 
          details: result.error instanceof Error ? result.error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('Error sending test newsletter email', {
      context: {
        operation: 'send_test_newsletter',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    });
    return apiErrorResponse(error, 'Failed to send test email');
  }
}