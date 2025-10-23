/**
 * Newsletter Sending Service
 *
 * Consolidated service handling all newsletter sending operations:
 * - Email validation and processing
 * - SMTP transporter management with retry logic
 * - Batch and individual email sending
 * - Chunk processing and progress tracking
 * - Retry process initialization
 *
 * This replaces: sending-coordinator, email-processor-service, email-sender-service,
 * transporter-manager, chunk-aggregator-service, send-session-service
 */

import { sendEmailWithTransporter, createTransporter } from '@/lib/email';
import type { SMTPTransporter } from '@/lib/email';
import { logger } from '@/lib/logger';
import { updateNewsletterItem, getNewsletterById } from '@/lib/db/newsletter-operations';
import type { NewsletterSettings } from '@/types/newsletter-types';
import { extractEmailSettings } from '@/types/newsletter-types';
import { ChunkResult, EmailSendResult, NewsletterSendingState } from '@/types/api-types';
import { getNewsletterSettings } from './settings-service';
import { ValidatedEmails } from '@/types/email-types';

// ============================================================================
// PUBLIC API - Chunk Sending
// ============================================================================

/**
 * Send a chunk of emails for a newsletter
 * TRUSTS email input - Zod already verified format at API boundary
 *
 * @param chunk - Array of validated email addresses (already cleaned and verified)
 * @param newsletterId - Newsletter ID for logging and tracking
 * @param settings - Newsletter settings including SMTP configuration and content
 * @param mode - Whether this is initial sending or retry mode
 * @returns ChunkResult with details of successful and failed sends
 */
export async function processSendingChunk(
  chunk: ValidatedEmails,
  newsletterId: string,
  settings: NewsletterSettings & {
    html: string;
    subject: string;
    chunkIndex?: number;
    totalChunks?: number;
  },
  mode: 'initial' | 'retry' = 'initial'
): Promise<ChunkResult> {
  const startTime = new Date();
  let results: EmailSendResult[] = [];

  try {
    const chunkInfo = settings.chunkIndex !== undefined
      ? `chunk ${settings.chunkIndex + 1}/${settings.totalChunks || '?'}`
      : `${mode} chunk`;

    logger.info(`Processing ${chunkInfo} for newsletter ${newsletterId}`, {
      module: 'newsletter-sending',
      context: {
        newsletterId,
        emailCount: chunk.length,
        mode,
        chunkIndex: settings.chunkIndex,
        totalChunks: settings.totalChunks
      }
    });

    if (chunk.length === 0) {
      return {
        sentCount: 0,
        failedCount: 0,
        completedAt: new Date().toISOString(),
        results: []
      };
    }

    // Create and verify transporter
    const verificationResult = await createAndVerifyTransporter(
      settings,
      newsletterId,
      mode,
      chunkInfo
    );

    if (!verificationResult) {
      // Return all emails as failed if transporter verification failed
      chunk.forEach(email => {
        results.push({
          email,
          success: false,
          error: 'SMTP connection failed'
        });
      });

      return {
        sentCount: 0,
        failedCount: chunk.length,
        completedAt: new Date().toISOString(),
        results
      };
    }

    const { transporter } = verificationResult;

    // Send emails using appropriate method
    let sendResult;
    if (chunk.length > 1) {
      sendResult = await sendViaBCC(
        transporter,
        chunk,
        settings,
        newsletterId,
        mode,
        chunkInfo
      );
    } else {
      sendResult = await sendIndividually(
        transporter,
        chunk,
        settings,
        newsletterId,
        mode
      );
    }

    results = [...results, ...sendResult.results];

    // Step 4: Close transporter
    closeTransporter(transporter, newsletterId, mode);

    // Step 5: Calculate totals and return
    const sentCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    logger.info(`${chunkInfo} completed`, {
      module: 'newsletter-sending',
      context: {
        newsletterId,
        mode,
        sent: sentCount,
        failed: failedCount,
        duration: Date.now() - startTime.getTime()
      }
    });

    return {
      sentCount,
      failedCount,
      completedAt: new Date().toISOString(),
      results
    };
  } catch (error) {
    logger.error('Error processing email chunk', {
      module: 'newsletter-sending',
      context: {
        error,
        newsletterId,
        mode
      }
    });

    // Return all emails as failed if we haven't processed them yet
    if (results.length === 0) {
      chunk.forEach(email => {
        results.push({
          email,
          success: false,
          error: String(error)
        });
      });
    }

    return {
      sentCount: results.filter(r => r.success).length,
      failedCount: results.filter(r => !r.success).length,
      completedAt: new Date().toISOString(),
      results
    };
  }
}

// ============================================================================
// PUBLIC API - Progress Tracking
// ============================================================================

/**
 * Update newsletter status and settings after chunk completion
 * Handles aggregation, status determination, and retry initialization
 *
 * @param newsletterId - Newsletter ID
 * @param chunkIndex - Index of current chunk
 * @param totalChunks - Total number of chunks
 * @param chunkResult - Result of current chunk
 * @param currentSettings - Current newsletter settings
 * @returns Final status, settings, and completion flag
 */
export async function updateNewsletterAfterChunk(
  newsletterId: string,
  chunkIndex: number,
  totalChunks: number,
  chunkResult: ChunkResult,
  currentSettings: NewsletterSendingState
): Promise<{
  finalStatus: string;
  finalSettings: NewsletterSendingState;
  isComplete: boolean;
}> {
  const isComplete = chunkIndex === totalChunks - 1;

  // Get existing chunk results
  const chunkResults = currentSettings.chunkResults || [];
  chunkResults[chunkIndex] = chunkResult;

  // Calculate aggregations (inline - simple reduce)
  const totalSent = chunkResults.reduce(
    (sum, chunk) => sum + (chunk?.sentCount || 0),
    0
  );
  const totalFailed = chunkResults.reduce(
    (sum, chunk) => sum + (chunk?.failedCount || 0),
    0
  );
  const completedChunks = chunkResults.filter(chunk => chunk !== undefined && chunk !== null).length;

  // Merge settings with chunk completion data
  let finalSettings: NewsletterSendingState = {
    ...currentSettings,
    chunkResults,
    totalSent,
    totalFailed,
    lastChunkCompletedAt: new Date().toISOString(),
    completedChunks
  };

  // Determine status (inline - simple logic tree)
  let finalStatus = currentSettings.status || 'sending';

  if (isComplete) {
    if (totalFailed === 0) {
      finalStatus = 'sent';
    } else {
      finalStatus = 'retrying';
    }

    // If there are failures and we should retry, initialize retry process
    if (finalStatus === 'retrying') {
      await initializeRetryProcess(newsletterId, chunkResults, currentSettings);

      // Fetch updated settings after retry initialization
      const updatedNewsletter = await getNewsletterById(newsletterId);

      if (updatedNewsletter?.settings) {
        const retrySettings: NewsletterSendingState = JSON.parse(updatedNewsletter.settings);
        // Merge retry settings with our chunk completion data
        finalSettings = {
          ...retrySettings,
          ...finalSettings
        };

        logger.info(`Merged retry settings with chunk completion data`, {
          module: 'newsletter-sending',
          context: {
            newsletterId,
            hasRetryInProgress: !!finalSettings.retryInProgress,
            hasFailedEmails: !!finalSettings.failedEmails,
            failedEmailsCount: finalSettings.failedEmails?.length || 0
          }
        });
      }
    }
  }

  // Update newsletter in database
  await updateNewsletterItem(newsletterId, {
    status: finalStatus,
    settings: JSON.stringify(finalSettings),
    sentAt: isComplete && finalStatus === 'sent' ? new Date() : undefined
  });

  logger.info(`Chunk ${chunkIndex + 1}/${totalChunks} completed`, {
    module: 'newsletter-sending',
    context: {
      sent: chunkResult.sentCount,
      failed: chunkResult.failedCount,
      totalSent,
      totalFailed,
      isComplete,
      finalStatus
    }
  });

  return {
    finalStatus,
    finalSettings,
    isComplete
  };
}

// ============================================================================
// PRIVATE HELPERS - Transporter Management
// ============================================================================

/**
 * Create and verify SMTP transporter
 * Trusts mailer.ts built-in retry logic for verification
 */
async function createAndVerifyTransporter(
  settings: NewsletterSettings,
  newsletterId: string,
  mode: 'initial' | 'retry',
  chunkInfo: string
): Promise<{ transporter: SMTPTransporter; verified: boolean } | null> {
  // Extract email-specific settings
  const emailSettings = extractEmailSettings(settings);

  try {
    // Create a single transporter for this entire chunk
    const transporter = createTransporter(emailSettings);

    // Transporter.verify() already retries internally in mailer.ts
    // If it fails after retries, it SHOULD throw
    await transporter.verify();

    logger.info(`Transporter verified for ${chunkInfo}`, {
      module: 'newsletter-sending',
      context: { newsletterId, mode }
    });

    return { transporter, verified: true };
  } catch (error) {
    logger.error('Transporter verification failed after retries', {
      module: 'newsletter-sending',
      context: { error, newsletterId, mode, chunkInfo }
    });
    return null;
  }
}

/**
 * Safely close transporter connection
 * Handles errors gracefully and logs any issues
 */
function closeTransporter(
  transporter: SMTPTransporter,
  newsletterId: string,
  mode: 'initial' | 'retry'
): void {
  try {
    transporter.close();
  } catch (closeError) {
    logger.warn('Error closing transporter', {
      module: 'newsletter-sending',
      context: {
        error: closeError,
        newsletterId,
        mode
      }
    });
  }
}

// ============================================================================
// PRIVATE HELPERS - Email Sending
// ============================================================================

/**
 * Send email to multiple recipients using BCC
 * Trusts sendEmailWithTransporter's built-in retry logic
 */
async function sendViaBCC(
  transporter: SMTPTransporter,
  validatedEmails: string[],
  settings: NewsletterSettings & { html: string; subject: string },
  newsletterId: string,
  mode: 'initial' | 'retry',
  chunkInfo: string
): Promise<{ results: EmailSendResult[]; sentCount: number; failedCount: number }> {
  const results: EmailSendResult[] = [];

  // Prepare sender information
  const fromEmail = settings.fromEmail || 'newsletter@die-linke-frankfurt.de';
  const fromName = settings.fromName || 'Die Linke Frankfurt';
  const from = `${fromName} <${fromEmail}>`;
  const replyTo = settings.replyToEmail || fromEmail;

  // BCC mode: Send one email with all recipients in BCC
  const bccString = validatedEmails.join(',');

  logger.info(`Sending ${mode} email in BCC mode to ${validatedEmails.length} recipients`, {
    module: 'newsletter-sending',
    context: {
      newsletterId,
      recipientCount: validatedEmails.length,
      mode
    }
  });

  try {
    const result = await sendEmailWithTransporter(transporter, {
      to: from, // Use sender address as "To"
      bcc: bccString,
      subject: settings.subject,
      html: settings.html,
      from,
      replyTo,
      settings: extractEmailSettings(settings)
    });

    if (result.success) {
      validatedEmails.forEach(email => {
        results.push({ email, success: true });
      });

      logger.info(`BCC email sent successfully`, {
        module: 'newsletter-sending',
        context: {
          newsletterId,
          recipientCount: validatedEmails.length,
          mode,
          chunkInfo
        }
      });
    } else {
      // sendEmailWithTransporter already retried 3× with exponential backoff
      // If it failed after retries, mark all emails as failed
      validatedEmails.forEach(email => {
        results.push({
          email,
          success: false,
          error: String(result.error)
        });
      });

      logger.warn(`BCC email failed after retries`, {
        module: 'newsletter-sending',
        context: {
          newsletterId,
          mode,
          chunkInfo,
          error: result.error
        }
      });
    }
  } catch (error) {
    validatedEmails.forEach(email => {
      results.push({
        email,
        success: false,
        error: String(error)
      });
    });

    logger.error(`BCC email failed`, {
      module: 'newsletter-sending',
      context: {
        error,
        newsletterId,
        mode,
        chunkInfo
      }
    });
  }

  const sentCount = results.filter(r => r.success).length;
  const failedCount = results.filter(r => !r.success).length;

  return {
    results,
    sentCount,
    failedCount
  };
}

/**
 * Send emails individually (fallback for single email)
 * Used when BCC mode is not suitable or only one recipient
 */
async function sendIndividually(
  transporter: SMTPTransporter,
  validatedEmails: string[],
  settings: NewsletterSettings & { html: string; subject: string },
  newsletterId: string,
  mode: 'initial' | 'retry'
): Promise<{ results: EmailSendResult[]; sentCount: number; failedCount: number }> {
  const results: EmailSendResult[] = [];

  // Prepare sender information
  const fromEmail = settings.fromEmail || 'newsletter@die-linke-frankfurt.de';
  const fromName = settings.fromName || 'Die Linke Frankfurt';
  const from = `${fromName} <${fromEmail}>`;
  const replyTo = settings.replyToEmail || fromEmail;

  // Individual email mode (for single emails or when BCC is disabled)
  for (let i = 0; i < validatedEmails.length; i++) {
    const email = validatedEmails[i];
    const domain = email.split('@')[1] || 'unknown';

    try {
      const result = await sendEmailWithTransporter(transporter, {
        to: email,
        subject: settings.subject,
        html: settings.html,
        from,
        replyTo,
        settings: extractEmailSettings(settings)
      });

      if (result.success) {
        results.push({ email, success: true });
      } else {
        results.push({
          email,
          success: false,
          error: String(result.error)
        });

        logger.warn(`Email failed`, {
          module: 'newsletter-sending',
          context: {
            newsletterId,
            mode,
            domain,
            emailIndex: i + 1,
            totalEmails: validatedEmails.length
          }
        });
      }

      // No delay needed for single email mode (used only for edge cases)
    } catch (error) {
      results.push({
        email,
        success: false,
        error: String(error)
      });

      logger.error(`Email threw exception`, {
        module: 'newsletter-sending',
        context: {
          error,
          newsletterId,
          mode,
          domain,
          emailIndex: i + 1,
          totalEmails: validatedEmails.length
        }
      });
    }
  }

  const sentCount = results.filter(r => r.success).length;
  const failedCount = results.filter(r => !r.success).length;

  return {
    results,
    sentCount,
    failedCount
  };
}

// ============================================================================
// PRIVATE HELPERS - Retry Process
// ============================================================================

/**
 * Initialize retry process for failed emails
 * Stores retry settings in newsletter record
 */
async function initializeRetryProcess(
  newsletterId: string,
  chunkResults: ChunkResult[],
  currentSettings: NewsletterSendingState
): Promise<void> {
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
      if (chunk?.results) {
        chunk.results.forEach(result => {
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
      module: 'newsletter-sending',
      context: {
        newsletterId,
        failedCount: failedEmails.length,
        retryChunkSizes
      }
    });

    // Prepare retry settings
    const retrySettings: NewsletterSendingState = {
      ...currentSettings,
      retryInProgress: true,
      retryStartedAt: new Date().toISOString(),
      failedEmails,
      retryChunkSizes,
      currentRetryStage: 0,
      retryResults: []
    };

    logger.info(`Updating newsletter with retry settings`, {
      module: 'newsletter-sending',
      context: {
        newsletterId,
        retryInProgress: retrySettings.retryInProgress,
        failedEmailsCount: retrySettings.failedEmails?.length || 0
      }
    });

    // Store retry information in newsletter settings
    await updateNewsletterItem(newsletterId, {
      settings: JSON.stringify(retrySettings)
    });

    // Verify the update was successful
    const updatedNewsletter = await getNewsletterById(newsletterId);

    if (updatedNewsletter?.settings) {
      const verifySettings: NewsletterSendingState = JSON.parse(updatedNewsletter.settings);
      logger.info(`Verified newsletter update - retry process initialized`, {
        module: 'newsletter-sending',
        context: {
          newsletterId,
          status: updatedNewsletter.status,
          retryInProgress: verifySettings.retryInProgress,
          failedEmailsCount: verifySettings.failedEmails?.length || 0,
          currentRetryStage: verifySettings.currentRetryStage
        }
      });
    }
  } catch (error) {
    logger.error('Error initializing retry process', {
      module: 'newsletter-sending',
      context: {
        error,
        newsletterId
      }
    });
    throw error;
  }
}
