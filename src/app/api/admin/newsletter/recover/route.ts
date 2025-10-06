import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import prisma from '@/lib/db/prisma';

/**
 * Interface for recovery request
 */
interface RecoveryRequest {
  newsletterId: string;
  action: 'reset_retry' | 'mark_complete' | 'reset_to_draft';
}

/**
 * Recover a stuck newsletter
 * This endpoint provides recovery options for newsletters stuck in various states
 */
async function handleRecovery(request: NextRequest): Promise<NextResponse> {
  try {
    const body: RecoveryRequest = await request.json();
    const { newsletterId, action } = body;

    logger.info(`Newsletter recovery requested`, {
      context: {
        newsletterId,
        action
      }
    });

    // Validate required fields
    if (!newsletterId || !action) {
      return AppError.validation('Missing required fields').toResponse();
    }

    // Get newsletter
    const newsletter = await prisma.newsletterItem.findUnique({
      where: { id: newsletterId }
    });

    if (!newsletter) {
      return AppError.validation('Newsletter not found').toResponse();
    }

    logger.info(`Newsletter found for recovery`, {
      context: {
        newsletterId,
        currentStatus: newsletter.status,
        action
      }
    });

    const currentSettings = newsletter.settings ? JSON.parse(newsletter.settings) : {};
    let updatedSettings = { ...currentSettings };
    let newStatus = newsletter.status;

    switch (action) {
      case 'reset_retry':
        // Reset retry process to allow retrying again
        if (newsletter.status !== 'retrying') {
          return AppError.validation('Newsletter is not in retrying state').toResponse();
        }
        
        // Keep the failed emails but reset retry progress
        updatedSettings = {
          ...updatedSettings,
          retryInProgress: false,
          currentRetryStage: 0,
          retryResults: [],
          retryStartedAt: undefined,
          retryCompletedAt: undefined
        };
        
        // Set status back to partially_failed to allow retry
        newStatus = 'partially_failed';
        
        logger.info(`Resetting retry process for newsletter`, {
          context: {
            newsletterId,
            failedEmailsCount: updatedSettings.failedEmails?.length || 0
          }
        });
        break;

      case 'mark_complete':
        // Force mark as sent (use with caution)
        if (!['retrying', 'partially_failed', 'sending'].includes(newsletter.status)) {
          return AppError.validation('Invalid status for marking complete').toResponse();
        }
        
        updatedSettings = {
          ...updatedSettings,
          retryInProgress: false,
          recoveredAt: new Date().toISOString(),
          recoveryNote: 'Manually marked as complete'
        };
        
        newStatus = 'sent';
        
        logger.warn(`Forcefully marking newsletter as sent`, {
          context: {
            newsletterId,
            previousStatus: newsletter.status,
            failedEmailsCount: updatedSettings.failedEmails?.length || 0
          }
        });
        break;

      case 'reset_to_draft':
        // Reset to draft state (allows editing and resending)
        if (newsletter.status === 'sent') {
          return AppError.validation('Cannot reset a sent newsletter to draft').toResponse();
        }
        
        // Clear all sending-related data
        updatedSettings = {
          recipientCount: updatedSettings.recipientCount,
          fromEmail: updatedSettings.fromEmail,
          fromName: updatedSettings.fromName,
          replyToEmail: updatedSettings.replyToEmail,
          testEmailRecipients: updatedSettings.testEmailRecipients,
          unsubscribeLink: updatedSettings.unsubscribeLink,
          // Clear sending data
          totalChunks: undefined,
          chunkSize: undefined,
          totalSent: undefined,
          totalFailed: undefined,
          completedChunks: undefined,
          startedAt: undefined,
          completedAt: undefined,
          chunkResults: undefined,
          failedEmails: undefined,
          retryInProgress: undefined,
          retryStartedAt: undefined,
          retryResults: undefined,
          currentRetryStage: undefined,
          lastChunkCompletedAt: undefined,
          recoveredAt: new Date().toISOString(),
          recoveryNote: 'Reset to draft for editing'
        };
        
        newStatus = 'draft';
        
        logger.info(`Resetting newsletter to draft`, {
          context: {
            newsletterId,
            previousStatus: newsletter.status
          }
        });
        break;

      default:
        return AppError.validation('Invalid recovery action').toResponse();
    }

    // Update newsletter
    await prisma.newsletterItem.update({
      where: { id: newsletterId },
      data: {
        status: newStatus,
        settings: JSON.stringify(updatedSettings)
      }
    });

    logger.info(`Newsletter recovery completed`, {
      context: {
        newsletterId,
        action,
        previousStatus: newsletter.status,
        newStatus,
        settingsUpdated: true
      }
    });

    return NextResponse.json({
      success: true,
      newsletterId,
      action,
      previousStatus: newsletter.status,
      newStatus,
      message: `Newsletter successfully recovered with action: ${action}`
    });

  } catch (error) {
    logger.error('Error recovering newsletter:', {
      context: {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack
        } : error
      }
    });

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST handler for newsletter recovery
 * Requires admin authentication
 */
export const POST = withAdminAuth(handleRecovery);

/**
 * GET handler to check recovery options for a newsletter
 */
async function handleGetRecoveryOptions(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const newsletterId = searchParams.get('newsletterId');

    if (!newsletterId) {
      return AppError.validation('Missing newsletter ID').toResponse();
    }

    const newsletter = await prisma.newsletterItem.findUnique({
      where: { id: newsletterId }
    });

    if (!newsletter) {
      return AppError.validation('Newsletter not found').toResponse();
    }

    const settings = newsletter.settings ? JSON.parse(newsletter.settings) : {};
    
    // Determine available recovery actions based on current state
    const availableActions: string[] = [];
    
    if (newsletter.status === 'retrying') {
      availableActions.push('reset_retry', 'mark_complete');
    }
    
    if (newsletter.status === 'partially_failed') {
      availableActions.push('mark_complete', 'reset_to_draft');
    }
    
    if (newsletter.status === 'sending') {
      availableActions.push('mark_complete', 'reset_to_draft');
    }
    
    if (newsletter.status === 'draft') {
      // No recovery needed for drafts
    }
    
    if (newsletter.status === 'sent') {
      // Cannot recover sent newsletters
    }

    return NextResponse.json({
      success: true,
      newsletterId,
      currentStatus: newsletter.status,
      availableActions,
      diagnostics: {
        hasSettings: !!newsletter.settings,
        retryInProgress: settings.retryInProgress || false,
        failedEmailsCount: settings.failedEmails?.length || 0,
        currentRetryStage: settings.currentRetryStage || 0,
        startedAt: settings.startedAt,
        lastActivity: settings.lastChunkCompletedAt || settings.retryStartedAt || settings.startedAt
      }
    });

  } catch (error) {
    logger.error('Error getting recovery options:', {
      context: {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack
        } : error
      }
    });

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export const GET = withAdminAuth(handleGetRecoveryOptions);