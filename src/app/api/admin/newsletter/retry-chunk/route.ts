import { NextRequest, NextResponse } from 'next/server';
import { ApiHandler, SimpleRouteContext } from '@/types/api-types';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import prisma from '@/lib/db/prisma';
import { processSendingChunk } from '@/lib/newsletter';
import { getNewsletterSettings } from '@/lib/newsletter';
import { sendEmail } from '@/lib/email';

/**
 * Interface for retry processing request
 */
interface RetryRequest {
  newsletterId: string;
  html: string;
  subject: string;
  settings?: {
    fromEmail?: string;
    fromName?: string;
    replyToEmail?: string;
    chunkDelay?: number;
    [key: string]: unknown;
  };
  // Frontend-driven chunk processing
  chunkEmails?: string[];  // Specific emails to process in this request
  chunkIndex?: number;     // Current chunk index for progress tracking
}

/**
 * Interface for retry processing response
 */
interface RetryResponse {
  success: boolean;
  stage: number;
  totalStages: number;
  processedEmails: number;
  remainingFailedEmails: string[];
  isComplete: boolean;
  finalFailedEmails?: string[];
  newsletterStatus?: string;
  error?: string;
}


/**
 * Process a single chunk of emails provided by the frontend
 */
async function processFrontendChunk(params: {
  newsletterId: string;
  newsletter: { id: string; status: string; settings: string | null };
  chunkEmails: string[];
  chunkIndex: number;
  html: string;
  subject: string;
  settings?: Record<string, unknown>;
  currentSettings: Record<string, unknown>;
}): Promise<NextResponse> {
  const { 
    newsletterId, 
    chunkEmails, 
    chunkIndex, 
    html, 
    subject, 
    settings
  } = params;
  
  try {
    // Get newsletter settings
    const defaultSettings = await getNewsletterSettings();
    const emailSettings = { ...defaultSettings, ...settings };
    
    logger.info(`Processing frontend chunk ${chunkIndex} with ${chunkEmails.length} emails`, {
      module: 'api',
      context: {
        endpoint: '/api/admin/newsletter/retry-chunk',
        method: 'POST',
        newsletterId,
        chunkIndex,
        emailCount: chunkEmails.length
      }
    });
    
    // Use the consolidated sending method
    const chunkResult = await processSendingChunk(
      chunkEmails,
      newsletterId,
      {
        ...emailSettings,
        html,
        subject,
        chunkIndex,
        totalChunks: 1 // Frontend chunks are processed individually
      },
      'retry'
    );
    
    // Extract successful and failed emails from results
    const successfulEmails = chunkResult.results
      .filter(r => r.success)
      .map(r => r.email);
    const failedEmails = chunkResult.results
      .filter(r => !r.success)
      .map(r => r.email);
    
    logger.info(`Frontend chunk ${chunkIndex} completed`, {
      module: 'api',
      context: {
        endpoint: '/api/admin/newsletter/retry-chunk',
        method: 'POST',
        newsletterId,
        chunkIndex,
        successful: successfulEmails.length,
        failed: failedEmails.length
      }
    });
    
    return NextResponse.json({
      success: true,
      chunkIndex,
      processedCount: chunkResult.results.length,
      successfulEmails,
      failedEmails,
      results: chunkResult.results
    });
    
  } catch (error) {
    logger.error(error as Error, {
      module: 'api',
      context: {
        endpoint: '/api/admin/newsletter/retry-chunk',
        method: 'POST',
        operation: 'processFrontendChunk',
        newsletterId,
        chunkIndex
      }
    });
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      chunkIndex
    }, { status: 500 });
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
 * Admin endpoint for retrying failed email sends with smaller chunk sizes.
 * Supports both full retry processing and frontend-driven chunk processing.
 * Uses the consolidated processSendingChunk method for actual sending.
 * Authentication handled by middleware.
 * 
 * Request body:
 * - newsletterId: string - Newsletter to retry
 * - html: string - Newsletter HTML content
 * - subject: string - Email subject line
 * - settings?: object - Optional email settings overrides
 * - chunkEmails?: string[] - Specific emails to process (frontend-driven mode)
 * - chunkIndex?: number - Current chunk index for progress tracking
 */
export async function POST(request: NextRequest) {
  try {
    const body: RetryRequest = await request.json();
    const { newsletterId, html, subject, settings, chunkEmails, chunkIndex } = body;

    logger.debug('Processing retry chunk', {
      module: 'api',
      context: {
        endpoint: '/api/admin/newsletter/retry-chunk',
        method: 'POST',
        newsletterId,
        hasHtml: !!html,
        hasSubject: !!subject,
        hasSettings: !!settings,
        hasFrontendChunk: !!chunkEmails,
        chunkSize: chunkEmails?.length,
        chunkIndex
      }
    });

    // Validate required fields
    if (!newsletterId || !html || !subject) {
      logger.warn('Retry chunk validation failed - missing required fields', {
        module: 'api',
        context: {
          endpoint: '/api/admin/newsletter/retry-chunk',
          method: 'POST',
          hasNewsletterId: !!newsletterId,
          hasHtml: !!html,
          hasSubject: !!subject
        }
      });
      return AppError.validation('Missing required fields').toResponse();
    }

    // Get newsletter
    const newsletter = await prisma.newsletterItem.findUnique({
      where: { id: newsletterId }
    });

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
        const refreshedNewsletter = await prisma.newsletterItem.findUnique({
          where: { id: newsletterId }
        });
        
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

    // Frontend-driven chunk processing
    if (chunkEmails && chunkEmails.length > 0) {
      // Process specific chunk provided by frontend
      return await processFrontendChunk({
        newsletterId,
        newsletter,
        chunkEmails,
        chunkIndex: chunkIndex || 0,
        html,
        subject,
        settings,
        currentSettings
      });
    }
    
    // Legacy full retry processing (kept for backward compatibility)
    const { 
      failedEmails, 
      retryChunkSizes, 
      currentRetryStage = 0,
      retryResults = []
    } = currentSettings;

    if (!failedEmails || failedEmails.length === 0) {
      return AppError.validation('No failed emails to retry').toResponse();
    }

    if (currentRetryStage >= retryChunkSizes.length) {
      // All retry stages completed, finalize
      return await finalizeRetryProcess(newsletterId, retryResults, currentSettings);
    }

    // Get newsletter settings
    const defaultSettings = await getNewsletterSettings();
    const emailSettings = { ...defaultSettings, ...settings };
    const currentChunkSize = retryChunkSizes[currentRetryStage];
    
    logger.info(`Processing retry stage ${currentRetryStage + 1}/${retryChunkSizes.length} with chunk size ${currentChunkSize}`, {
      module: 'api',
      context: {
        endpoint: '/api/admin/newsletter/retry-chunk',
        method: 'POST',
        newsletterId,
        failedEmailsCount: failedEmails.length,
        currentChunkSize
      }
    });

    // Process emails in chunks of current retry size
    const stageResults: Array<{ email: string; success: boolean; error?: unknown }> = [];
    let processedCount = 0;

    for (let i = 0; i < failedEmails.length; i += currentChunkSize) {
      const emailChunk = failedEmails.slice(i, i + currentChunkSize);
      const chunkIndex = Math.floor(i / currentChunkSize);
      
      // Use the consolidated sending method
      const chunkResult = await processSendingChunk(
        emailChunk,
        newsletterId,
        {
          ...emailSettings,
          html,
          subject,
          chunkIndex,
          totalChunks: Math.ceil(failedEmails.length / currentChunkSize)
        },
        'retry'
      );
      
      // Add results to stage results
      chunkResult.results.forEach(result => {
        stageResults.push({
          email: result.email,
          success: result.success,
          error: result.error
        });
      });
      
      processedCount += chunkResult.results.length;

      // Delay between chunks
      if (i + currentChunkSize < failedEmails.length) {
        const chunkDelay = emailSettings.chunkDelay || 500;
        await new Promise(resolve => setTimeout(resolve, chunkDelay));
      }
    }

    // Analyze results of this stage
    const stillFailedEmails = stageResults
      .filter(result => !result.success)
      .map(result => result.email);

    const successfulEmails = stageResults
      .filter(result => result.success)
      .map(result => result.email);

    // Update retry results
    retryResults[currentRetryStage] = {
      chunkSize: currentChunkSize,
      processedCount,
      successCount: successfulEmails.length,
      failedCount: stillFailedEmails.length,
      completedAt: new Date().toISOString(),
      results: stageResults
    };

    logger.info(`Retry stage ${currentRetryStage + 1} completed`, {
      module: 'api',
      context: {
        endpoint: '/api/admin/newsletter/retry-chunk',
        method: 'POST',
        newsletterId,
        processed: processedCount,
        successful: successfulEmails.length,
        stillFailed: stillFailedEmails.length
      }
    });

    // Determine next step
    const nextStage = currentRetryStage + 1;
    let isComplete = false;
    let finalStatus = 'retrying';

    if (stillFailedEmails.length === 0) {
      // All emails succeeded in this stage
      isComplete = true;
      finalStatus = 'sent';
    } else if (nextStage >= retryChunkSizes.length) {
      // No more retry stages, finalize with remaining failed emails
      isComplete = true;
      finalStatus = 'partially_failed';
    }

    // Update newsletter settings
    await prisma.newsletterItem.update({
      where: { id: newsletterId },
      data: {
        status: finalStatus,
        settings: JSON.stringify({
          ...currentSettings,
          currentRetryStage: nextStage,
          retryResults,
          failedEmails: stillFailedEmails,
          retryInProgress: !isComplete,
          retryCompletedAt: isComplete ? new Date().toISOString() : undefined
        })
      }
    });

    const response: RetryResponse = {
      success: true,
      stage: currentRetryStage + 1,
      totalStages: retryChunkSizes.length,
      processedEmails: successfulEmails.length,
      remainingFailedEmails: stillFailedEmails,
      isComplete,
      finalFailedEmails: isComplete ? stillFailedEmails : undefined,
      newsletterStatus: finalStatus
    };

    return NextResponse.json(response);

  } catch (error) {
    logger.error(error as Error, {
      module: 'api',
      context: {
        endpoint: '/api/admin/newsletter/retry-chunk',
        method: 'POST',
        operation: 'handleRetryProcessing'
      }
    });
    
    const response: RetryResponse = {
      success: false,
      stage: 0,
      totalStages: 0,
      processedEmails: 0,
      remainingFailedEmails: [],
      isComplete: false,
      error: error instanceof Error ? error.message : String(error)
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * Finalize retry process when all stages are completed
 */
async function finalizeRetryProcess(
  newsletterId: string, 
  retryResults: Array<{
    chunkSize: number;
    processedCount: number;
    successCount: number;
    failedCount: number;
    completedAt: string;
    results: Array<{ email: string; success: boolean; error?: unknown }>;
  }>, 
  currentSettings: Record<string, unknown>
): Promise<NextResponse> {
  // Get final failed emails from last retry stage
  const lastStageResults = retryResults[retryResults.length - 1];
  const finalFailedEmails = lastStageResults?.results
    ?.filter((result) => !result.success)
    ?.map((result) => result.email) || [];

  const finalStatus = finalFailedEmails.length === 0 ? 'sent' : 'partially_failed';

  await prisma.newsletterItem.update({
    where: { id: newsletterId },
    data: {
      status: finalStatus,
      settings: JSON.stringify({
        ...currentSettings,
        retryInProgress: false,
        retryCompletedAt: new Date().toISOString(),
        finalFailedEmails
      })
    }
  });

  logger.info(`Retry process finalized for newsletter ${newsletterId}`, {
    module: 'api',
    context: {
      endpoint: '/api/admin/newsletter/retry-chunk',
      method: 'POST',
      newsletterId,
      finalStatus,
      finalFailedCount: finalFailedEmails.length
    }
  });

  const response: RetryResponse = {
    success: true,
    stage: retryResults.length,
    totalStages: retryResults.length,
    processedEmails: 0,
    remainingFailedEmails: finalFailedEmails,
    isComplete: true,
    finalFailedEmails,
    newsletterStatus: finalStatus
  };

  return NextResponse.json(response);
}

/**
 * GET handler is not supported for this endpoint
 */
export const GET: ApiHandler<SimpleRouteContext> = async () => {
  return new NextResponse('Method not allowed', { status: 405 });
};