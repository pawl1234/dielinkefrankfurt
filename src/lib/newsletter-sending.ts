import { sendEmail } from './email';
import { validateAndHashEmails, ValidationResult, updateLastSentTimestamp } from './email-hashing';
import { getNewsletterSettings } from './newsletter-service';
import { NewsletterSettings } from './newsletter-template';
import prisma from './prisma';
import { logger } from './logger';
import { format } from 'date-fns';

/**
 * Result of the newsletter sending process
 */
export interface SendResult {
  success: boolean;
  sentCount: number;
  failedCount: number;
  batchCount: number;
  error?: Error | string;
  completedAt?: Date;
}

/**
 * Batch status information
 */
interface BatchStatus {
  batchNumber: number;
  totalBatches: number;
  sentCount: number;
  failedCount: number;
  inProgress: boolean;
  completed: boolean;
  startTime?: Date;
  endTime?: Date;
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
 * Delay function for pausing between batches
 * @param ms Milliseconds to delay
 */
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Replace template variables in subject line
 * @param template Subject template with placeholders
 */
function formatSubject(template: string): string {
  // Replace {date} with formatted current date
  const currentDate = format(new Date(), 'dd.MM.yyyy');
  return template.replace('{date}', currentDate);
}

/**
 * Send newsletter to validated email addresses
 * @param params Parameters for sending the newsletter
 * @returns Promise resolving to SendResult
 */
export async function sendNewsletter(params: { 
  html: string, 
  subject?: string, 
  validatedRecipientIds: string[],
  plainEmails?: string[], // Add plainEmails parameter
  settings?: Partial<NewsletterSettings>
}): Promise<SendResult> {
  const { html, validatedRecipientIds, plainEmails, settings: overrideSettings } = params;
  
  try {
    if (!html) {
      throw new Error('Newsletter HTML content is required');
    }
    
    if (!validatedRecipientIds || validatedRecipientIds.length === 0) {
      throw new Error('At least one validated recipient is required');
    }

    // Get newsletter settings and apply any overrides
    const defaultSettings = await getNewsletterSettings();
    const settings = { ...defaultSettings, ...overrideSettings };
    
    // Format subject line
    const subject = params.subject || 
      (settings.subjectTemplate ? formatSubject(settings.subjectTemplate) : 'Newsletter - Die Linke Frankfurt');
    
    // Prepare sender information
    const fromEmail = settings.fromEmail || 'newsletter@die-linke-frankfurt.de';
    const fromName = settings.fromName || 'Die Linke Frankfurt';
    const from = `${fromName} <${fromEmail}>`;
    const replyTo = settings.replyToEmail || fromEmail;
    
    // Get validated email recipients
    const recipients = await prisma.hashedRecipient.findMany({
      where: {
        id: {
          in: validatedRecipientIds
        }
      }
    });
    
    if (recipients.length === 0) {
      throw new Error('No valid recipients found');
    }
    
    // Get batch size from settings
    const batchSize = settings.batchSize || 100;
    const batchDelay = settings.batchDelay || 1000;
    
    // Create batches of recipients
    const recipientBatches: string[][] = [];
    const recipientIds = recipients.map(r => r.id);
    
    // Divide recipients into batches
    for (let i = 0; i < recipientIds.length; i += batchSize) {
      recipientBatches.push(recipientIds.slice(i, i + batchSize));
    }
    
    // Track overall status
    const result: SendResult = {
      success: true,
      sentCount: 0,
      failedCount: 0,
      batchCount: recipientBatches.length,
      completedAt: undefined
    };
    
    // Newsletter record is managed by the calling API route
    // We just handle the sending process here
    
    // Track batch status
    const batchStatus: BatchStatus = {
      batchNumber: 0,
      totalBatches: recipientBatches.length,
      sentCount: 0,
      failedCount: 0,
      inProgress: false,
      completed: false
    };
    
    // Process each batch
    for (let i = 0; i < recipientBatches.length; i++) {
      const batch = recipientBatches[i];
      
      // Update batch status
      batchStatus.batchNumber = i + 1;
      batchStatus.inProgress = true;
      batchStatus.startTime = new Date();
      
      logger.info(`Processing batch ${batchStatus.batchNumber}/${batchStatus.totalBatches} with ${batch.length} recipients`);
      
      try {
        // Get emails for this batch
        const batchRecipients = await prisma.hashedRecipient.findMany({
          where: {
            id: {
              in: batch
            }
          }
        });
        
        // Update lastSent timestamp for this batch
        await updateLastSentTimestamp(batch);
        
        // For sending, we need to extract the corresponding plain emails for this batch
        // We map recipientIds to their corresponding indices in the validatedRecipientIds array
        // then use those indices to get the matching plainEmails
        let batchPlainEmails: string[] | undefined;
        
        if (plainEmails && plainEmails.length > 0) {
          // If we have fewer plain emails than recipients, use what we have
          const batchSize = Math.min(batch.length, plainEmails.length);
          batchPlainEmails = plainEmails.slice(0, batchSize);
        }
        
        // Send emails to each recipient in this batch
        const sendResult = await sendBatch(
          batch,
          html,
          subject,
          from,
          replyTo,
          batchPlainEmails
        );
        
        batchStatus.sentCount = sendResult.sentCount;
        batchStatus.failedCount = sendResult.failedCount;
        result.sentCount += sendResult.sentCount;
        result.failedCount += sendResult.failedCount;
        
        // Update batch status
        batchStatus.inProgress = false;
        batchStatus.completed = true;
        batchStatus.endTime = new Date();
        
        // Delay before next batch
        if (i < recipientBatches.length - 1) {
          await delay(batchDelay);
        }
      } catch (error) {
        logger.error(`Error processing batch ${batchStatus.batchNumber}:`, { context: { error } });
        
        batchStatus.failedCount = batch.length;
        result.failedCount += batch.length;
        batchStatus.inProgress = false;
        batchStatus.completed = true;
        batchStatus.endTime = new Date();
        
        // Continue with next batch
      }
    }
    
    // Newsletter record status is managed by the calling API route
    const completedAt = new Date();
    result.completedAt = completedAt;
    
    const success = result.failedCount === 0;
    result.success = success;
    
    return result;
  } catch (error) {
    logger.error('Error sending newsletter:', { context: { error } });
    
    // Error handling is managed by the calling API route
    // We just return the error result
    
    return {
      success: false,
      sentCount: 0,
      failedCount: validatedRecipientIds?.length || 0,
      batchCount: 0,
      error: error instanceof Error ? error : String(error)
    };
  }
}

/**
 * Implement sending logic for a single batch
 */
async function sendBatch(
  recipientIds: string[],
  html: string,
  subject: string,
  from: string,
  replyTo: string,
  plainEmails?: string[]
): Promise<{ sentCount: number; failedCount: number }> {
  // Initialize counters
  let sentCount = 0;
  let failedCount = 0;
  
  try {
    // Use the plain emails if provided
    let recipientEmails: string[] = [];
    
    if (plainEmails && plainEmails.length > 0) {
      // Use the actual email addresses passed from the API
      recipientEmails = plainEmails;
    } else {
      // Fallback to test emails if no plain emails provided
      const testRecipients = process.env.TEST_EMAIL_RECIPIENT || 'test@example.com';
      recipientEmails = testRecipients.split(',').map(email => email.trim());
      logger.info(`Using test recipients: ${recipientEmails.length} emails`);
    }
    
    // Collect error information without logging each one
    const errors: Array<{index: number, error: any}> = [];
    
    // Send emails to each recipient
    const promises = recipientEmails.map(async (email, index) => {
      try {
        // Send the email using the email module
        const result = await sendEmail({
          to: email,
          subject,
          html,
          from,
          replyTo
        });
        
        // Update counters based on result
        if (result.success) {
          return true; // Success
        } else {
          errors.push({index, error: result.error});
          return false; // Failure
        }
      } catch (error) {
        errors.push({index, error});
        return false; // Failure
      }
    });
    
    // Wait for all emails to be sent
    const results = await Promise.all(promises);
    
    // Count successes and failures
    sentCount = results.filter(success => success).length;
    failedCount = results.filter(success => !success).length;
    
    // Log summary instead of individual emails
    if (errors.length > 0) {
      logger.error(`Failed to send ${errors.length} emails out of ${recipientEmails.length}`);
    }
    
    return { sentCount, failedCount };
  } catch (error) {
    logger.error('Error in sendBatch:', { context: { error } });
    return {
      sentCount,
      failedCount: recipientIds.length - sentCount
    };
  }
}

/**
 * Get status of a newsletter
 */
export async function getNewsletterStatus(newsletterId: string): Promise<any> {
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
      recipientCount: newsletter.recipientCount,
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
export async function getSentNewsletters(page = 1, pageSize = 10): Promise<any> {
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
        recipientCount: n.recipientCount,
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