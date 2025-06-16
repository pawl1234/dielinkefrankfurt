import prisma from './prisma';
import { NewsletterItem } from '@prisma/client';
import { logger } from './logger';
import { handleDatabaseError } from './errors';

/**
 * Interface for paginated results
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Interface for newsletter archiving parameters
 */
export interface ArchiveNewsletterParams {
  content: string;
  subject: string;
  recipientCount: number;
  settings: Record<string, unknown>;
  status?: string;
}

/**
 * Interface for listing sent newsletters parameters
 */
export interface ListNewslettersParams {
  page?: number;
  limit?: number;
  search?: string;
}

/**
 * Interface for sent newsletter with formatted data
 */
export interface SentNewsletterWithMeta extends NewsletterItem {
  settingsData?: Record<string, unknown>;
}

/**
 * Archives a newsletter in the database
 * @param params Newsletter content and metadata
 * @returns Promise resolving to the newsletter ID
 */
export async function archiveNewsletter(params: ArchiveNewsletterParams): Promise<string> {
  try {
    const { content, subject, recipientCount, settings, status = 'completed' } = params;

    // Ensure settings is serialized as JSON string
    const settingsJson = typeof settings === 'string' 
      ? settings 
      : JSON.stringify(settings);

    // Create the newsletter record
    const newsletter = await prisma.newsletterItem.create({
      data: {
        sentAt: new Date(),
        subject,
        recipientCount,
        content,
        status,
        settings: settingsJson,
        introductionText: '' // Default empty intro for archived newsletters
      }
    });

    logger.info('Newsletter archived successfully', {
      context: {
        id: newsletter.id,
        subject,
        recipientCount
      }
    });

    return newsletter.id;
  } catch (error) {
    throw handleDatabaseError(error, 'archiveNewsletter');
  }
}

/**
 * Retrieves a sent newsletter by ID
 * @param id Newsletter ID
 * @returns Promise resolving to the newsletter or null if not found
 */
export async function getSentNewsletter(id: string): Promise<SentNewsletterWithMeta | null> {
  try {
    const newsletter = await prisma.newsletterItem.findUnique({
      where: { id }
    });

    if (!newsletter) {
      return null;
    }

    // Parse settings JSON if present
    const newsletterWithMeta: SentNewsletterWithMeta = {
      ...newsletter
    };

    try {
      if (newsletter.settings) {
        newsletterWithMeta.settingsData = JSON.parse(newsletter.settings);
      }
    } catch (error) {
      logger.warn('Failed to parse newsletter settings JSON', {
        context: {
          id,
          error: (error as Error).message
        }
      });
    }

    return newsletterWithMeta;
  } catch (error) {
    throw handleDatabaseError(error, 'getSentNewsletter');
  }
}

/**
 * Lists sent newsletters with pagination and search
 * @param params Pagination and search parameters
 * @returns Promise resolving to paginated result
 */
export async function listSentNewsletters(params: ListNewslettersParams = {}): Promise<PaginatedResult<SentNewsletterWithMeta>> {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '' 
    } = params;

    // Validate pagination parameters
    const validPage = Math.max(1, page);
    const validLimit = Math.min(50, Math.max(1, limit)); // Limit between 1 and 50
    const skip = (validPage - 1) * validLimit;

    // Build filter conditions
    const where = search 
      ? {
          subject: {
            contains: search,
            mode: 'insensitive' as const
          }
        } 
      : {};

    // Fetch records and total count in parallel
    const [newsletters, total] = await Promise.all([
      prisma.newsletterItem.findMany({
        where: {
          ...where,
          status: { not: 'draft' } // Only get sent newsletters
        },
        orderBy: {
          sentAt: 'desc'
        },
        skip,
        take: validLimit
      }),
      prisma.newsletterItem.count({ 
        where: {
          ...where,
          status: { not: 'draft' }
        }
      })
    ]);

    // Calculate total pages
    const totalPages = Math.ceil(total / validLimit);

    // Parse settings JSON for each newsletter
    const newslettersWithMeta: SentNewsletterWithMeta[] = newsletters.map(newsletter => {
      const result: SentNewsletterWithMeta = { ...newsletter };
      
      try {
        if (newsletter.settings) {
          result.settingsData = JSON.parse(newsletter.settings);
        }
      } catch (error) {
        logger.warn('Failed to parse newsletter settings JSON', {
          context: {
            id: newsletter.id,
            error: (error as Error).message
          }
        });
      }
      
      return result;
    });

    return {
      items: newslettersWithMeta,
      total,
      page: validPage,
      limit: validLimit,
      totalPages
    };
  } catch (error) {
    throw handleDatabaseError(error, 'listSentNewsletters');
  }
}

/**
 * Updates the status of a sent newsletter
 * @param id Newsletter ID
 * @param status New status
 * @returns Promise resolving to the updated newsletter
 */
export async function updateNewsletterStatus(id: string, status: string): Promise<NewsletterItem> {
  try {
    return await prisma.newsletterItem.update({
      where: { id },
      data: { status }
    });
  } catch (error) {
    throw handleDatabaseError(error, 'updateNewsletterStatus');
  }
}

/**
 * Deletes a sent newsletter
 * Note: This is typically an admin-only operation
 * @param id Newsletter ID
 * @returns Promise resolving to the deleted newsletter
 */
export async function deleteNewsletter(id: string): Promise<NewsletterItem> {
  try {
    return await prisma.newsletterItem.delete({
      where: { id }
    });
  } catch (error) {
    throw handleDatabaseError(error, 'deleteNewsletter');
  }
}

/**
 * Get newsletter statistics
 * @returns Promise resolving to statistics about sent newsletters
 */
export async function getNewsletterStats(): Promise<{
  total: number;
  lastSent?: Date;
  totalRecipients: number;
}> {
  try {
    // Get total count
    const total = await prisma.newsletterItem.count({
      where: {
        status: 'sent'
      }
    });

    // Get the most recently sent newsletter
    const lastNewsletter = await prisma.newsletterItem.findFirst({
      where: {
        status: 'sent'
      },
      orderBy: {
        sentAt: 'desc'
      },
      select: {
        sentAt: true
      }
    });

    // Get total recipients
    const recipientsResult = await prisma.newsletterItem.aggregate({
      where: {
        status: 'sent'
      },
      _sum: {
        recipientCount: true
      }
    });

    return {
      total,
      lastSent: lastNewsletter?.sentAt || undefined,
      totalRecipients: recipientsResult._sum.recipientCount || 0
    };
  } catch (error) {
    throw handleDatabaseError(error, 'getNewsletterStats');
  }
}