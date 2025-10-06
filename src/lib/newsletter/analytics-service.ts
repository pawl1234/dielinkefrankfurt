import prisma from '@/lib/db/prisma';
import { NewsletterAnalytics } from '@/types/newsletter-analytics';
import { logger } from '@/lib/logger';

/**
 * Helper function to safely format fingerprint for logging
 * @param fingerprint - The fingerprint to format
 * @returns Formatted fingerprint string for logging
 */
function formatFingerprintForLogging(fingerprint?: string): string {
  return fingerprint ? fingerprint.substring(0, 8) + '...' : 'none';
}

/**
 * Helper function to get analytics record by pixel token
 * @param pixelToken - The pixel token
 * @returns Analytics record or null if not found
 */
async function getAnalyticsByPixelToken(pixelToken: string) {
  return await prisma.newsletterAnalytics.findUnique({
    where: { pixelToken },
    select: { id: true, newsletterId: true },
  });
}


// 1x1 transparent GIF (43 bytes)
export const TRANSPARENT_GIF_BUFFER = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);


/**
 * Records a unique link click fingerprint with upsert logic
 * Increments uniqueClicks only for new fingerprints
 * 
 * @param linkClickId - The link click record ID
 * @param fingerprint - The SHA256 fingerprint hash
 * @returns Promise that resolves when the fingerprint is recorded
 */
export async function recordLinkClickFingerprint(
  linkClickId: string,
  fingerprint: string
): Promise<void> {
  try {
    // Use Prisma upsert for atomic operations
    const fingerprintRecord = await prisma.newsletterLinkClickFingerprint.upsert({
      where: {
        linkClickId_fingerprint: {
          linkClickId,
          fingerprint,
        },
      },
      create: {
        linkClickId,
        fingerprint,
        clickCount: 1,
        firstClickAt: new Date(),
        lastClickAt: new Date(),
      },
      update: {
        clickCount: { increment: 1 },
        lastClickAt: new Date(),
      },
    });
    
    // Increment uniqueClicks only for new fingerprints (first click)
    if (fingerprintRecord.clickCount === 1) {
      await prisma.newsletterLinkClick.update({
        where: { id: linkClickId },
        data: { uniqueClicks: { increment: 1 } },
      });
    }
  } catch (error) {
    // Silently fail - don't break the link click tracking
    logger.error(error as Error, {
      module: 'newsletter-analytics-service',
      context: {
        operation: 'recordLinkClickFingerprint',
        linkClickId,
        fingerprint: formatFingerprintForLogging(fingerprint)
      }
    });
  }
}

/**
 * Records a fingerprint open event with upsert logic
 * Increments uniqueOpens only for new fingerprints
 * 
 * @param analyticsId - The analytics record ID
 * @param fingerprint - The SHA256 fingerprint hash
 * @returns Promise that resolves when the fingerprint open is recorded
 */
export async function recordFingerprintOpen(
  analyticsId: string,
  fingerprint: string
): Promise<void> {
  try {
    // Use Prisma upsert for atomic operations
    const fingerprintRecord = await prisma.newsletterFingerprint.upsert({
      where: {
        analyticsId_fingerprint: {
          analyticsId,
          fingerprint,
        },
      },
      create: {
        analyticsId,
        fingerprint,
        openCount: 1,
        firstOpenAt: new Date(),
        lastOpenAt: new Date(),
      },
      update: {
        openCount: { increment: 1 },
        lastOpenAt: new Date(),
      },
    });
    
    // Increment uniqueOpens only for new fingerprints (first open)
    if (fingerprintRecord.openCount === 1) {
      await prisma.newsletterAnalytics.update({
        where: { id: analyticsId },
        data: { uniqueOpens: { increment: 1 } },
      });
    }
  } catch (error) {
    // Silently fail - don't break the tracking pixel response
    logger.error(error as Error, {
      module: 'newsletter-analytics-service',
      context: {
        operation: 'recordFingerprintOpen',
        analyticsId,
        fingerprint: formatFingerprintForLogging(fingerprint)
      }
    });
  }
}

/**
 * Creates analytics record for a newsletter when it's sent
 * 
 * @param newsletterId - The ID of the newsletter being sent
 * @param recipientCount - Number of recipients
 * @returns The created analytics record
 */
export async function createNewsletterAnalytics(
  newsletterId: string,
  recipientCount: number
): Promise<NewsletterAnalytics> {
  try {
    // Check if prisma client and model are available
    if (!prisma || !prisma.newsletterAnalytics) {
      throw new Error('Prisma client or NewsletterAnalytics model not available');
    }

    const analytics = await prisma.newsletterAnalytics.create({
      data: {
        newsletterId,
        totalRecipients: recipientCount,
      },
    });

    return analytics;
  } catch (error) {
    logger.error(error as Error, {
      module: 'newsletter-analytics-service',
      context: {
        operation: 'createNewsletterAnalytics',
        newsletterId,
        recipientCount
      }
    });
    throw error;
  }
}


/**
 * Records an open event for analytics
 * 
 * @param pixelToken - The tracking pixel token
 * @param fingerprint - Optional fingerprint for unique open tracking
 * @returns Promise that resolves when the open event is recorded
 */
export async function recordOpenEvent(pixelToken: string, fingerprint?: string): Promise<void> {
  try {
    // Get analytics record
    const analytics = await getAnalyticsByPixelToken(pixelToken);
    
    if (!analytics) {
      return;
    }
    
    // Increment total opens atomically
    await prisma.newsletterAnalytics.update({
      where: { pixelToken },
      data: { totalOpens: { increment: 1 } },
    });
    
    // Record fingerprint open if fingerprint provided
    if (fingerprint) {
      await recordFingerprintOpen(analytics.id, fingerprint);
    }
    
  } catch (error) {
    // Silently fail - don't break the tracking pixel response
    logger.error(error as Error, {
      module: 'newsletter-analytics-service',
      context: {
        operation: 'recordNewsletterOpen',
        pixelToken,
        fingerprint: formatFingerprintForLogging(fingerprint)
      }
    });
  }
}

/**
 * Records a link click event
 * 
 * @param analyticsToken - The analytics token from the URL
 * @param url - The original URL that was clicked
 * @param linkType - Type of link (appointment or statusreport)
 * @param linkId - Optional ID of the linked item
 * @param fingerprint - Optional fingerprint for unique click tracking
 * @returns Promise that resolves when the link click is recorded
 */
export async function recordLinkClick(
  analyticsToken: string,
  url: string,
  linkType: string,
  linkId?: string,
  fingerprint?: string
): Promise<void> {
  try {
    // Get analytics record
    const analytics = await getAnalyticsByPixelToken(analyticsToken);
    
    if (!analytics) {
      return;
    }
    
    // Upsert link click record
    const now = new Date();
    const linkClick = await prisma.newsletterLinkClick.upsert({
      where: {
        analyticsId_url: {
          analyticsId: analytics.id,
          url,
        },
      },
      create: {
        analyticsId: analytics.id,
        url,
        linkType,
        linkId,
        clickCount: 1,
        firstClick: now,
        lastClick: now,
      },
      update: {
        clickCount: { increment: 1 },
        lastClick: now,
      },
    });
    
    // Record fingerprint click if fingerprint provided
    if (fingerprint) {
      await recordLinkClickFingerprint(linkClick.id, fingerprint);
    }
  } catch (error) {
    // Silently fail - don't break the redirect
    logger.error(error as Error, {
      module: 'newsletter-analytics-service',
      context: {
        operation: 'recordLinkClick',
        analyticsToken,
        url: url.substring(0, 50) + '...',
        linkType,
        linkId,
        fingerprint: formatFingerprintForLogging(fingerprint)
      }
    });
  }
}

/**
 * Deletes analytics data older than 1 year
 * 
 * @returns Promise that resolves to the number of deleted analytics records
 */
export async function cleanupOldAnalytics(): Promise<number> {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  
  // Delete old analytics records (cascade will handle related records)
  const result = await prisma.newsletterAnalytics.deleteMany({
    where: {
      createdAt: {
        lt: oneYearAgo,
      },
    },
  });
  
  return result.count;
}