import { validateAndHashEmails, ValidationResult, validateEmail, cleanEmail } from './email-hashing';
import { logger } from './logger';
import prisma from './prisma';
import { createTransporter, sendEmailWithTransporter } from './email';
import { format } from 'date-fns';
import { ChunkResult, EmailSendResult } from '@/types/api-types';
import { NewsletterSettings } from '../types/newsletter-types';

/**
 * Interface for newsletter status response
 */
interface NewsletterStatus {
  id: string;
  sentAt: Date | null;
  subject: string;
  recipientCount: number;
  status: string;
  settings: Record<string, unknown>;
}

/**
 * Interface for sent newsletters result with pagination
 */
interface SentNewslettersResult {
  newsletters: {
    id: string;
    sentAt: Date | null;
    subject: string;
    recipientCount: number;
    status: string;
  }[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

/**
 * Process a list of recipient emails
 * @param emailText Newline-separated list of email addresses
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
 * Get status of a newsletter
 */
export async function getNewsletterStatus(newsletterId: string): Promise<NewsletterStatus> {
  try {
    const newsletter = await prisma.newsletterItem.findUnique({
      where: { id: newsletterId }
    });
    
    if (!newsletter) {
      throw new Error('Newsletter not found');
    }
    
    return {
      id: newsletter.id,
      sentAt: newsletter.sentAt,
      subject: newsletter.subject,
      recipientCount: newsletter.recipientCount ?? 0,
      status: newsletter.status,
      settings: newsletter.settings ? JSON.parse(newsletter.settings) : {}
    };
  } catch (error) {
    logger.error('Error getting newsletter status:', { context: { error } });
    throw new Error('Failed to get newsletter status');
  }
}

/**
 * Get all sent newsletters with pagination
 */
export async function getSentNewsletters(page = 1, pageSize = 10): Promise<SentNewslettersResult> {
  try {
    const skip = (page - 1) * pageSize;
    
    const [newsletters, total] = await Promise.all([
      prisma.newsletterItem.findMany({
        where: {
          status: { not: 'draft' } // Exclude drafts to match the original function behavior
        },
        skip,
        take: pageSize,
        orderBy: {
          sentAt: 'desc'
        }
      }),
      prisma.newsletterItem.count({
        where: {
          status: { not: 'draft' }
        }
      })
    ]);
    
    return {
      newsletters: newsletters.map(n => ({
        id: n.id,
        sentAt: n.sentAt,
        subject: n.subject,
        recipientCount: n.recipientCount ?? 0,
        status: n.status
      })),
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  } catch (error) {
    logger.error('Error getting sent newsletters:', { context: { error } });
    throw new Error('Failed to get sent newsletters');
  }
}

/**
 * Format subject line with template variables
 */
function formatSubject(template: string): string {
  const currentDate = format(new Date(), 'dd.MM.yyyy');
  return template.replace('{date}', currentDate);
}

/**
 * Process a chunk of emails for sending
 * This consolidates the common BCC sending logic used by both send-chunk and retry-chunk
 * @param chunk Array of email addresses to send to
 * @param newsletterId Newsletter ID for logging and tracking
 * @param settings Newsletter settings including SMTP configuration
 * @param mode Whether this is initial sending or retry mode
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
  const results: EmailSendResult[] = [];
  
  try {
    // Format subject line
    const formattedSubject = formatSubject(settings.subject);
    
    // Prepare sender information
    const fromEmail = settings.fromEmail || 'newsletter@die-linke-frankfurt.de';
    const fromName = settings.fromName || 'Die Linke Frankfurt';
    const from = `${fromName} <${fromEmail}>`;
    const replyTo = settings.replyToEmail || fromEmail;
    
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

    // Create a single transporter for this entire chunk
    let transporter = createTransporter(settings);
    
    // Verify transporter once per chunk with retry logic
    let retryCount = 0;
    const maxRetries = settings.maxRetries || 3;
    
    while (retryCount < maxRetries) {
      try {
        await transporter.verify();
        break; // Successful verification
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
          
          // Return all emails as failed
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
      }
    }

    // Clean and validate email addresses
    const validatedEmails = chunk.map(email => {
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

    if (validatedEmails.length !== chunk.length) {
      logger.warn(`Filtered out ${chunk.length - validatedEmails.length} invalid email addresses`, {
        module: 'newsletter-sending',
        context: {
          newsletterId,
          originalCount: chunk.length,
          validCount: validatedEmails.length,
          mode
        }
      });
    }

    if (validatedEmails.length === 0) {
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

    // Always use BCC sending for multiple emails (mode simplification)
    if (validatedEmails.length > 1) {
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
          settings
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
            transporter = createTransporter(settings);
            
            // Retry once with new transporter
            try {
              const retryResult = await sendEmailWithTransporter(transporter, {
                to: from,
                bcc: bccString,
                subject: formattedSubject,
                html: settings.html,
                from,
                replyTo,
                settings
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
    } else {
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
            settings
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
    }

    // Close transporter connection pool
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

    // Calculate totals
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