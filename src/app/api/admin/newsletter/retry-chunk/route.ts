import { NextRequest, NextResponse } from 'next/server';
import { ApiHandler, SimpleRouteContext } from '@/types/api-types';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { getNewsletterById } from '@/lib/db/newsletter-operations';
import { processSendingChunk } from '@/lib/newsletter';
import { getNewsletterSettings } from '@/lib/newsletter';
import { sendEmail } from '@/lib/email';
import { retryChunkSchema, zodToValidationResult } from '@/lib/validation';
import { ValidatedEmails, RetryChunkResponse } from '@/types/email-types';

/**
 * Interface for retry processing request
 */
interface RetryRequest {
  newsletterId: string;
  html: string;
  subject: string;
  validatedEmails: ValidatedEmails;
  chunkIndex: number;
  settings?: {
    fromEmail?: string;
    fromName?: string;
    replyToEmail?: string;
    chunkDelay?: number;
    [key: string]: unknown;
  };
}

/**
 * Process a single chunk of emails provided by the frontend
 */
async function processFrontendChunk(params: {
  newsletterId: string;
  newsletter: { id: string; status: string; settings: string | null };
  validatedEmails: ValidatedEmails;
  chunkIndex: number;
  html: string;
  subject: string;
  settings?: Record<string, unknown>;
  currentSettings: Record<string, unknown>;
}): Promise<NextResponse> {
  const {
    newsletterId,
    validatedEmails,
    chunkIndex,
    html,
    subject,
    settings
  } = params;

  try {
    const defaultSettings = await getNewsletterSettings();
    const emailSettings = { ...defaultSettings, ...settings };

    logger.info(`Processing frontend chunk ${chunkIndex} with ${validatedEmails.length} emails`, {
      module: 'api',
      context: {
        newsletterId,
        chunkIndex,
        emailCount: validatedEmails.length
      }
    });

    const chunkResult = await processSendingChunk(
      validatedEmails,
      newsletterId,
      {
        ...emailSettings,
        html,
        subject,
        chunkIndex,
        totalChunks: 1
      },
      'retry'
    );

    const successfulEmails = chunkResult.results
      .filter(r => r.success)
      .map(r => r.email);
    const failedEmails = chunkResult.results
      .filter(r => !r.success)
      .map(r => r.email);

    logger.info(`Frontend chunk ${chunkIndex} completed`, {
      module: 'api',
      context: {
        newsletterId,
        chunkIndex,
        successful: successfulEmails.length,
        failed: failedEmails.length
      }
    });

    const response: RetryChunkResponse = {
      success: true,
      chunkIndex,
      processedCount: chunkResult.results.length,
      sentCount: chunkResult.sentCount,
      failedCount: chunkResult.failedCount,
      successfulEmails,
      failedEmails,
      results: chunkResult.results
    };

    return NextResponse.json(response);

  } catch (error) {
    logger.error(error as Error, {
      module: 'api',
      context: {
        operation: 'processFrontendChunk',
        newsletterId,
        chunkIndex
      }
    });

    const errorResponse: RetryChunkResponse = {
      success: false,
      chunkIndex,
      processedCount: 0,
      sentCount: 0,
      failedCount: 0,
      successfulEmails: [],
      failedEmails: [],
      results: [],
      error: error instanceof Error ? error.message : String(error)
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * Send admin notification for permanent email delivery failures
 */
async function sendPermanentFailureNotification(
  newsletterId: string, 
  permanentFailures: Array<{ email: string; error: string; attempts: number }>,
  settings: Record<string, unknown>
): Promise<void> {
  const adminEmail = (settings.adminNotificationEmail as string) || 'admin@die-linke-frankfurt.de';
  
  // Build HTML content for the notification email
  const failureCount = permanentFailures.length;
  const failureListHtml = permanentFailures
    .map(failure => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${failure.email}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${failure.error}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${failure.attempts}</td>
      </tr>
    `)
    .join('');

  const html = `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Newsletter: Permanente Zustellfehler</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 0px; }
        .header { background-color: #FF0000; color: white; padding: 20px; text-align: center; margin: -30px -30px 30px -30px; }
        .content { color: #333; line-height: 1.6; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background-color: #f8f9fa; padding: 12px 8px; text-align: left; border-bottom: 2px solid #ddd; }
        td { padding: 8px; border-bottom: 1px solid #ddd; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Die Linke Frankfurt</h1>
          <h2>Newsletter: Permanente Zustellfehler</h2>
        </div>
        
        <div class="content">
          <p>Hallo,</p>
          
          <p>beim Versand des Newsletters (ID: ${newsletterId}) sind <strong>${failureCount} Empfänger</strong> mit permanenten Zustellfehlern identifiziert worden.</p>
          
          <p>Diese E-Mail-Adressen haben die maximale Anzahl von Zustellversuchen erreicht und konnten nicht erfolgreich zugestellt werden:</p>
          
          <table>
            <thead>
              <tr>
                <th>E-Mail-Adresse</th>
                <th>Fehlermeldung</th>
                <th>Versuche</th>
              </tr>
            </thead>
            <tbody>
              ${failureListHtml}
            </tbody>
          </table>
          
          <p>Diese E-Mail-Adressen sollten aus der Newsletter-Liste entfernt oder überprüft werden.</p>
          
          <p>Bitte überprüfen Sie die Kontaktdaten und nehmen Sie gegebenenfalls Kontakt mit den betroffenen Personen auf.</p>
          
          <p>Mit freundlichen Grüßen,<br>
          Das Newsletter-System</p>
        </div>
        
        <div class="footer">
          <p>Diese Benachrichtigung wurde automatisch vom Newsletter-System generiert.</p>
          <p>Newsletter-ID: ${newsletterId} | Fehlgeschlagene Zustellungen: ${failureCount}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  logger.info(`Sending permanent failure notification for newsletter ${newsletterId}`, {
    module: 'api',
    context: {
      endpoint: '/api/admin/newsletter/retry-chunk',
      newsletterId,
      adminEmail,
      failureCount,
      failures: permanentFailures
    }
  });

  try {
    await sendEmail({
      to: adminEmail,
      subject: 'Newsletter: Permanent Delivery Failures',
      html,
      from: 'Die Linke Frankfurt <noreply@die-linke-frankfurt.de>',
      replyTo: 'buero@die-linke-frankfurt.de'
    });

    logger.info(`Permanent failure notification sent successfully for newsletter ${newsletterId}`, {
      module: 'api',
      context: {
        endpoint: '/api/admin/newsletter/retry-chunk',
        newsletterId,
        adminEmail,
        failureCount
      }
    });
  } catch (error) {
    logger.error('Failed to send permanent failure notification', {
      module: 'api',
      context: {
        endpoint: '/api/admin/newsletter/retry-chunk',
        newsletterId,
        adminEmail,
        error: error instanceof Error ? error.message : String(error)
      }
    });
    throw error;
  }
}

/**
 * POST /api/admin/newsletter/retry-chunk
 *
 * Process a single chunk of failed emails for retry.
 * Called by frontend in a loop for each retry chunk.
 * Uses the consolidated processSendingChunk method for actual sending.
 * Authentication handled by middleware.
 *
 * Request body:
 * - newsletterId: string - Newsletter to retry (required)
 * - html: string - Newsletter HTML content (required)
 * - subject: string - Email subject line (required)
 * - validatedEmails: ValidatedEmails - Specific emails to process in this chunk (required)
 * - chunkIndex: number - Current chunk index for progress tracking (required)
 * - settings?: object - Optional email settings overrides
 *
 * Response: RetryChunkResponse
 * - success: boolean - Whether the chunk was processed successfully
 * - chunkIndex: number - The chunk index that was processed
 * - processedCount: number - Number of emails processed
 * - sentCount: number - Number of emails sent successfully
 * - failedCount: number - Number of emails that failed
 * - successfulEmails: string[] - Emails that were sent successfully
 * - failedEmails: string[] - Emails that failed to send
 * - results: EmailSendResult[] - Detailed results for each email
 */
export async function POST(request: NextRequest) {
  try {
    const body: RetryRequest = await request.json();

    const validation = await zodToValidationResult(retryChunkSchema, body);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Validierungsfehler', errors: validation.errors },
        { status: 400 }
      );
    }

    const { newsletterId, html, subject, settings, validatedEmails, chunkIndex } = validation.data!;

    logger.debug('Processing retry chunk', {
      module: 'api',
      context: {
        newsletterId,
        hasHtml: !!html,
        hasSubject: !!subject,
        hasSettings: !!settings,
        hasFrontendChunk: !!validatedEmails,
        chunkSize: validatedEmails?.length,
        chunkIndex
      }
    });

    // Get newsletter
    const newsletter = await getNewsletterById(newsletterId);

    logger.debug('Newsletter loaded for retry', {
      module: 'api',
      context: {
        endpoint: '/api/admin/newsletter/retry-chunk',
        method: 'POST',
        newsletterId,
        found: !!newsletter,
        status: newsletter?.status,
        hasSettings: !!newsletter?.settings
      }
    });

    if (!newsletter) {
      logger.warn('Newsletter not found for retry', {
        module: 'api',
        context: {
          endpoint: '/api/admin/newsletter/retry-chunk',
          method: 'POST',
          newsletterId
        }
      });
      return AppError.validation('Newsletter not found').toResponse();
    }

    if (newsletter.status !== 'retrying') {
      logger.warn('Newsletter not in retrying state', {
        module: 'api',
        context: {
          endpoint: '/api/admin/newsletter/retry-chunk',
          method: 'POST',
          newsletterId,
          currentStatus: newsletter.status,
          expected: 'retrying'
        }
      });
      return AppError.validation('Newsletter is not in retry state').toResponse();
    }

    const currentSettings = newsletter.settings ? JSON.parse(newsletter.settings) : {};
    
    logger.debug('Newsletter settings parsed for retry', {
      module: 'api',
      context: {
        endpoint: '/api/admin/newsletter/retry-chunk',
        method: 'POST',
        newsletterId,
        hasRetryInProgress: !!currentSettings.retryInProgress,
        retryInProgress: currentSettings.retryInProgress,
        hasFailedEmails: !!currentSettings.failedEmails,
        failedEmailsCount: currentSettings.failedEmails?.length || 0,
        currentRetryStage: currentSettings.currentRetryStage,
        retryChunkSizes: currentSettings.retryChunkSizes
      }
    });

    // Check for permanent failures and send admin notification if found
    const maxRetryAttempts = (currentSettings.maxRetryAttempts as number) || 3;
    const chunkResults = currentSettings.chunkResults as Array<{
      chunkNumber: number;
      success: boolean;
      results: Array<{ email: string; success: boolean; error: string; attempts: number }>;
    }> || [];

    // Collect all permanent failures (emails that have reached max retry attempts)
    const permanentFailures: Array<{ email: string; error: string; attempts: number }> = [];
    
    chunkResults.forEach(chunk => {
      if (chunk.results) {
        chunk.results.forEach(result => {
          if (!result.success && result.attempts >= maxRetryAttempts) {
            permanentFailures.push({
              email: result.email,
              error: result.error || 'Unknown error',
              attempts: result.attempts
            });
          }
        });
      }
    });

    // Send admin notification for permanent failures if any are found
    if (permanentFailures.length > 0) {
      logger.info(`Found ${permanentFailures.length} permanent failures for newsletter ${newsletterId}`, {
        module: 'api',
        context: {
          endpoint: '/api/admin/newsletter/retry-chunk',
          method: 'POST',
          newsletterId,
          permanentFailures: permanentFailures.map(f => ({ email: f.email, attempts: f.attempts }))
        }
      });

      try {
        await sendPermanentFailureNotification(newsletterId, permanentFailures, currentSettings);
        
        // If we found permanent failures and sent notification, return success
        // This handles the case where the API is called just to detect permanent failures
        return NextResponse.json({
          success: true,
          permanentFailuresDetected: permanentFailures.length,
          notificationSent: true,
          message: `Admin notification sent for ${permanentFailures.length} permanent failures`
        });
      } catch (notificationError) {
        logger.error('Failed to send permanent failure notification', {
          module: 'api',
          context: {
            endpoint: '/api/admin/newsletter/retry-chunk',
            method: 'POST',
            newsletterId,
            error: notificationError instanceof Error ? notificationError.message : String(notificationError)
          }
        });
        return NextResponse.json({
          success: false,
          error: 'Failed to send permanent failure notification',
          permanentFailuresDetected: permanentFailures.length
        }, { status: 500 });
      }
    }
    
    // If retry is not in progress but status is retrying, wait a moment and retry
    if (!currentSettings.retryInProgress) {
      logger.warn('Retry not in progress, waiting for initialization', {
        module: 'api',
        context: {
          endpoint: '/api/admin/newsletter/retry-chunk',
          method: 'POST',
          newsletterId,
          retryInProgress: currentSettings.retryInProgress
        }
      });
      
      // Wait up to 5 seconds for the retry process to be initialized
      let retryAttempts = 0;
      const maxRetryAttempts = 10;
      
      while (retryAttempts < maxRetryAttempts) {
        await new Promise(resolve => setTimeout(resolve, 500));
        retryAttempts++;
        
        logger.debug(`Waiting for retry initialization, attempt ${retryAttempts}/${maxRetryAttempts}`, {
          module: 'api',
          context: {
            endpoint: '/api/admin/newsletter/retry-chunk',
            method: 'POST',
            newsletterId
          }
        });
        
        // Re-fetch newsletter to check if retry process is now initialized
        const refreshedNewsletter = await getNewsletterById(newsletterId);
        
        if (refreshedNewsletter?.settings) {
          const refreshedSettings = JSON.parse(refreshedNewsletter.settings);
          
          logger.debug('Refreshed newsletter settings', {
            module: 'api',
            context: {
              endpoint: '/api/admin/newsletter/retry-chunk',
              method: 'POST',
              newsletterId,
              attempt: retryAttempts,
              status: refreshedNewsletter.status,
              hasRetryInProgress: !!refreshedSettings.retryInProgress,
              retryInProgress: refreshedSettings.retryInProgress,
              hasFailedEmails: !!refreshedSettings.failedEmails,
              failedEmailsCount: refreshedSettings.failedEmails?.length || 0
            }
          });
          
          if (refreshedSettings.retryInProgress) {
            // Update currentSettings and break the loop
            Object.assign(currentSettings, refreshedSettings);
            logger.info(`Retry process found after ${retryAttempts} attempts`, {
              module: 'api',
              context: {
                endpoint: '/api/admin/newsletter/retry-chunk',
                method: 'POST',
                newsletterId,
                retryAttempts
              }
            });
            break;
          }
        }
      }
      
      if (!currentSettings.retryInProgress) {
        logger.error(new Error(`No retry process in progress after ${maxRetryAttempts} attempts`), {
          module: 'api',
          context: {
            endpoint: '/api/admin/newsletter/retry-chunk',
            method: 'POST',
            newsletterId,
            maxRetryAttempts
          }
        });
        return AppError.validation('No retry process in progress').toResponse();
      }
    }

    if (validatedEmails && validatedEmails.length > 0) {
      return await processFrontendChunk({
        newsletterId,
        newsletter,
        validatedEmails,
        chunkIndex: chunkIndex || 0,
        html,
        subject,
        settings,
        currentSettings
      });
    }

    return NextResponse.json(
      { error: 'validatedEmails is required for retry processing' },
      { status: 400 }
    );

  } catch (error) {
    logger.error(error as Error, {
      module: 'api',
      context: {
        endpoint: '/api/admin/newsletter/retry-chunk',
        method: 'POST',
        operation: 'processRetryChunk'
      }
    });

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

/**
 * GET handler is not supported for this endpoint
 */
export const GET: ApiHandler<SimpleRouteContext> = async () => {
  return new NextResponse('Method not allowed', { status: 405 });
};