import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import prisma from '@/lib/db/prisma';
import { sendEmail } from '@/lib/email';
import { ChunkResult, NewsletterSendingSettings } from '../../../../../../types/api-types';

/**
 * Interface for newsletter status response
 */
interface NewsletterStatusResponse {
  success: boolean;
  newsletterId: string;
  status: string;
  recipientCount: number;
  totalSent: number;
  totalFailed: number;
  completedChunks: number;
  totalChunks: number;
  isComplete: boolean;
  sentAt?: Date | null;
  lastChunkCompletedAt?: string;
  chunkResults?: Array<{
    sentCount: number;
    failedCount: number;
    completedAt: string;
  }>;
  error?: string;
}

/**
 * Send admin notification email for newsletter completion
 */
async function sendAdminNotificationEmail(newsletterId: string, settings: NewsletterSendingSettings, newsletterSubject?: string): Promise<{ success: boolean; error?: Error | unknown }> {
  try {
    const adminNotificationEmail = settings.adminNotificationEmail;
    
    if (!adminNotificationEmail) {
      console.log('No admin notification email configured');
      return { success: false, error: 'No admin notification email configured' };
    }

    const totalRecipients = settings.totalRecipients || 0;
    const successfulSends = settings.successfulSends || 0;
    const failedSends = settings.failedSends || 0;
    const successRate = totalRecipients > 0 ? Math.round((successfulSends / totalRecipients) * 100) : 0;
    
    // Get failed email addresses
    const failedEmails: string[] = [];
    const chunkResults = settings.chunkResults || [];
    chunkResults.forEach((chunk: ChunkResult) => {
      if (chunk.results) {
        chunk.results.forEach((result) => {
          if (!result.success && result.email) {
            failedEmails.push(result.email);
          }
        });
      }
    });

    const html = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <title>Newsletter Delivery Complete</title>
</head>
<body>
  <h2>Newsletter Delivery Complete${newsletterSubject ? `: ${newsletterSubject}` : ''}</h2>
  <p>Der Newsletter-Versand wurde abgeschlossen.</p>
  <p><strong>Gesamt-Empfänger:</strong> ${totalRecipients} Empfänger</p>
  <p><strong>Erfolgreich versendet:</strong> ${successfulSends} erfolgreich</p>
  <p><strong>Fehlgeschlagen:</strong> ${failedSends} fehlgeschlagen</p>
  <p><strong>Erfolgsrate:</strong> ${successRate}%</p>
  ${failedEmails.length > 0 ? `
  <h3>Fehlgeschlagene E-Mails:</h3>
  <ul>
    ${failedEmails.slice(0, 10).map(email => `<li>${email}</li>`).join('')}
    ${failedEmails.length > 10 ? `<li><em>... und ${failedEmails.length - 10} weitere</em></li>` : ''}
  </ul>
  ` : ''}
</body>
</html>
    `;

    const result = await sendEmail({
      to: adminNotificationEmail,
      subject: 'Newsletter Delivery Complete',
      html
    });

    return result;
  } catch (error) {
    return { success: false, error };
  }
}

/**
 * Get newsletter sending status
 */
async function handleGetNewsletterStatus(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const newsletterId = params.id;

    if (!newsletterId) {
      return AppError.validation('Newsletter ID is required').toResponse();
    }

    // Check if admin notification should be triggered
    const url = new URL(request.url);
    const triggerNotification = url.searchParams.get('triggerNotification') === 'true';

    // Get newsletter record
    const newsletter = await prisma.newsletterItem.findUnique({
      where: { id: newsletterId }
    });

    if (!newsletter) {
      return AppError.validation('Newsletter not found').toResponse();
    }

    // Parse settings to get progress information
    const settings = newsletter.settings ? JSON.parse(newsletter.settings) : {};
    const chunkResults = settings.chunkResults || [];
    const totalSent = settings.totalSent || 0;
    const totalFailed = settings.totalFailed || 0;
    const completedChunks = settings.completedChunks || 0;
    
    // Calculate total chunks (if not stored, estimate from recipient count)
    const chunkSize = 10; // Default chunk size for frontend processing
    const totalChunks = settings.totalChunks || Math.ceil((newsletter.recipientCount || 0) / chunkSize);
    
    // Determine if sending is complete
    const isComplete = ['sent', 'partially_failed', 'failed'].includes(newsletter.status) || 
                      completedChunks >= totalChunks;


    logger.info(`Newsletter status requested for ${newsletterId}`, {
      context: {
        status: newsletter.status,
        recipientCount: newsletter.recipientCount,
        totalSent,
        totalFailed,
        completedChunks,
        totalChunks,
        isComplete
      }
    });

    // Trigger admin notification if requested and sending is complete
    if (triggerNotification && isComplete) {
      logger.info(`Triggering admin notification for newsletter ${newsletterId}`);
      
      // Send admin notification synchronously for testing
      try {
        await sendAdminNotificationEmail(newsletterId, settings, newsletter.subject);
      } catch (error) {
        logger.error('Failed to send admin notification:', {
          context: { newsletterId, error }
        });
      }
    }

    const response: NewsletterStatusResponse = {
      success: true,
      newsletterId,
      status: newsletter.status,
      recipientCount: newsletter.recipientCount || 0,
      totalSent,
      totalFailed,
      completedChunks,
      totalChunks,
      isComplete,
      sentAt: newsletter.sentAt,
      lastChunkCompletedAt: settings.lastChunkCompletedAt,
      chunkResults
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Error getting newsletter status:', { context: { error } });
    
    const response: NewsletterStatusResponse = {
      success: false,
      newsletterId: params.id,
      status: 'error',
      recipientCount: 0,
      totalSent: 0,
      totalFailed: 0,
      completedChunks: 0,
      totalChunks: 0,
      isComplete: true,
      error: error instanceof Error ? error.message : String(error)
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * GET handler for newsletter status
 * Requires admin authentication
 */
export const GET = withAdminAuth(handleGetNewsletterStatus);

/**
 * POST handler is not supported for this endpoint
 */
export async function POST() {
  return new NextResponse('Method not allowed', { status: 405 });
}