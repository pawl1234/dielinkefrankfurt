import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api-auth';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { createTransporter, sendEmailWithTransporter } from '@/lib/email';
import { getNewsletterSettings } from '@/lib/newsletter-service';
import { validateEmail, cleanEmail } from '@/lib/email-hashing';
import { format } from 'date-fns';

/**
 * Interface for retry processing request
 */
interface RetryRequest {
  newsletterId: string;
  html: string;
  subject: string;
  settings?: any;
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
 * Format subject line with template variables
 */
function formatSubject(template: string): string {
  const currentDate = format(new Date(), 'dd.MM.yyyy');
  return template.replace('{date}', currentDate);
}

/**
 * Process retry for a newsletter with failed emails
 */
async function handleRetryProcessing(request: NextRequest): Promise<NextResponse> {
  try {
    const body: RetryRequest = await request.json();
    const { newsletterId, html, subject, settings } = body;

    logger.info(`Retry-chunk API called for newsletter ${newsletterId}`, {
      context: {
        newsletterId,
        hasHtml: !!html,
        hasSubject: !!subject,
        hasSettings: !!settings
      }
    });

    // Validate required fields
    if (!newsletterId || !html || !subject) {
      logger.error('Missing required fields in retry-chunk request', {
        context: {
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

    logger.info(`Newsletter found in database`, {
      context: {
        newsletterId,
        found: !!newsletter,
        status: newsletter?.status,
        hasSettings: !!newsletter?.settings
      }
    });

    if (!newsletter) {
      logger.error('Newsletter not found in database', { context: { newsletterId } });
      logger.error('RETURNING 400: Newsletter not found', { context: { newsletterId } });
      return AppError.validation('Newsletter not found').toResponse();
    }

    if (newsletter.status !== 'retrying') {
      logger.error('Newsletter is not in retrying state', {
        context: {
          newsletterId,
          currentStatus: newsletter.status,
          expected: 'retrying'
        }
      });
      logger.error('RETURNING 400: Newsletter is not in retry state', { context: { newsletterId, status: newsletter.status } });
      return AppError.validation('Newsletter is not in retry state').toResponse();
    }

    const currentSettings = newsletter.settings ? JSON.parse(newsletter.settings) : {};
    
    logger.info(`Newsletter settings parsed`, {
      context: {
        newsletterId,
        hasRetryInProgress: !!currentSettings.retryInProgress,
        retryInProgress: currentSettings.retryInProgress,
        hasFailedEmails: !!currentSettings.failedEmails,
        failedEmailsCount: currentSettings.failedEmails?.length || 0,
        currentRetryStage: currentSettings.currentRetryStage,
        retryChunkSizes: currentSettings.retryChunkSizes,
        settingsKeys: Object.keys(currentSettings)
      }
    });
    
    // If retry is not in progress but status is retrying, wait a moment and retry
    if (!currentSettings.retryInProgress) {
      logger.warn(`Retry not in progress, waiting for initialization`, {
        context: { newsletterId, retryInProgress: currentSettings.retryInProgress }
      });
      
      // Wait up to 5 seconds for the retry process to be initialized
      let retryAttempts = 0;
      const maxRetryAttempts = 10;
      
      while (retryAttempts < maxRetryAttempts) {
        await new Promise(resolve => setTimeout(resolve, 500));
        retryAttempts++;
        
        logger.info(`Waiting for retry initialization, attempt ${retryAttempts}/${maxRetryAttempts}`, {
          context: { newsletterId }
        });
        
        // Re-fetch newsletter to check if retry process is now initialized
        const refreshedNewsletter = await prisma.newsletterItem.findUnique({
          where: { id: newsletterId }
        });
        
        if (refreshedNewsletter?.settings) {
          const refreshedSettings = JSON.parse(refreshedNewsletter.settings);
          
          logger.info(`Refreshed newsletter settings`, {
            context: {
              newsletterId,
              attempt: retryAttempts,
              status: refreshedNewsletter.status,
              hasRetryInProgress: !!refreshedSettings.retryInProgress,
              retryInProgress: refreshedSettings.retryInProgress,
              hasFailedEmails: !!refreshedSettings.failedEmails,
              failedEmailsCount: refreshedSettings.failedEmails?.length || 0,
              settingsKeys: Object.keys(refreshedSettings)
            }
          });
          
          if (refreshedSettings.retryInProgress) {
            // Update currentSettings and break the loop
            Object.assign(currentSettings, refreshedSettings);
            logger.info(`Retry process found after ${retryAttempts} attempts`, {
              context: { newsletterId, retryAttempts }
            });
            break;
          }
        }
      }
      
      if (!currentSettings.retryInProgress) {
        logger.error(`No retry process in progress after ${maxRetryAttempts} attempts`, {
          context: {
            newsletterId,
            maxRetryAttempts,
            currentSettings: JSON.stringify(currentSettings, null, 2)
          }
        });
        
        logger.error('RETURNING 400: No retry process in progress', { context: { newsletterId } });
        return AppError.validation('No retry process in progress').toResponse();
      }
    }

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
    
    // Format subject line
    const formattedSubject = formatSubject(subject);
    
    // Prepare sender information
    const fromEmail = emailSettings.fromEmail || 'newsletter@die-linke-frankfurt.de';
    const fromName = emailSettings.fromName || 'Die Linke Frankfurt';
    const from = `${fromName} <${fromEmail}>`;
    const replyTo = emailSettings.replyToEmail || fromEmail;

    const currentChunkSize = retryChunkSizes[currentRetryStage];
    
    logger.info(`Processing retry stage ${currentRetryStage + 1}/${retryChunkSizes.length} with chunk size ${currentChunkSize}`, {
      context: {
        newsletterId,
        failedEmailsCount: failedEmails.length,
        currentChunkSize
      }
    });

    // Create transporter
    let transporter = createTransporter(emailSettings);
    
    // Verify transporter
    try {
      await transporter.verify();
    } catch (verifyError: any) {
      logger.error('SMTP transporter verification failed during retry', {
        context: { error: verifyError, newsletterId }
      });
      return AppError.validation('SMTP connection failed').toResponse();
    }

    // Process emails in chunks of current retry size
    const stageResults: Array<{ email: string; success: boolean; error?: any }> = [];
    let processedCount = 0;

    for (let i = 0; i < failedEmails.length; i += currentChunkSize) {
      const emailChunk = failedEmails.slice(i, i + currentChunkSize);
      
      // Process each email in the chunk
      for (const email of emailChunk) {
        try {
          const result = await sendEmailWithTransporter(transporter, {
            to: email,
            subject: formattedSubject,
            html,
            from,
            replyTo,
            settings: emailSettings
          });

          stageResults.push({
            email,
            success: result.success,
            error: result.success ? undefined : result.error
          });

          processedCount++;

          // Small delay between emails
          const emailDelay = emailSettings.emailDelay || 50;
          await new Promise(resolve => setTimeout(resolve, emailDelay));

        } catch (error) {
          stageResults.push({
            email,
            success: false,
            error
          });
          processedCount++;
        }
      }

      // Delay between chunks
      if (i + currentChunkSize < failedEmails.length) {
        const chunkDelay = emailSettings.chunkDelay || 500;
        await new Promise(resolve => setTimeout(resolve, chunkDelay));
      }
    }

    // Close transporter
    transporter.close();

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
      context: {
        newsletterId,
        processed: processedCount,
        successful: successfulEmails.length,
        stillFailed: stillFailedEmails.length
      }
    });

    // Determine next step
    let nextStage = currentRetryStage + 1;
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
    logger.error('Error processing retry:', { 
      context: { 
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : error,
        newsletterId: request.url
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
async function finalizeRetryProcess(newsletterId: string, retryResults: any[], currentSettings: any): Promise<NextResponse> {
  // Get final failed emails from last retry stage
  const lastStageResults = retryResults[retryResults.length - 1];
  const finalFailedEmails = lastStageResults?.results
    ?.filter((result: any) => !result.success)
    ?.map((result: any) => result.email) || [];

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
    context: {
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
 * POST handler for processing retry chunks
 * Requires admin authentication
 */
export const POST = withAdminAuth(handleRetryProcessing);

/**
 * GET handler is not supported for this endpoint
 */
export async function GET() {
  return new NextResponse('Method not allowed', { status: 405 });
}