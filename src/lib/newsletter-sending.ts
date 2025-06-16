import { validateAndHashEmails, ValidationResult } from './email-hashing';
import { logger } from './logger';
import prisma from './prisma';

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