import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api-auth';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { createTransporter, sendEmailWithTransporter } from '@/lib/email';
import { getNewsletterSettings } from '@/lib/newsletter-service';
import { validateEmail, cleanEmail } from '@/lib/email-hashing';
import { format } from 'date-fns';
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
 * Interface for email sending result
 */
interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: unknown;
  isConnectionError?: boolean;
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
 * Format subject line with template variables
 */
function formatSubject(template: string): string {
  const currentDate = format(new Date(), 'dd.MM.yyyy');
  return template.replace('{date}', currentDate);
}

/**
 * Process a chunk of emails synchronously
 */
async function handleChunkProcessing(request: NextRequest): Promise<NextResponse> {
  try {
    const body: ChunkRequest = await request.json();
    const { newsletterId, html, subject, emails, chunkIndex, totalChunks, settings } = body;

    // Validate required fields
    if (!newsletterId || !html || !subject || !emails || emails.length === 0) {
      return AppError.validation('Missing required fields').toResponse();
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

    // Verify newsletter exists and is in sending status
    const newsletter = await prisma.newsletterItem.findUnique({
      where: { id: newsletterId }
    });

    if (!newsletter) {
      return AppError.validation('Newsletter not found').toResponse();
    }

    if (!['sending', 'draft'].includes(newsletter.status)) {
      return AppError.validation('Newsletter is not in a sendable state').toResponse();
    }

    logger.info(`Processing chunk ${chunkIndex + 1}/${totalChunks} for newsletter ${newsletterId}`, {
      context: {
        emailCount: emails.length,
        chunkIndex,
        totalChunks
      }
    });

    // Create a single transporter for this entire chunk (connection pooling)
    let transporter = createTransporter(emailSettings);
    
    // Verify transporter once per chunk with retry logic
    let retryCount = 0;
    const maxRetries = emailSettings.maxRetries || 3;
    
    while (retryCount < maxRetries) {
      try {
        await transporter.verify();
        break; // No logging for successful verification
      } catch (verifyError) {
        retryCount++;
        
        // Check if it's a connection error
        const errorObj = verifyError as { response?: string; code?: string; message?: string };
        const isConnectionError = errorObj?.response?.includes('too many connections') || 
                                 errorObj?.code === 'ECONNREFUSED' ||
                                 errorObj?.code === 'ESOCKET' ||
                                 errorObj?.code === 'EPROTOCOL';
        
        if (isConnectionError && retryCount < maxRetries) {
          const maxBackoffDelay = emailSettings.maxBackoffDelay || 10000;
          const backoffDelay = Math.min(1000 * Math.pow(2, retryCount - 1), maxBackoffDelay); // Exponential backoff
          logger.warn(`SMTP verification failed for chunk ${chunkIndex + 1} (attempt ${retryCount}/${maxRetries}), retrying in ${backoffDelay}ms`, {
            context: { error: errorObj?.message || String(verifyError) }
          });
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        } else {
          logger.error('SMTP transporter verification failed for chunk', {
            context: { 
              error: verifyError,
              chunkIndex: chunkIndex + 1,
              attempts: retryCount
            }
          });
          return AppError.validation('SMTP connection failed').toResponse();
        }
      }
    }

    // Process emails in this chunk
    let sentCount = 0;
    let failedCount = 0;
    const results: Array<{ email: string; success: boolean; error?: unknown }> = [];

    // Check if BCC sending is enabled
    if (emailSettings.useBccSending) {
      // BCC mode: Send one email with all recipients in BCC
      logger.info(`Processing chunk ${chunkIndex + 1}/${totalChunks} in BCC mode with ${emails.length} recipients`);
      
      // Clean and validate email addresses before creating BCC string
      const validatedEmails = emails.map(email => {
        const originalEmail = email;
        const cleanedEmail = cleanEmail(email);
        
        // Log if cleaning changed the email (indicates invisible characters were present)
        if (originalEmail !== cleanedEmail) {
          logger.warn(`Cleaned email address`, {
            context: {
              original: JSON.stringify(originalEmail), // JSON.stringify shows invisible chars
              cleaned: cleanedEmail,
              originalLength: originalEmail.length,
              cleanedLength: cleanedEmail.length
            }
          });
        }
        
        return cleanedEmail;
      }).filter(email => {
        if (!validateEmail(email)) {
          logger.warn(`Filtering out invalid email address after cleaning: ${JSON.stringify(email)}`);
          return false;
        }
        return true;
      });

      if (validatedEmails.length !== emails.length) {
        logger.warn(`Filtered out ${emails.length - validatedEmails.length} invalid email addresses from BCC`);
      }

      const bccString = validatedEmails.join(',');
      logger.info(`BCC string created with ${validatedEmails.length} validated emails`);
      
      try {
        const result = await sendEmailWithTransporter(transporter, {
          to: from, // Use sender address as "To" (will be visible to all BCC recipients)
          bcc: bccString, // All recipients as BCC
          subject: formattedSubject,
          html,
          from,
          replyTo,
          settings: emailSettings
        });

        if (result.success) {
          sentCount = emails.length; // All emails considered sent
          emails.forEach(email => {
            results.push({ email, success: true });
          });
          logger.info(`BCC email sent successfully to ${emails.length} recipients in chunk ${chunkIndex + 1}`);
        } else {
          // Check if this is a connection error after all retries were exhausted
          if ((result as EmailSendResult).isConnectionError) {
            logger.warn(`Connection error detected for BCC email in chunk ${chunkIndex + 1}, recreating transporter`);
            
            // Close the old transporter
            transporter.close();
            
            // Create a new transporter
            transporter = createTransporter(emailSettings);
            
            // Retry the BCC email once with the new transporter
            try {
              const retryResult = await sendEmailWithTransporter(transporter, {
                to: from,
                bcc: emails.join(','),
                subject: formattedSubject,
                html,
                from,
                replyTo,
                settings: emailSettings
              });
              
              if (retryResult.success) {
                sentCount = emails.length;
                emails.forEach(email => {
                  results.push({ email, success: true });
                });
                logger.info(`BCC email succeeded after transporter recreation in chunk ${chunkIndex + 1}`);
              } else {
                failedCount = emails.length;
                emails.forEach(email => {
                  results.push({ email, success: false, error: retryResult.error });
                });
                logger.error(`BCC email failed even after transporter recreation in chunk ${chunkIndex + 1}`, {
                  context: { error: retryResult.error }
                });
              }
            } catch (recreateError) {
              failedCount = emails.length;
              emails.forEach(email => {
                results.push({ email, success: false, error: recreateError });
              });
              logger.error(`BCC email threw exception after transporter recreation in chunk ${chunkIndex + 1}`, {
                context: { error: recreateError }
              });
            }
          } else {
            failedCount = emails.length;
            emails.forEach(email => {
              results.push({ email, success: false, error: result.error });
            });
            logger.warn(`BCC email failed in chunk ${chunkIndex + 1}`, {
              context: { error: result.error }
            });
          }
        }
      } catch (error) {
        failedCount = emails.length;
        emails.forEach(email => {
          results.push({ email, success: false, error });
        });
        logger.error(`BCC email threw exception in chunk ${chunkIndex + 1}`, {
          context: { error }
        });
      }
    } else {
      // Individual email mode: Send each email separately (existing logic)
      for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      
      try {
        const result = await sendEmailWithTransporter(transporter, {
          to: email,
          subject: formattedSubject,
          html,
          from,
          replyTo,
          settings: emailSettings
        });

        if (result.success) {
          sentCount++;
          results.push({ email, success: true });
        } else {
          // Check if this is a connection error after all retries were exhausted
          if ((result as EmailSendResult).isConnectionError) {
            logger.warn(`Connection error detected for email ${i + 1}/${emails.length}, recreating transporter`, {
              context: { 
                recipientDomain: email.split('@')[1] || 'unknown',
                error: result.error 
              }
            });
            
            // Close the old transporter
            transporter.close();
            
            // Create a new transporter
            transporter = createTransporter(emailSettings);
            
            // Retry the email once with the new transporter
            try {
              const retryResult = await sendEmailWithTransporter(transporter, {
                to: email,
                subject: formattedSubject,
                html,
                from,
                replyTo,
                settings: emailSettings
              });
              
              if (retryResult.success) {
                sentCount++;
                results.push({ email, success: true });
                logger.info(`Email ${i + 1}/${emails.length} succeeded after transporter recreation`, {
                  context: { 
                    recipientDomain: email.split('@')[1] || 'unknown'
                  }
                });
              } else {
                failedCount++;
                results.push({ email, success: false, error: retryResult.error });
                logger.error(`Email ${i + 1}/${emails.length} failed even after transporter recreation`, {
                  context: { 
                    recipientDomain: email.split('@')[1] || 'unknown',
                    error: retryResult.error 
                  }
                });
              }
            } catch (recreateError) {
              failedCount++;
              results.push({ email, success: false, error: recreateError });
              logger.error(`Email ${i + 1}/${emails.length} threw exception after transporter recreation`, {
                context: { 
                  recipientDomain: email.split('@')[1] || 'unknown',
                  error: recreateError 
                }
              });
            }
          } else {
            failedCount++;
            results.push({ email, success: false, error: result.error });
            logger.warn(`Email ${i + 1}/${emails.length} failed in chunk ${chunkIndex + 1}`, {
              context: { 
                recipientDomain: email.split('@')[1] || 'unknown',
                error: result.error 
              }
            });
          }
        }

        // Use configured delay between emails
        if (i < emails.length - 1) {
          const emailDelay = emailSettings.emailDelay || 50; // Use configured delay or default to 50ms
          await new Promise(resolve => setTimeout(resolve, emailDelay));
        }
      } catch (error) {
        failedCount++;
        results.push({ email, success: false, error });
        logger.error(`Email ${i + 1}/${emails.length} threw exception in chunk ${chunkIndex + 1}`, {
          context: { 
            recipientDomain: email.split('@')[1] || 'unknown',
            error 
          }
        });
      }
    }
    } // End of individual email mode

    // Check if this is the last chunk
    const isComplete = chunkIndex === totalChunks - 1;
    
    // Update newsletter progress
    const currentSettings = newsletter.settings ? JSON.parse(newsletter.settings) : {};
    const chunkResults = currentSettings.chunkResults || [];
    
    // Store this chunk's results
    chunkResults[chunkIndex] = {
      sentCount,
      failedCount,
      completedAt: new Date().toISOString(),
      results: results // Store individual email results for retry logic
    };

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
            context: {
              newsletterId,
              hasRetryInProgress: !!finalSettings.retryInProgress,
              hasFailedEmails: !!finalSettings.failedEmails,
              failedEmailsCount: finalSettings.failedEmails?.length || 0,
              retrySettingsKeys: Object.keys(retrySettings)
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
        settings: JSON.stringify(finalSettings)
      }
    });

    logger.info(`Chunk ${chunkIndex + 1}/${totalChunks} completed`, {
      context: {
        sent: sentCount,
        failed: failedCount,
        totalSent,
        totalFailed,
        isComplete,
        finalStatus
      }
    });

    // Close transporter connection pool
    transporter.close();

    const response: ChunkResponse = {
      success: true,
      chunkIndex,
      totalChunks,
      sentCount,
      failedCount,
      isComplete,
      newsletterStatus: finalStatus
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Error processing email chunk:', { context: { error } });
    
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
      context: {
        newsletterId,
        retryInProgress: retrySettings.retryInProgress,
        failedEmailsCount: retrySettings.failedEmails.length,
        settingsKeys: Object.keys(retrySettings)
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
    logger.error('Error starting retry process:', { context: { error, newsletterId } });
  }
}

/**
 * POST handler for processing email chunks
 * Requires admin authentication
 */
export const POST = withAdminAuth(handleChunkProcessing);

/**
 * GET handler is not supported for this endpoint
 */
export async function GET() {
  return new NextResponse('Method not allowed', { status: 405 });
}