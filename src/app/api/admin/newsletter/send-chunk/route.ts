import { NextRequest, NextResponse } from 'next/server';
import { ApiHandler, SimpleRouteContext } from '@/types/api-types';
import { withAdminAuth } from '@/lib/api-auth';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { getNewsletterSettings } from '@/lib/newsletter-service';
import { processSendingChunk } from '@/lib/newsletter-sending';
import { ChunkResult } from '@/types/api-types';

/**
 * Interface for chunk processing request
 */
interface ChunkRequest {
  newsletterId: string;
  html: string;
  subject: string;
  emails: string[];
  chunkIndex: number;
  totalChunks: number;
  settings?: Record<string, unknown>;
}

/**
 * Interface for chunk processing response
 */
interface ChunkResponse {
  success: boolean;
  chunkIndex: number;
  totalChunks: number;
  sentCount: number;
  failedCount: number;
  isComplete: boolean;
  newsletterStatus?: string;
  error?: string;
}

/**
 * Start retry process for failed emails with progressively smaller chunk sizes
 */
async function startRetryProcess(newsletterId: string, chunkResults: unknown[], currentSettings: Record<string, unknown>) {
  try {
    // Get newsletter settings for retry configuration
    const newsletterSettings = await getNewsletterSettings();
    const retryChunkSizes = (newsletterSettings.retryChunkSizes || '10,5,1')
      .split(',')
      .map(size => parseInt(size.trim()))
      .filter(size => size > 0);

    // Collect all failed emails from all chunks
    const failedEmails: string[] = [];
    chunkResults.forEach(chunk => {
      const chunkData = chunk as { results?: Array<{ success?: boolean; email?: string }> };
      if (chunkData?.results) {
        chunkData.results.forEach((result: { success?: boolean; email?: string }) => {
          if (!result.success && result.email) {
            failedEmails.push(result.email);
          }
        });
      }
    });

    if (failedEmails.length === 0) {
      return; // No failed emails to retry
    }

    logger.info(`Starting retry process for ${failedEmails.length} failed emails`, {
      module: 'api',
      context: {
        endpoint: '/api/admin/newsletter/send-chunk',
        newsletterId,
        failedCount: failedEmails.length,
        retryChunkSizes
      }
    });

    // Prepare retry settings
    const retrySettings = {
      ...currentSettings,
      retryInProgress: true,
      retryStartedAt: new Date().toISOString(),
      failedEmails,
      retryChunkSizes,
      currentRetryStage: 0,
      retryResults: []
    };

    logger.info(`Updating newsletter with retry settings`, {
      module: 'api',
      context: {
        endpoint: '/api/admin/newsletter/send-chunk',
        newsletterId,
        retryInProgress: retrySettings.retryInProgress,
        failedEmailsCount: retrySettings.failedEmails.length
      }
    });

    // Store retry information in newsletter settings
    await prisma.newsletterItem.update({
      where: { id: newsletterId },
      data: {
        settings: JSON.stringify(retrySettings)
      }
    });

    // Verify the update was successful
    const updatedNewsletter = await prisma.newsletterItem.findUnique({
      where: { id: newsletterId }
    });

    if (updatedNewsletter?.settings) {
      const verifySettings = JSON.parse(updatedNewsletter.settings);
      logger.info(`Verified newsletter update - retry process initialized`, {
        module: 'api',
        context: {
          endpoint: '/api/admin/newsletter/send-chunk',
          newsletterId,
          status: updatedNewsletter.status,
          retryInProgress: verifySettings.retryInProgress,
          failedEmailsCount: verifySettings.failedEmails?.length || 0,
          currentRetryStage: verifySettings.currentRetryStage
        }
      });
    }

  } catch (error) {
    logger.error(error as Error, {
      module: 'api',
      context: { 
        endpoint: '/api/admin/newsletter/send-chunk',
        operation: 'startRetryProcess',
        newsletterId 
      }
    });
  }
}

/**
 * POST /api/admin/newsletter/send-chunk
 * 
 * Admin endpoint for processing a chunk of emails in a newsletter send operation.
 * Uses the consolidated processSendingChunk method for actual sending.
 * Tracks progress and handles retry initialization.
 * Authentication required.
 * 
 * Request body:
 * - newsletterId: string - Newsletter to send
 * - html: string - Newsletter HTML content
 * - subject: string - Email subject line
 * - emails: string[] - Array of recipient emails for this chunk
 * - chunkIndex: number - Current chunk index (0-based)
 * - totalChunks: number - Total number of chunks
 * - settings?: object - Optional email settings overrides
 */
export const POST: ApiHandler<SimpleRouteContext> = withAdminAuth(async (request: NextRequest) => {
  try {
    const body: ChunkRequest = await request.json();
    const { newsletterId, html, subject, emails, chunkIndex, totalChunks, settings } = body;

    logger.debug('Processing email chunk', {
      module: 'api',
      context: {
        endpoint: '/api/admin/newsletter/send-chunk',
        method: 'POST',
        newsletterId,
        chunkIndex,
        totalChunks,
        emailCount: emails?.length
      }
    });

    // Validate required fields
    if (!newsletterId || !html || !subject || !emails || emails.length === 0) {
      logger.warn('Send chunk validation failed - missing required fields', {
        module: 'api',
        context: {
          endpoint: '/api/admin/newsletter/send-chunk',
          method: 'POST',
          hasNewsletterId: !!newsletterId,
          hasHtml: !!html,
          hasSubject: !!subject,
          hasEmails: !!emails,
          emailCount: emails?.length || 0
        }
      });

      return AppError.validation('Missing required fields').toResponse();
    }

    // Get newsletter settings
    const defaultSettings = await getNewsletterSettings();
    const emailSettings = { ...defaultSettings, ...settings };

    // Verify newsletter exists and is in sending status
    const newsletter = await prisma.newsletterItem.findUnique({
      where: { id: newsletterId }
    });

    if (!newsletter) {
      logger.warn('Newsletter not found for send chunk', {
        module: 'api',
        context: {
          endpoint: '/api/admin/newsletter/send-chunk',
          method: 'POST',
          newsletterId
        }
      });

      return AppError.validation('Newsletter not found').toResponse();
    }

    if (!['sending', 'draft'].includes(newsletter.status)) {
      logger.warn('Newsletter not in sendable state', {
        module: 'api',
        context: {
          endpoint: '/api/admin/newsletter/send-chunk',
          method: 'POST',
          newsletterId,
          status: newsletter.status
        }
      });

      return AppError.validation('Newsletter is not in a sendable state').toResponse();
    }

    logger.info(`Processing chunk ${chunkIndex + 1}/${totalChunks} for newsletter ${newsletterId}`, {
      module: 'api',
      context: {
        endpoint: '/api/admin/newsletter/send-chunk',
        method: 'POST',
        emailCount: emails.length,
        chunkIndex,
        totalChunks
      }
    });

    // Use the consolidated sending method
    const chunkResult = await processSendingChunk(
      emails,
      newsletterId,
      {
        ...emailSettings,
        html,
        subject,
        chunkIndex,
        totalChunks
      },
      'initial'
    );

    // Check if this is the last chunk
    const isComplete = chunkIndex === totalChunks - 1;
    
    // Update newsletter progress
    const currentSettings = newsletter.settings ? JSON.parse(newsletter.settings) : {};
    const chunkResults = currentSettings.chunkResults || [];
    
    // Store this chunk's results
    chunkResults[chunkIndex] = chunkResult;

    // Calculate total progress
    const totalSent = chunkResults.reduce((sum: number, chunk: ChunkResult) => sum + (chunk?.sentCount || 0), 0);
    const totalFailed = chunkResults.reduce((sum: number, chunk: ChunkResult) => sum + (chunk?.failedCount || 0), 0);
    
    let finalStatus = newsletter.status;
    let finalSettings = {
      ...currentSettings,
      chunkResults,
      totalSent,
      totalFailed,
      lastChunkCompletedAt: new Date().toISOString(),
      completedChunks: chunkIndex + 1
    };

    if (isComplete) {
      if (totalFailed === 0) {
        finalStatus = 'sent';
      } else {
        // Check if we should start retry process
        finalStatus = 'retrying';
        
        // Trigger retry process for failed emails
        await startRetryProcess(newsletterId, chunkResults, currentSettings);
        
        // Fetch the updated settings to preserve retry data
        const updatedNewsletter = await prisma.newsletterItem.findUnique({
          where: { id: newsletterId }
        });
        
        if (updatedNewsletter?.settings) {
          const retrySettings = JSON.parse(updatedNewsletter.settings);
          // Merge retry settings with our chunk completion data
          finalSettings = {
            ...retrySettings,
            chunkResults,
            totalSent,
            totalFailed,
            lastChunkCompletedAt: new Date().toISOString(),
            completedChunks: chunkIndex + 1
          };
          
          logger.info(`Merged retry settings with chunk completion data`, {
            module: 'api',
            context: {
              endpoint: '/api/admin/newsletter/send-chunk',
              method: 'POST',
              newsletterId,
              hasRetryInProgress: !!finalSettings.retryInProgress,
              hasFailedEmails: !!finalSettings.failedEmails,
              failedEmailsCount: finalSettings.failedEmails?.length || 0
            }
          });
        }
      }
    }

    // Update newsletter record with merged settings
    await prisma.newsletterItem.update({
      where: { id: newsletterId },
      data: {
        status: finalStatus,
        settings: JSON.stringify(finalSettings),
        sentAt: isComplete && finalStatus === 'sent' ? new Date() : null
      }
    });

    logger.info(`Chunk ${chunkIndex + 1}/${totalChunks} completed`, {
      module: 'api',
      context: {
        endpoint: '/api/admin/newsletter/send-chunk',
        method: 'POST',
        sent: chunkResult.sentCount,
        failed: chunkResult.failedCount,
        totalSent,
        totalFailed,
        isComplete,
        finalStatus
      }
    });

    const response: ChunkResponse = {
      success: true,
      chunkIndex,
      totalChunks,
      sentCount: chunkResult.sentCount,
      failedCount: chunkResult.failedCount,
      isComplete,
      newsletterStatus: finalStatus
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error(error as Error, {
      module: 'api',
      context: {
        endpoint: '/api/admin/newsletter/send-chunk',
        method: 'POST',
        operation: 'processSendChunk'
      }
    });
    
    const response: ChunkResponse = {
      success: false,
      chunkIndex: 0,
      totalChunks: 0,
      sentCount: 0,
      failedCount: 0,
      isComplete: false,
      error: error instanceof Error ? error.message : String(error)
    };
    
    return NextResponse.json(response, { status: 500 });
  }
});

/**
 * GET handler is not supported for this endpoint
 */
export const GET: ApiHandler<SimpleRouteContext> = async () => {
  return new NextResponse('Method not allowed', { status: 405 });
};