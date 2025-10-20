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

import { sendEmailWithTransporter, createTransporter, validateEmail, cleanEmail, validateAndHashEmails } from '@/lib/email';
import type { SMTPTransporter } from '@/lib/email';
import { logger } from '@/lib/logger';
import prisma from '@/lib/db/prisma';
import type { NewsletterSettings } from '@/types/newsletter-types';
import { extractEmailSettings } from '@/types/newsletter-types';
import { format } from 'date-fns';
import { ChunkResult, EmailSendResult } from '@/types/api-types';
import type { ValidationResult } from '@/lib/email';
import { getNewsletterSettings } from './settings-service';

// ============================================================================
// PUBLIC API - Email Processing
// ============================================================================

/**
 * Process a list of recipient emails
 * Validates and hashes emails for privacy-conscious storage
 *
 * @param emailText - Newline-separated list of email addresses
 * @returns ValidationResult with statistics
 */
export async function processRecipientList(emailText: string): Promise<ValidationResult> {
  if (!emailText || emailText.trim().length === 0) {
    throw new Error('Email list cannot be empty');
  }

  try {
    return await validateAndHashEmails(emailText);
  } catch (error) {
    logger.error('Error processing recipient list:', { context: { error } });
    throw new Error('Failed to process recipient list');
  }
}

/**
 * Parse and clean email list, filtering out invalid emails
 * Handles Excel-safe cleaning for emails copied from spreadsheets
 *
 * @param emailText - Newline-separated email addresses
 * @param invalidEmails - List of emails to exclude
 * @returns Array of cleaned, valid emails
 */
export function parseAndCleanEmailList(
  emailText: string,
  invalidEmails: string[]
): string[] {
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
    .filter((email: string) => !invalidEmails.includes(email));

  return plainEmails;
}

// ============================================================================
// PUBLIC API - Chunk Sending
// ============================================================================

/**
 * Send a chunk of emails for a newsletter
 * Main orchestration function - handles validation, sending, and error tracking
 *
 * @param chunk - Array of email addresses to send to
 * @param newsletterId - Newsletter ID for logging and tracking
 * @param settings - Newsletter settings including SMTP configuration and content
 * @param mode - Whether this is initial sending or retry mode
 * @returns ChunkResult with details of successful and failed sends
 */
export async function processSendingChunk(
  chunk: string[],
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

    // Step 1: Validate and clean emails
    const { validEmails, invalidResults } = validateAndCleanEmails(
      chunk,
      newsletterId,
      mode
    );

    results = [...invalidResults];

    if (validEmails.length === 0) {
      logger.warn('No valid emails to send after validation', {
        module: 'newsletter-sending',
        context: { newsletterId, mode }
      });

      return {
        sentCount: 0,
        failedCount: results.length,
        completedAt: new Date().toISOString(),
        results
      };
    }

    // Step 2: Create and verify transporter
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

    // Step 3: Send emails using appropriate method
    let sendResult;
    if (validEmails.length > 1) {
      sendResult = await sendViaBCC(
        transporter,
        validEmails,
        settings,
        newsletterId,
        mode,
        chunkInfo
      );
    } else {
      sendResult = await sendIndividually(
        transporter,
        validEmails,
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
  currentSettings: Record<string, unknown>
): Promise<{
  finalStatus: string;
  finalSettings: Record<string, unknown>;
  isComplete: boolean;
}> {
  const isComplete = chunkIndex === totalChunks - 1;

  // Get existing chunk results
  const chunkResults = (currentSettings.chunkResults as ChunkResult[]) || [];
  chunkResults[chunkIndex] = chunkResult;

  // Calculate aggregations (inline - simple reduce)
  const totalSent = chunkResults.reduce(
    (sum: number, chunk: ChunkResult) => sum + (chunk?.sentCount || 0),
    0
  );
  const totalFailed = chunkResults.reduce(
    (sum: number, chunk: ChunkResult) => sum + (chunk?.failedCount || 0),
    0
  );
  const completedChunks = chunkResults.filter(chunk => chunk !== undefined && chunk !== null).length;

  // Merge settings with chunk completion data
  let finalSettings = {
    ...currentSettings,
    chunkResults,
    totalSent,
    totalFailed,
    lastChunkCompletedAt: new Date().toISOString(),
    completedChunks
  };

  // Determine status (inline - simple logic tree)
  let finalStatus = currentSettings.status as string || 'sending';

  if (isComplete) {
    if (totalFailed === 0) {
      finalStatus = 'sent';
    } else if (totalSent > 0) {
      finalStatus = 'retrying';
    } else {
      finalStatus = 'failed';
    }

    // If there are failures and we should retry, initialize retry process
    if (finalStatus === 'retrying') {
      await initializeRetryProcess(newsletterId, chunkResults, currentSettings);

      // Fetch updated settings after retry initialization
      const updatedNewsletter = await prisma.newsletterItem.findUnique({
        where: { id: newsletterId }
      });

      if (updatedNewsletter?.settings) {
        const retrySettings = JSON.parse(updatedNewsletter.settings);
        // Merge retry settings with our chunk completion data
        finalSettings = {
          ...retrySettings,
          ...finalSettings
        };

        logger.info(`Merged retry settings with chunk completion data`, {
          module: 'newsletter-sending',
          context: {
            newsletterId,
            hasRetryInProgress: !!(finalSettings as Record<string, unknown>).retryInProgress,
            hasFailedEmails: !!(finalSettings as Record<string, unknown>).failedEmails,
            failedEmailsCount: ((finalSettings as Record<string, unknown>).failedEmails as string[])?.length || 0
          }
        });
      }
    }
  }

  // Update newsletter in database
  await prisma.newsletterItem.update({
    where: { id: newsletterId },
    data: {
      status: finalStatus,
      settings: JSON.stringify(finalSettings),
      sentAt: isComplete && finalStatus === 'sent' ? new Date() : undefined
    }
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
// PRIVATE HELPERS - Email Validation
// ============================================================================

/**
 * Validate and clean a batch of email addresses
 * Returns valid emails and results for invalid ones
 */
function validateAndCleanEmails(
  emails: string[],
  newsletterId: string,
  mode: 'initial' | 'retry'
): {
  validEmails: string[];
  invalidResults: EmailSendResult[];
} {
  const results: EmailSendResult[] = [];

  // Clean and validate email addresses
  const validatedEmails = emails.map(email => {
    const originalEmail = email;
    const cleanedEmail = cleanEmail(email);

    // Log if cleaning changed the email (privacy-conscious - no full email in logs)
    if (originalEmail !== cleanedEmail) {
      const domain = cleanedEmail.split('@')[1] || 'unknown';
      logger.warn(`Cleaned email address`, {
        module: 'newsletter-sending',
        context: {
          newsletterId,
          domain,
          originalLength: originalEmail.length,
          cleanedLength: cleanedEmail.length,
          mode
        }
      });
    }

    return cleanedEmail;
  }).filter(email => {
    if (!validateEmail(email)) {
      const domain = email.split('@')[1] || 'invalid';
      logger.warn(`Filtering out invalid email address`, {
        module: 'newsletter-sending',
        context: {
          newsletterId,
          domain,
          mode
        }
      });

      results.push({
        email,
        success: false,
        error: 'Invalid email address'
      });

      return false;
    }
    return true;
  });

  if (validatedEmails.length !== emails.length) {
    logger.warn(`Filtered out ${emails.length - validatedEmails.length} invalid email addresses`, {
      module: 'newsletter-sending',
      context: {
        newsletterId,
        originalCount: emails.length,
        validCount: validatedEmails.length,
        mode
      }
    });
  }

  return {
    validEmails: validatedEmails,
    invalidResults: results
  };
}

// ============================================================================
// PRIVATE HELPERS - Transporter Management
// ============================================================================

/**
 * Create and verify SMTP transporter with retry logic
 * Implements exponential backoff for connection retries
 */
async function createAndVerifyTransporter(
  settings: NewsletterSettings,
  newsletterId: string,
  mode: 'initial' | 'retry',
  chunkInfo: string
): Promise<{ transporter: SMTPTransporter; verified: boolean; retryCount: number } | null> {
  // Extract email-specific settings
  const emailSettings = extractEmailSettings(settings);

  // Create a single transporter for this entire chunk
  const transporter = createTransporter(emailSettings);

  // Verify transporter once per chunk with retry logic
  let retryCount = 0;
  const maxRetries = settings.maxRetries || 3;

  while (retryCount < maxRetries) {
    try {
      await transporter.verify();
      // Successful verification
      return {
        transporter,
        verified: true,
        retryCount
      };
    } catch (verifyError) {
      retryCount++;

      // Check if it's a connection error
      const errorObj = verifyError as { response?: string; code?: string; message?: string };
      const isConnectionError = errorObj?.response?.includes('too many connections') ||
                               errorObj?.code === 'ECONNREFUSED' ||
                               errorObj?.code === 'ESOCKET' ||
                               errorObj?.code === 'EPROTOCOL';

      if (isConnectionError && retryCount < maxRetries) {
        const maxBackoffDelay = settings.maxBackoffDelay || 10000;
        const backoffDelay = Math.min(1000 * Math.pow(2, retryCount - 1), maxBackoffDelay);

        logger.warn(`SMTP verification failed for ${chunkInfo} (attempt ${retryCount}/${maxRetries}), retrying in ${backoffDelay}ms`, {
          module: 'newsletter-sending',
          context: {
            error: errorObj?.message || String(verifyError),
            newsletterId,
            mode
          }
        });

        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      } else {
        logger.error('SMTP transporter verification failed', {
          module: 'newsletter-sending',
          context: {
            error: verifyError,
            newsletterId,
            mode,
            chunkInfo,
            attempts: retryCount
          }
        });

        return null;
      }
    }
  }

  return null;
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
 * Format subject line with template variables
 */
function formatSubject(template: string): string {
  const currentDate = format(new Date(), 'dd.MM.yyyy');
  return template.replace('{date}', currentDate);
}

/**
 * Send email to multiple recipients using BCC
 * Includes automatic retry with transporter recreation on connection errors
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

  // Format subject line
  const formattedSubject = formatSubject(settings.subject);

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
      subject: formattedSubject,
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
      // Handle connection error with transporter recreation
      if ((result as { isConnectionError?: boolean }).isConnectionError) {
        logger.warn(`Connection error detected, recreating transporter`, {
          module: 'newsletter-sending',
          context: { newsletterId, mode, chunkInfo }
        });

        transporter.close();
        const emailSettings = extractEmailSettings(settings);
        const newTransporter = createTransporter(emailSettings);

        // Retry once with new transporter
        try {
          const retryResult = await sendEmailWithTransporter(newTransporter, {
            to: from,
            bcc: bccString,
            subject: formattedSubject,
            html: settings.html,
            from,
            replyTo,
            settings: extractEmailSettings(settings)
          });

          if (retryResult.success) {
            validatedEmails.forEach(email => {
              results.push({ email, success: true });
            });

            logger.info(`BCC email succeeded after transporter recreation`, {
              module: 'newsletter-sending',
              context: { newsletterId, mode, chunkInfo }
            });
          } else {
            validatedEmails.forEach(email => {
              results.push({
                email,
                success: false,
                error: String(retryResult.error)
              });
            });
          }
        } catch (retryError) {
          validatedEmails.forEach(email => {
            results.push({
              email,
              success: false,
              error: String(retryError)
            });
          });
        }
      } else {
        validatedEmails.forEach(email => {
          results.push({
            email,
            success: false,
            error: String(result.error)
          });
        });
      }
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

  // Format subject line
  const formattedSubject = formatSubject(settings.subject);

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
        subject: formattedSubject,
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
  currentSettings: Record<string, unknown>
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
      module: 'newsletter-sending',
      context: {
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
