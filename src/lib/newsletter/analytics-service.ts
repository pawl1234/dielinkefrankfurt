import { NewsletterAnalytics } from '@/types/newsletter-analytics';
import { logger } from '@/lib/logger';
import {
  getAnalyticsByPixelToken,
  upsertNewsletterFingerprint,
  upsertLinkClickFingerprint,
  upsertNewsletterLinkClick,
  incrementAnalyticsUniqueOpens,
  incrementAnalyticsTotalOpens,
  incrementLinkClickUniqueClicks,
  createNewsletterAnalytics as createAnalyticsRecord,
  deleteNewsletterAnalyticsOlderThan
} from '@/lib/db/newsletter-operations';

/**
 * Helper function to safely format fingerprint for logging
 * @param fingerprint - The fingerprint to format
 * @returns Formatted fingerprint string for logging
 */
function formatFingerprintForLogging(fingerprint?: string): string {
  return fingerprint ? fingerprint.substring(0, 8) + '...' : 'none';
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
async function recordLinkClickFingerprint(
  linkClickId: string,
  fingerprint: string
): Promise<void> {
  try {
    // Use repository function for upsert
    const fingerprintRecord = await upsertLinkClickFingerprint(linkClickId, fingerprint);

    // Increment uniqueClicks only for new fingerprints (first click)
    if (fingerprintRecord.clickCount === 1) {
      await incrementLinkClickUniqueClicks(linkClickId);
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
async function recordFingerprintOpen(
  analyticsId: string,
  fingerprint: string
): Promise<void> {
  try {
    // Use repository function for upsert
    const fingerprintRecord = await upsertNewsletterFingerprint(analyticsId, fingerprint);

    // Increment uniqueOpens only for new fingerprints (first open)
    if (fingerprintRecord.openCount === 1) {
      await incrementAnalyticsUniqueOpens(analyticsId);
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
    const analytics = await createAnalyticsRecord(newsletterId, recipientCount);
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
    await incrementAnalyticsTotalOpens(pixelToken);

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
    const linkClick = await upsertNewsletterLinkClick(
      analytics.id,
      url,
      linkType,
      linkId
    );

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
  return await deleteNewsletterAnalyticsOlderThan(oneYearAgo);
}

/**
 * Adds tracking pixel and rewrites links in newsletter HTML
 * 
 * @param html - The newsletter HTML content
 * @param analyticsToken - The unique token for tracking
 * @param baseUrl - The base URL of the application
 * @returns Modified HTML with tracking
 */
export function addTrackingToNewsletter(
  html: string,
  analyticsToken: string,
  baseUrl: string
): string {
  // Add tracking pixel at the end of the email
  const pixelUrl = `${baseUrl}/api/newsletter/track/pixel/${analyticsToken}`;
  const pixel = `<img src="${pixelUrl}" width="1" height="1" style="display:none" alt="" />`;
  
  // Replace appointments and status report links with tracking links
  let modifiedHtml = html.replace(
    /href="(https?:\/\/[^"]*\/(termine|gruppen)\/[^"]+)"/g,
    (match, url) => {
      // Determine link type
      const linkType = url.includes('/termine/') ? 'appointment' : 'statusreport';
      
      // Extract ID from URL
      let linkId = null;
      const appointmentMatch = url.match(/\/termine\/(\d+)/);
      const statusReportMatch = url.match(/#report-([a-zA-Z0-9]+)/);
      
      if (appointmentMatch) {
        linkId = appointmentMatch[1];
      } else if (statusReportMatch) {
        linkId = statusReportMatch[1];
      }
      
      // Encode the original URL
      const encodedUrl = Buffer.from(url).toString('base64url');
      
      // Create tracking URL
      const trackingUrl = `${baseUrl}/api/newsletter/track/click/${analyticsToken}?url=${encodedUrl}&type=${linkType}${linkId ? `&id=${linkId}` : ''}`;
      
      return `href="${trackingUrl}"`;
    }
  );
  
  // Add pixel before closing body tag or at the end
  if (modifiedHtml.includes('</body>')) {
    modifiedHtml = modifiedHtml.replace('</body>', `${pixel}</body>`);
  } else {
    modifiedHtml += pixel;
  }
  
  return modifiedHtml;
}