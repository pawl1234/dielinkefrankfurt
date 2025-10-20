import prisma from '@/lib/db/prisma';
import { NewsletterItem } from '@prisma/client';
import { logger } from '@/lib/logger';
import { handleDatabaseError } from '@/lib/errors';

/**
 * Interface for sent newsletter with formatted data
 */
export interface SentNewsletterWithMeta extends NewsletterItem {
  settingsData?: Record<string, unknown>;
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