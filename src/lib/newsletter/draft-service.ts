import prisma from '@/lib/db/prisma';
import { NewsletterItem } from '@prisma/client';
import { logger } from '@/lib/logger';
import { handleDatabaseError, NewsletterNotFoundError, NewsletterValidationError } from '@/lib/errors';

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
 * Saves a draft newsletter
 *
 * @param params - Newsletter draft parameters
 * @returns Promise resolving to the created newsletter
 */
export async function saveDraftNewsletter(params: {
  subject: string;
  introductionText: string;
  content?: string;
  settings?: Record<string, unknown>;
}): Promise<NewsletterItem> {
  try {
    const { subject, introductionText, content, settings } = params;

    // Validate required fields
    if (!subject || !introductionText) {
      const details: Record<string, string> = {};
      if (!subject) details.subject = 'Subject is required';
      if (!introductionText) details.introductionText = 'Introduction text is required';

      throw new NewsletterValidationError('Subject and introduction text are required', details);
    }

    // Ensure settings is serialized as JSON string if provided
    const settingsJson = settings
      ? (typeof settings === 'string' ? settings : JSON.stringify(settings))
      : null;

    // Create the draft newsletter
    const newsletter = await prisma.newsletterItem.create({
      data: {
        subject,
        introductionText,
        content: content || null,
        status: 'draft',
        settings: settingsJson,
        recipientCount: null,
        sentAt: null
      }
    });

    logger.info('Draft newsletter saved successfully', {
      module: 'newsletter-draft-service',
      context: {
        id: newsletter.id,
        subject
      }
    });

    return newsletter;
  } catch (error) {
    if (error instanceof NewsletterValidationError) {
      throw error;
    }
    throw handleDatabaseError(error, 'saveDraftNewsletter');
  }
}

/**
 * Updates a draft newsletter
 *
 * @param params - Update parameters including newsletter ID
 * @returns Promise resolving to the updated newsletter
 */
export async function updateDraftNewsletter(params: {
  id: string;
  subject?: string;
  introductionText?: string;
  content?: string;
  settings?: Record<string, unknown>;
}): Promise<NewsletterItem> {
  try {
    const { id, subject, introductionText, content, settings } = params;

    // Check if newsletter exists and is a draft
    const existingNewsletter = await prisma.newsletterItem.findUnique({
      where: { id }
    });

    if (!existingNewsletter) {
      throw new NewsletterNotFoundError('Newsletter not found', { id });
    }

    if (existingNewsletter.status !== 'draft') {
      throw new NewsletterValidationError('Only draft newsletters can be updated', {
        status: existingNewsletter.status
      });
    }

    // Prepare update data
    const updateData: Partial<NewsletterItem> = {};
    if (subject !== undefined) updateData.subject = subject;
    if (introductionText !== undefined) updateData.introductionText = introductionText;
    if (content !== undefined) updateData.content = content;
    if (settings !== undefined) {
      updateData.settings = typeof settings === 'string'
        ? settings
        : JSON.stringify(settings);
    }

    // Update the newsletter
    const updatedNewsletter = await prisma.newsletterItem.update({
      where: { id },
      data: updateData
    });

    logger.info('Draft newsletter updated successfully', {
      module: 'newsletter-draft-service',
      context: {
        id: updatedNewsletter.id,
        subject: updatedNewsletter.subject
      }
    });

    return updatedNewsletter;
  } catch (error) {
    if (error instanceof NewsletterNotFoundError || error instanceof NewsletterValidationError) {
      throw error;
    }
    throw handleDatabaseError(error, 'updateDraftNewsletter');
  }
}

/**
 * Lists draft newsletters with pagination and search
 *
 * @param params - Pagination and search parameters
 * @returns Promise resolving to paginated result
 */
export async function listDraftNewsletters(params: {
  page?: number;
  limit?: number;
  search?: string;
} = {}): Promise<PaginatedResult<NewsletterItem>> {
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
    const where = {
      status: 'draft',
      ...(search ? {
        OR: [
          {
            subject: {
              contains: search,
              mode: 'insensitive' as const
            }
          },
          {
            introductionText: {
              contains: search,
              mode: 'insensitive' as const
            }
          }
        ]
      } : {})
    };

    // Fetch records and total count in parallel
    const [newsletters, total] = await Promise.all([
      prisma.newsletterItem.findMany({
        where,
        orderBy: {
          updatedAt: 'desc'
        },
        skip,
        take: validLimit
      }),
      prisma.newsletterItem.count({ where })
    ]);

    // Calculate total pages
    const totalPages = Math.ceil(total / validLimit);

    logger.debug('Draft newsletters listed', {
      module: 'newsletter-draft-service',
      context: {
        page: validPage,
        limit: validLimit,
        total,
        search
      }
    });

    return {
      items: newsletters,
      total,
      page: validPage,
      limit: validLimit,
      totalPages
    };
  } catch (error) {
    throw handleDatabaseError(error, 'listDraftNewsletters');
  }
}

/**
 * Deletes a draft newsletter
 *
 * @param id - Newsletter ID
 * @returns Promise resolving to the deleted newsletter
 */
export async function deleteDraftNewsletter(id: string): Promise<NewsletterItem> {
  try {
    // Check if newsletter exists and is a draft
    const existingNewsletter = await prisma.newsletterItem.findUnique({
      where: { id }
    });

    if (!existingNewsletter) {
      throw new NewsletterNotFoundError('Newsletter not found', { id });
    }

    if (existingNewsletter.status !== 'draft') {
      throw new NewsletterValidationError('Only draft newsletters can be deleted', {
        status: existingNewsletter.status
      });
    }

    // Delete the newsletter
    const deletedNewsletter = await prisma.newsletterItem.delete({
      where: { id }
    });

    logger.info('Draft newsletter deleted successfully', {
      module: 'newsletter-draft-service',
      context: {
        id: deletedNewsletter.id,
        subject: deletedNewsletter.subject
      }
    });

    return deletedNewsletter;
  } catch (error) {
    if (error instanceof NewsletterNotFoundError || error instanceof NewsletterValidationError) {
      throw error;
    }
    throw handleDatabaseError(error, 'deleteDraftNewsletter');
  }
}
