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
  HashedRecipient,
  Appointment,
  Group,
  StatusReport,
  NewsletterFingerprint,
  NewsletterLinkClick,
  NewsletterLinkClickFingerprint,
  Prisma
} from '@prisma/client';
import type {
  CreateNewsletterItemData,
  NewsletterQueryFilters,
  PaginationOptions,
  PaginatedNewsletterResult,
  GetNewsletterItemsOptions
} from '@/types/newsletter-types';

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
 * Get newsletter items with flexible filtering, sorting, and limiting
 *
 * @param options - Query options (status, sortBy, sortOrder, limit)
 * @returns Array of newsletter items
 */
export async function getAllNewsletterItems(
  options?: GetNewsletterItemsOptions
): Promise<NewsletterItem[]> {
  const {
    status,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    limit
  } = options || {};

  return prisma.newsletterItem.findMany({
    where: status ? { status } : undefined,
    orderBy: { [sortBy]: sortOrder },
    take: limit
  });
}

/**
 * Get paginated newsletters with optional filtering
 *
 * @param filters - Search and status filters
 * @param pagination - Page and limit options
 * @returns Paginated newsletter items with total count
 */
export async function getNewslettersWithPagination(
  filters: NewsletterQueryFilters,
  pagination: PaginationOptions
): Promise<PaginatedNewsletterResult> {
  const { search, status } = filters;
  const { page, limit } = pagination;

  // Calculate skip for pagination
  const skip = (page - 1) * limit;

  // Build where clause
  const where: Prisma.NewsletterItemWhereInput = {};

  if (search) {
    where.OR = [
      { subject: { contains: search, mode: 'insensitive' } },
      { introductionText: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (status) {
    where.status = status;
  }

  // Fetch newsletters and total count in parallel
  const [items, total] = await Promise.all([
    prisma.newsletterItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.newsletterItem.count({ where }),
  ]);

  return { items, total };
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
 * Get newsletter analytics with related newsletter info and link clicks
 *
 * @param newsletterId - Newsletter ID
 * @returns Newsletter analytics with included data or null if not found
 */
export async function getNewsletterAnalyticsWithDetails(newsletterId: string) {
  return prisma.newsletterAnalytics.findUnique({
    where: { newsletterId },
    include: {
      newsletter: {
        select: {
          id: true,
          subject: true,
          sentAt: true,
        },
      },
      linkClicks: {
        orderBy: { clickCount: 'desc' },
      },
    },
  });
}

/**
 * Create newsletter analytics record
 *
 * @param newsletterId - Newsletter ID
 * @param totalRecipients - Total number of recipients
 * @returns Created analytics record
 */
export async function createNewsletterAnalytics(
  newsletterId: string,
  totalRecipients: number
): Promise<NewsletterAnalytics> {
  return prisma.newsletterAnalytics.create({
    data: {
      newsletterId,
      totalRecipients
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

/**
 * Increment unique opens count for analytics
 *
 * @param analyticsId - Analytics record ID
 * @returns Updated analytics record
 */
export async function incrementAnalyticsUniqueOpens(
  analyticsId: string
): Promise<NewsletterAnalytics> {
  return prisma.newsletterAnalytics.update({
    where: { id: analyticsId },
    data: { uniqueOpens: { increment: 1 } }
  });
}

/**
 * Increment total opens count for analytics
 *
 * @param pixelToken - Pixel tracking token
 * @returns Updated analytics record
 */
export async function incrementAnalyticsTotalOpens(
  pixelToken: string
): Promise<NewsletterAnalytics> {
  return prisma.newsletterAnalytics.update({
    where: { pixelToken },
    data: { totalOpens: { increment: 1 } }
  });
}

/**
 * Delete newsletter analytics older than specified date
 * Cascade will handle related records (fingerprints, link clicks)
 *
 * @param beforeDate - Delete analytics created before this date
 * @returns Number of deleted analytics records
 */
export async function deleteNewsletterAnalyticsOlderThan(
  beforeDate: Date
): Promise<number> {
  const result = await prisma.newsletterAnalytics.deleteMany({
    where: {
      createdAt: { lt: beforeDate }
    }
  });
  return result.count;
}

// ============================================================================
// Fingerprint Tracking Operations
// ============================================================================

/**
 * Upsert newsletter fingerprint for open tracking
 * Creates new fingerprint or increments open count for existing
 *
 * @param analyticsId - Analytics record ID
 * @param fingerprint - SHA256 fingerprint hash
 * @returns Created or updated fingerprint record
 */
export async function upsertNewsletterFingerprint(
  analyticsId: string,
  fingerprint: string
): Promise<NewsletterFingerprint> {
  return prisma.newsletterFingerprint.upsert({
    where: {
      analyticsId_fingerprint: {
        analyticsId,
        fingerprint
      }
    },
    create: {
      analyticsId,
      fingerprint,
      openCount: 1,
      firstOpenAt: new Date(),
      lastOpenAt: new Date()
    },
    update: {
      openCount: { increment: 1 },
      lastOpenAt: new Date()
    }
  });
}

/**
 * Upsert link click fingerprint
 * Creates new fingerprint or increments click count for existing
 *
 * @param linkClickId - Link click record ID
 * @param fingerprint - SHA256 fingerprint hash
 * @returns Created or updated fingerprint record
 */
export async function upsertLinkClickFingerprint(
  linkClickId: string,
  fingerprint: string
): Promise<NewsletterLinkClickFingerprint> {
  return prisma.newsletterLinkClickFingerprint.upsert({
    where: {
      linkClickId_fingerprint: {
        linkClickId,
        fingerprint
      }
    },
    create: {
      linkClickId,
      fingerprint,
      clickCount: 1,
      firstClickAt: new Date(),
      lastClickAt: new Date()
    },
    update: {
      clickCount: { increment: 1 },
      lastClickAt: new Date()
    }
  });
}

// ============================================================================
// Link Click Operations
// ============================================================================

/**
 * Upsert newsletter link click record
 * Creates new link click or increments count for existing URL
 *
 * @param analyticsId - Analytics record ID
 * @param url - The clicked URL
 * @param linkType - Type of link (appointment, statusreport, etc.)
 * @param linkId - Optional ID of the linked item
 * @returns Created or updated link click record
 */
export async function upsertNewsletterLinkClick(
  analyticsId: string,
  url: string,
  linkType: string,
  linkId?: string
): Promise<NewsletterLinkClick> {
  const now = new Date();
  return prisma.newsletterLinkClick.upsert({
    where: {
      analyticsId_url: {
        analyticsId,
        url
      }
    },
    create: {
      analyticsId,
      url,
      linkType,
      linkId,
      clickCount: 1,
      firstClick: now,
      lastClick: now
    },
    update: {
      clickCount: { increment: 1 },
      lastClick: now
    }
  });
}

/**
 * Increment unique clicks count for link click
 *
 * @param linkClickId - Link click record ID
 * @returns Updated link click record
 */
export async function incrementLinkClickUniqueClicks(
  linkClickId: string
): Promise<NewsletterLinkClick> {
  return prisma.newsletterLinkClick.update({
    where: { id: linkClickId },
    data: { uniqueClicks: { increment: 1 } }
  });
}

// ============================================================================
// Archive Operations
// ============================================================================

/**
 * Get recent sent newsletters with analytics data
 *
 * @param limit - Maximum number of newsletters to return (default: 10)
 * @returns Array of sent newsletters with analytics
 */
export async function getRecentSentNewslettersWithAnalytics(limit: number = 10) {
  return prisma.newsletterItem.findMany({
    where: {
      status: 'sent',
      sentAt: { not: null },
    },
    orderBy: { sentAt: 'desc' },
    take: limit,
    include: {
      analytics: {
        select: {
          totalRecipients: true,
          uniqueOpens: true,
          linkClicks: {
            select: {
              clickCount: true,
            },
          },
        },
      },
    },
  });
}

/**
 * Get overall analytics metrics (aggregated)
 *
 * @returns Aggregated analytics metrics (sum of unique opens, recipients, newsletter count)
 */
export async function getOverallAnalyticsMetrics() {
  return prisma.newsletterAnalytics.aggregate({
    _sum: {
      uniqueOpens: true,
      totalRecipients: true,
    },
    _count: {
      id: true,
    },
  });
}

/**
 * Get total link clicks across all newsletters (aggregated)
 *
 * @returns Aggregated total click count
 */
export async function getTotalLinkClicks() {
  return prisma.newsletterLinkClick.aggregate({
    _sum: {
      clickCount: true,
    },
  });
}

// ============================================================================
// Hashed Recipients Operations
// ============================================================================

/**
 * Find multiple hashed recipients by their hashed email values
 *
 * @param hashedEmails - Array of hashed email strings to search for
 * @returns Array of matching hashed recipients
 */
export async function findHashedRecipientsByEmails(
  hashedEmails: string[]
): Promise<HashedRecipient[]> {
  return prisma.hashedRecipient.findMany({
    where: { hashedEmail: { in: hashedEmails } }
  });
}

/**
 * Create a new hashed recipient record
 *
 * @param data - Hashed email and first seen date
 * @returns Created hashed recipient
 */
export async function createHashedRecipient(
  data: { hashedEmail: string; firstSeen: Date }
): Promise<HashedRecipient> {
  return prisma.hashedRecipient.create({
    data
  });
}

// ============================================================================
// Appointment Operations
// ============================================================================

/**
 * Get upcoming accepted appointments filtered by featured status
 *
 * @param featured - Filter by featured flag (true/false)
 * @param limit - Maximum number of appointments to return
 * @param fromDate - Only return appointments from this date onwards (default: today)
 * @returns Array of appointments matching criteria, ordered by startDateTime ascending
 */
export async function getUpcomingAppointments(
  featured: boolean,
  limit: number,
  fromDate: Date = new Date()
): Promise<Appointment[]> {
  return prisma.appointment.findMany({
    where: {
      featured,
      status: 'accepted',
      startDateTime: {
        gte: fromDate
      }
    },
    orderBy: {
      startDateTime: 'asc'
    },
    take: limit
  });
}

// ============================================================================
// Group Operations
// ============================================================================

/**
 * Get active groups with their active status reports from a date range
 * Useful for newsletter generation and group activity reports
 *
 * @param statusReportsFromDate - Only include status reports created on or after this date
 * @param groupLimit - Maximum number of groups to return
 * @param reportsPerGroupLimit - Maximum number of reports per group
 * @returns Array of groups with their status reports, ordered by group name
 */
export async function getActiveGroupsWithStatusReports(
  statusReportsFromDate: Date,
  groupLimit: number,
  reportsPerGroupLimit: number
): Promise<(Group & { statusReports: StatusReport[] })[]> {
  // Use conservative buffer to account for groups that may have no qualifying reports
  const candidateLimit = Math.min(groupLimit * 2, 100);

  return prisma.group.findMany({
    where: {
      status: 'ACTIVE',
      statusReports: {
        some: {
          status: 'ACTIVE',
          createdAt: {
            gte: statusReportsFromDate
          }
        }
      }
    },
    orderBy: {
      name: 'asc'
    },
    take: candidateLimit,
    include: {
      statusReports: {
        where: {
          status: 'ACTIVE',
          createdAt: {
            gte: statusReportsFromDate
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: reportsPerGroupLimit
      }
    }
  });
}
