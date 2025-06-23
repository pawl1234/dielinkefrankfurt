import { NextRequest, NextResponse } from 'next/server';
import { ApiHandler, SimpleRouteContext } from '@/types/api-types';
import { withAdminAuth } from '@/lib/api-auth';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { processSendingChunk } from '@/lib/newsletter-sending';
import { getNewsletterSettings } from '@/lib/newsletter-service';

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
 * POST /api/admin/newsletter/retry-chunk
 * 
 * Admin endpoint for retrying failed email sends with smaller chunk sizes.
 * Supports both full retry processing and frontend-driven chunk processing.
 * Uses the consolidated processSendingChunk method for actual sending.
 * Authentication required.
 * 
 * Request body:
 * - newsletterId: string - Newsletter to retry
 * - html: string - Newsletter HTML content
 * - subject: string - Email subject line
 * - settings?: object - Optional email settings overrides
 * - chunkEmails?: string[] - Specific emails to process (frontend-driven mode)
 * - chunkIndex?: number - Current chunk index for progress tracking
 */
export const POST: ApiHandler<SimpleRouteContext> = withAdminAuth(async (request: NextRequest) => {
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
});

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