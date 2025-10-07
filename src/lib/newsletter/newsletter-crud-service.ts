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
 * Retrieves a newsletter by ID (draft or sent)
 *
 * @param id - Newsletter ID
 * @returns Promise resolving to the newsletter or null if not found
 */
export async function getNewsletter(id: string): Promise<NewsletterItem | null> {
  try {
    const newsletter = await prisma.newsletterItem.findUnique({
      where: { id }
    });

    return newsletter;
  } catch (error) {
    throw handleDatabaseError(error, 'getNewsletter');
  }
}

/**
 * Retrieves a newsletter by ID with proper error handling
 *
 * @param id - Newsletter ID
 * @returns Promise resolving to the newsletter
 * @throws NewsletterNotFoundError if newsletter doesn't exist
 */
export async function getNewsletterById(id: string): Promise<NewsletterItem> {
  try {
    const newsletter = await prisma.newsletterItem.findUnique({
      where: { id }
    });

    if (!newsletter) {
      throw new NewsletterNotFoundError(`Newsletter with ID ${id} not found`, { id });
    }

    logger.debug('Newsletter retrieved by ID', {
      module: 'newsletter-crud-service',
      context: {
        id: newsletter.id,
        subject: newsletter.subject,
        status: newsletter.status
      }
    });

    return newsletter;
  } catch (error) {
    if (error instanceof NewsletterNotFoundError) {
      throw error;
    }
    throw handleDatabaseError(error, 'getNewsletterById');
  }
}

/**
 * Lists newsletters with pagination and optional status filter
 *
 * @param params - Pagination and filter parameters
 * @returns Promise resolving to paginated result
 */
export async function listNewsletters(params: {
  page?: number;
  limit?: number;
  status?: string;
} = {}): Promise<PaginatedResult<NewsletterItem>> {
  try {
    const {
      page = 1,
      limit = 10,
      status
    } = params;

    // Validate pagination parameters
    const validPage = Math.max(1, page);
    const validLimit = Math.min(50, Math.max(1, limit)); // Limit between 1 and 50
    const skip = (validPage - 1) * validLimit;

    // Build filter conditions
    const where = status
      ? { status }
      : {};

    // Get total count
    const total = await prisma.newsletterItem.count({
      where
    });

    // Get newsletters
    const newsletters = await prisma.newsletterItem.findMany({
      where,
      skip,
      take: validLimit,
      orderBy: [
        { createdAt: 'desc' }
      ]
    });

    const totalPages = Math.ceil(total / validLimit);

    logger.debug('Newsletters listed successfully', {
      module: 'newsletter-crud-service',
      context: {
        page: validPage,
        limit: validLimit,
        total,
        totalPages,
        status
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
    throw handleDatabaseError(error, 'listNewsletters');
  }
}

/**
 * Creates a new newsletter
 *
 * @param data - Newsletter data with subject and optional introduction
 * @returns Promise resolving to the created newsletter
 */
export async function createNewsletter(data: {
  subject: string;
  introduction?: string;
}): Promise<NewsletterItem> {
  try {
    const { subject, introduction } = data;

    // Validate required fields
    if (!subject || subject.trim().length === 0) {
      throw new NewsletterValidationError('Newsletter subject is required', {
        subject: 'Subject is required and cannot be empty'
      });
    }

    // Validate subject length
    if (subject.length > 200) {
      throw new NewsletterValidationError('Newsletter subject is too long', {
        subject: 'Subject must be 200 characters or less'
      });
    }

    // Create the newsletter with draft status
    const newsletter = await prisma.newsletterItem.create({
      data: {
        subject: subject.trim(),
        introductionText: introduction || '',
        content: null,
        status: 'draft',
        settings: null,
        recipientCount: null,
        sentAt: null
      }
    });

    logger.info('Newsletter created successfully', {
      module: 'newsletter-crud-service',
      context: {
        id: newsletter.id,
        subject: newsletter.subject,
        operation: 'createNewsletter'
      }
    });

    return newsletter;
  } catch (error) {
    if (error instanceof NewsletterValidationError) {
      throw error;
    }
    throw handleDatabaseError(error, 'createNewsletter');
  }
}

/**
 * Updates an existing newsletter
 *
 * @param id - Newsletter ID
 * @param data - Partial newsletter data to update
 * @returns Promise resolving to the updated newsletter
 */
export async function updateNewsletter(
  id: string,
  data: Partial<NewsletterItem>
): Promise<NewsletterItem> {
  try {
    // Validate newsletter ID
    if (!id || id.trim().length === 0) {
      throw new NewsletterValidationError('Newsletter ID is required');
    }

    // Check if newsletter exists
    const existingNewsletter = await prisma.newsletterItem.findUnique({
      where: { id }
    });

    if (!existingNewsletter) {
      throw new NewsletterNotFoundError(`Newsletter with ID ${id} not found`, { id });
    }

    // Prevent updating sent newsletters
    if (existingNewsletter.status === 'sent') {
      throw new NewsletterValidationError('Cannot update a sent newsletter', {
        status: 'Newsletter has already been sent and cannot be modified'
      });
    }

    // Validate subject if provided
    if (data.subject !== undefined) {
      if (!data.subject || data.subject.trim().length === 0) {
        throw new NewsletterValidationError('Newsletter subject cannot be empty', {
          subject: 'Subject is required and cannot be empty'
        });
      }
      if (data.subject.length > 200) {
        throw new NewsletterValidationError('Newsletter subject is too long', {
          subject: 'Subject must be 200 characters or less'
        });
      }
    }

    // Prepare update data - only include allowed fields
    const updateData: Partial<{
      subject: string;
      introductionText: string;
      content: string | null;
      settings: string | null;
      status: string;
    }> = {};

    if (data.subject !== undefined) updateData.subject = data.subject.trim();
    if (data.introductionText !== undefined) updateData.introductionText = data.introductionText;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.settings !== undefined) {
      updateData.settings = typeof data.settings === 'string'
        ? data.settings
        : JSON.stringify(data.settings);
    }
    if (data.status !== undefined && ['draft', 'sending', 'sent'].includes(data.status)) {
      updateData.status = data.status;
    }

    // Update the newsletter
    const updatedNewsletter = await prisma.newsletterItem.update({
      where: { id },
      data: updateData
    });

    logger.info('Newsletter updated successfully', {
      module: 'newsletter-crud-service',
      context: {
        id: updatedNewsletter.id,
        subject: updatedNewsletter.subject,
        operation: 'updateNewsletter',
        updatedFields: Object.keys(updateData)
      }
    });

    return updatedNewsletter;
  } catch (error) {
    if (error instanceof NewsletterNotFoundError || error instanceof NewsletterValidationError) {
      throw error;
    }
    throw handleDatabaseError(error, 'updateNewsletter');
  }
}

/**
 * Deletes a newsletter
 *
 * @param id - Newsletter ID
 * @returns Promise resolving to the deleted newsletter
 */
export async function deleteNewsletter(id: string): Promise<NewsletterItem> {
  try {
    // Validate newsletter ID
    if (!id || id.trim().length === 0) {
      throw new NewsletterValidationError('Newsletter ID is required');
    }

    // Check if newsletter exists
    const existingNewsletter = await prisma.newsletterItem.findUnique({
      where: { id }
    });

    if (!existingNewsletter) {
      throw new NewsletterNotFoundError(`Newsletter with ID ${id} not found`, { id });
    }

    // Only allow deletion of draft newsletters
    if (existingNewsletter.status !== 'draft') {
      throw new NewsletterValidationError('Only draft newsletters can be deleted', {
        status: `Cannot delete newsletter with status: ${existingNewsletter.status}`
      });
    }

    // Delete the newsletter
    const deletedNewsletter = await prisma.newsletterItem.delete({
      where: { id }
    });

    logger.info('Newsletter deleted successfully', {
      module: 'newsletter-crud-service',
      context: {
        id: deletedNewsletter.id,
        subject: deletedNewsletter.subject,
        operation: 'deleteNewsletter'
      }
    });

    return deletedNewsletter;
  } catch (error) {
    if (error instanceof NewsletterNotFoundError || error instanceof NewsletterValidationError) {
      throw error;
    }
    throw handleDatabaseError(error, 'deleteNewsletter');
  }
}
