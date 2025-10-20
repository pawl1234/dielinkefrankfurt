/**
 * Data Access Layer for Newsletter Domain
 *
 * Pure database operations using Prisma ORM.
 * No business logic - just database queries with clear input/output contracts.
 * All newsletter-related Prisma operations are centralized here.
 */

import prisma from '@/lib/db/prisma';
import type {
  Newsletter,
  NewsletterItem,
  NewsletterAnalytics,
  NewsletterFingerprint,
  NewsletterLinkClick,
  NewsletterLinkClickFingerprint,
  HashedRecipient
} from '@prisma/client';
import type { CreateNewsletterItemData } from '@/types/newsletter-types';

// ============================================================================
// Newsletter Settings Operations
// ============================================================================

/**
 * Get newsletter settings from database
 *
 * @returns Newsletter settings or null if not found
 */
export async function getNewsletterSettingsFromDb(): Promise<Newsletter | null> {
  return prisma.newsletter.findFirst();
}

/**
 * Create newsletter settings with default values
 *
 * @param data - Newsletter settings data
 * @returns Created newsletter settings
 */
export async function createNewsletterSettingsInDb(
  data: Omit<Newsletter, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Newsletter> {
  return prisma.newsletter.create({ data });
}

/**
 * Update newsletter settings in database
 *
 * @param id - Settings record ID
 * @param data - Partial settings data to update
 * @returns Updated newsletter settings
 */
export async function updateNewsletterSettingsInDb(
  id: number,
  data: Partial<Newsletter>
): Promise<Newsletter> {
  return prisma.newsletter.update({
    where: { id },
    data
  });
}

// ============================================================================
// Newsletter Item Operations
// ============================================================================

/**
 * Get newsletter item by ID
 *
 * @param id - Newsletter ID
 * @returns Newsletter item or null if not found
 */
export async function getNewsletterById(id: string): Promise<NewsletterItem | null> {
  return prisma.newsletterItem.findUnique({
    where: { id }
  });
}

/**
 * Get newsletter item with analytics
 *
 * @param id - Newsletter ID
 * @returns Newsletter item with analytics or null if not found
 */
export async function getNewsletterWithAnalytics(id: string): Promise<NewsletterItemWithAnalytics | null> {
  return prisma.newsletterItem.findUnique({
    where: { id },
    include: { analytics: true }
  });
}

type NewsletterItemWithAnalytics = NewsletterItem & {
  analytics: NewsletterAnalytics | null;
};

/**
 * Create a new newsletter item
 *
 * @param data - Newsletter item data (only subject and introductionText are required)
 * @returns Created newsletter item
 */
export async function createNewsletterItem(
  data: CreateNewsletterItemData
): Promise<NewsletterItem> {
  return prisma.newsletterItem.create({ data });
}

/**
 * Update newsletter item
 *
 * @param id - Newsletter ID
 * @param data - Partial newsletter data to update
 * @returns Updated newsletter item
 */
export async function updateNewsletterItem(
  id: string,
  data: Partial<NewsletterItem>
): Promise<NewsletterItem> {
  return prisma.newsletterItem.update({
    where: { id },
    data: {
      ...data,
      updatedAt: new Date()
    }
  });
}

/**
 * Update newsletter status
 *
 * @param id - Newsletter ID
 * @param status - New status value
 * @returns Updated newsletter item
 */
export async function updateNewsletterStatus(
  id: string,
  status: string
): Promise<NewsletterItem> {
  return prisma.newsletterItem.update({
    where: { id },
    data: {
      status,
      updatedAt: new Date()
    }
  });
}

/**
 * Delete newsletter item
 *
 * @param id - Newsletter ID
 * @returns Deleted newsletter item
 */
export async function deleteNewsletterItem(id: string): Promise<NewsletterItem> {
  return prisma.newsletterItem.delete({
    where: { id }
  });
}

/**
 * Get all newsletter items with optional status filter
 *
 * @param status - Optional status filter
 * @returns Array of newsletter items
 */
export async function getAllNewsletterItems(status?: string): Promise<NewsletterItem[]> {
  return prisma.newsletterItem.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: 'desc' }
  });
}

// ============================================================================
// Newsletter Analytics Operations
// ============================================================================

/**
 * Get newsletter analytics by newsletter ID
 *
 * @param newsletterId - Newsletter ID
 * @returns Newsletter analytics or null if not found
 */
export async function getNewsletterAnalytics(
  newsletterId: string
): Promise<NewsletterAnalytics | null> {
  return prisma.newsletterAnalytics.findUnique({
    where: { newsletterId }
  });
}

/**
 * Create newsletter analytics record
 *
 * @param data - Analytics data
 * @returns Created analytics record
 */
export async function createNewsletterAnalytics(
  data: Omit<NewsletterAnalytics, 'id' | 'createdAt' | 'pixelToken'>
): Promise<NewsletterAnalytics> {
  return prisma.newsletterAnalytics.create({ data });
}

/**
 * Update newsletter analytics
 *
 * @param newsletterId - Newsletter ID
 * @param data - Partial analytics data to update
 * @returns Updated analytics record
 */
export async function updateNewsletterAnalytics(
  newsletterId: string,
  data: Partial<NewsletterAnalytics>
): Promise<NewsletterAnalytics> {
  return prisma.newsletterAnalytics.update({
    where: { newsletterId },
    data
  });
}

/**
 * Increment analytics counters
 *
 * @param newsletterId - Newsletter ID
 * @param field - Field to increment ('totalOpens', 'uniqueOpens', etc.)
 * @param amount - Amount to increment by (default: 1)
 * @returns Updated analytics record
 */
export async function incrementAnalyticsCounter(
  newsletterId: string,
  field: keyof Pick<NewsletterAnalytics, 'totalOpens' | 'uniqueOpens'>,
  amount: number = 1
): Promise<NewsletterAnalytics> {
  return prisma.newsletterAnalytics.update({
    where: { newsletterId },
    data: {
      [field]: { increment: amount }
    }
  });
}

/**
 * Get analytics by pixel token
 *
 * @param pixelToken - Pixel tracking token
 * @returns Newsletter analytics or null if not found
 */
export async function getAnalyticsByPixelToken(
  pixelToken: string
): Promise<NewsletterAnalytics | null> {
  return prisma.newsletterAnalytics.findUnique({
    where: { pixelToken }
  });
}

// ============================================================================
// Newsletter Fingerprint Operations (Tracking)
// ============================================================================

/**
 * Get newsletter fingerprints for a specific newsletter
 *
 * @param analyticsId - Analytics record ID
 * @returns Array of fingerprint records
 */
export async function getNewsletterFingerprints(
  analyticsId: string
): Promise<NewsletterFingerprint[]> {
  return prisma.newsletterFingerprint.findMany({
    where: { analyticsId }
  });
}

/**
 * Find fingerprint by analytics ID and fingerprint hash
 *
 * @param analyticsId - Analytics record ID
 * @param fingerprint - Fingerprint hash
 * @returns Fingerprint record or null if not found
 */
export async function findFingerprintByHash(
  analyticsId: string,
  fingerprint: string
): Promise<NewsletterFingerprint | null> {
  return prisma.newsletterFingerprint.findUnique({
    where: {
      analyticsId_fingerprint: {
        analyticsId,
        fingerprint
      }
    }
  });
}

/**
 * Create newsletter fingerprint
 *
 * @param data - Fingerprint data
 * @returns Created fingerprint record
 */
export async function createNewsletterFingerprint(
  data: Omit<NewsletterFingerprint, 'id' | 'createdAt' | 'updatedAt'>
): Promise<NewsletterFingerprint> {
  return prisma.newsletterFingerprint.create({ data });
}

/**
 * Update newsletter fingerprint
 *
 * @param id - Fingerprint ID
 * @param data - Partial fingerprint data to update
 * @returns Updated fingerprint record
 */
export async function updateNewsletterFingerprint(
  id: string,
  data: Partial<NewsletterFingerprint>
): Promise<NewsletterFingerprint> {
  return prisma.newsletterFingerprint.update({
    where: { id },
    data: {
      ...data,
      updatedAt: new Date()
    }
  });
}

/**
 * Increment fingerprint open count
 *
 * @param id - Fingerprint ID
 * @returns Updated fingerprint record
 */
export async function incrementFingerprintOpenCount(
  id: string
): Promise<NewsletterFingerprint> {
  return prisma.newsletterFingerprint.update({
    where: { id },
    data: {
      openCount: { increment: 1 },
      lastOpenAt: new Date(),
      updatedAt: new Date()
    }
  });
}

// ============================================================================
// Newsletter Link Click Operations
// ============================================================================

/**
 * Get all link clicks for a newsletter
 *
 * @param analyticsId - Analytics record ID
 * @returns Array of link click records
 */
export async function getNewsletterLinkClicks(
  analyticsId: string
): Promise<NewsletterLinkClick[]> {
  return prisma.newsletterLinkClick.findMany({
    where: { analyticsId },
    orderBy: { clickCount: 'desc' }
  });
}

/**
 * Find link click by URL
 *
 * @param analyticsId - Analytics record ID
 * @param url - Link URL
 * @returns Link click record or null if not found
 */
export async function findLinkClickByUrl(
  analyticsId: string,
  url: string
): Promise<NewsletterLinkClick | null> {
  return prisma.newsletterLinkClick.findUnique({
    where: {
      analyticsId_url: {
        analyticsId,
        url
      }
    }
  });
}

/**
 * Create newsletter link click record
 *
 * @param data - Link click data
 * @returns Created link click record
 */
export async function createNewsletterLinkClick(
  data: Omit<NewsletterLinkClick, 'id'>
): Promise<NewsletterLinkClick> {
  return prisma.newsletterLinkClick.create({ data });
}

/**
 * Increment link click count
 *
 * @param id - Link click ID
 * @returns Updated link click record
 */
export async function incrementLinkClickCount(
  id: string
): Promise<NewsletterLinkClick> {
  return prisma.newsletterLinkClick.update({
    where: { id },
    data: {
      clickCount: { increment: 1 },
      lastClick: new Date()
    }
  });
}

/**
 * Increment unique click count
 *
 * @param id - Link click ID
 * @returns Updated link click record
 */
export async function incrementUniqueClickCount(
  id: string
): Promise<NewsletterLinkClick> {
  return prisma.newsletterLinkClick.update({
    where: { id },
    data: {
      uniqueClicks: { increment: 1 }
    }
  });
}

// ============================================================================
// Newsletter Link Click Fingerprint Operations
// ============================================================================

/**
 * Find link click fingerprint
 *
 * @param linkClickId - Link click ID
 * @param fingerprint - Fingerprint hash
 * @returns Link click fingerprint or null if not found
 */
export async function findLinkClickFingerprint(
  linkClickId: string,
  fingerprint: string
): Promise<NewsletterLinkClickFingerprint | null> {
  return prisma.newsletterLinkClickFingerprint.findUnique({
    where: {
      linkClickId_fingerprint: {
        linkClickId,
        fingerprint
      }
    }
  });
}

/**
 * Create link click fingerprint
 *
 * @param data - Link click fingerprint data
 * @returns Created link click fingerprint record
 */
export async function createLinkClickFingerprint(
  data: Omit<NewsletterLinkClickFingerprint, 'id' | 'createdAt' | 'updatedAt'>
): Promise<NewsletterLinkClickFingerprint> {
  return prisma.newsletterLinkClickFingerprint.create({ data });
}

/**
 * Increment link click fingerprint count
 *
 * @param id - Link click fingerprint ID
 * @returns Updated link click fingerprint record
 */
export async function incrementLinkClickFingerprintCount(
  id: string
): Promise<NewsletterLinkClickFingerprint> {
  return prisma.newsletterLinkClickFingerprint.update({
    where: { id },
    data: {
      clickCount: { increment: 1 },
      lastClickAt: new Date(),
      updatedAt: new Date()
    }
  });
}

// ============================================================================
// Hashed Recipient Operations
// ============================================================================

/**
 * Find hashed recipient by email hash
 *
 * @param hashedEmail - SHA256 hash of email
 * @returns Hashed recipient or null if not found
 */
export async function findHashedRecipient(
  hashedEmail: string
): Promise<HashedRecipient | null> {
  return prisma.hashedRecipient.findUnique({
    where: { hashedEmail }
  });
}

/**
 * Create hashed recipient
 *
 * @param hashedEmail - SHA256 hash of email
 * @returns Created hashed recipient record
 */
export async function createHashedRecipient(
  hashedEmail: string
): Promise<HashedRecipient> {
  return prisma.hashedRecipient.create({
    data: { hashedEmail }
  });
}

/**
 * Update last sent date for hashed recipient
 *
 * @param hashedEmail - SHA256 hash of email
 * @returns Updated hashed recipient record
 */
export async function updateHashedRecipientLastSent(
  hashedEmail: string
): Promise<HashedRecipient> {
  return prisma.hashedRecipient.update({
    where: { hashedEmail },
    data: { lastSent: new Date() }
  });
}

/**
 * Upsert hashed recipient (create or update last sent)
 *
 * @param hashedEmail - SHA256 hash of email
 * @returns Upserted hashed recipient record
 */
export async function upsertHashedRecipient(
  hashedEmail: string
): Promise<HashedRecipient> {
  return prisma.hashedRecipient.upsert({
    where: { hashedEmail },
    create: {
      hashedEmail,
      lastSent: new Date()
    },
    update: {
      lastSent: new Date()
    }
  });
}

// ============================================================================
// Archive Operations
// ============================================================================

/**
 * Get archived newsletters (sent status)
 *
 * @returns Array of sent newsletter items
 */
export async function getArchivedNewsletters(): Promise<NewsletterItem[]> {
  return prisma.newsletterItem.findMany({
    where: { status: 'sent' },
    orderBy: { sentAt: 'desc' }
  });
}

/**
 * Get archived newsletter by ID with analytics
 *
 * @param id - Newsletter ID
 * @returns Newsletter item with analytics or null if not found
 */
export async function getArchivedNewsletterById(
  id: string
): Promise<NewsletterItemWithAnalytics | null> {
  return prisma.newsletterItem.findUnique({
    where: {
      id,
      status: 'sent'
    },
    include: { analytics: true }
  });
}
