import prisma from '@/lib/db/prisma';
import { Appointment, Group, StatusReport } from '@prisma/client';
import { subWeeks } from 'date-fns';
import { getBaseUrl } from '@/lib/base-url';
import { logger } from '@/lib/logger';
import { NEWSLETTER_LIMITS, NEWSLETTER_DATE_RANGES } from './constants';
import { NewsletterSettings } from '@/types/newsletter-types';
import { generateNewsletterHtml } from './template-generator';
import { getNewsletterSettings } from './settings-service';

/**
 * Fetches appointments for the newsletter with configurable limits
 * Returns only accepted appointments with future dates
 *
 * @param settings - Optional newsletter settings to override default limits
 * @returns Promise resolving to featured and upcoming appointments
 */
export async function fetchNewsletterAppointments(settings?: NewsletterSettings): Promise<{
  featuredAppointments: Appointment[];
  upcomingAppointments: Appointment[];
}> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    // Use default limits if settings not provided
    const maxFeatured = settings?.maxFeaturedAppointments ?? NEWSLETTER_LIMITS.FEATURED_APPOINTMENTS.DEFAULT;
    const maxUpcoming = settings?.maxUpcomingAppointments ?? NEWSLETTER_LIMITS.UPCOMING_APPOINTMENTS.DEFAULT;

    // Get featured appointments with limit
    const featuredAppointments = await prisma.appointment.findMany({
      where: {
        featured: true,
        status: 'accepted',
        startDateTime: {
          gte: today // Only appointments from today onwards
        }
      },
      orderBy: {
        startDateTime: 'asc'
      },
      take: maxFeatured
    });

    // Get upcoming appointments (not featured) with limit
    const upcomingAppointments = await prisma.appointment.findMany({
      where: {
        featured: false,
        status: 'accepted',
        startDateTime: {
          gte: today // Only appointments from today onwards
        }
      },
      orderBy: {
        startDateTime: 'asc'
      },
      take: maxUpcoming
    });

    logger.debug('Newsletter appointments fetched', {
      module: 'newsletter-preview-service',
      context: {
        featuredCount: featuredAppointments.length,
        upcomingCount: upcomingAppointments.length,
        maxFeatured,
        maxUpcoming
      }
    });

    return { featuredAppointments, upcomingAppointments };
  } catch (error) {
    logger.error(error as Error, {
      module: 'newsletter-preview-service',
      context: { operation: 'fetchNewsletterAppointments' }
    });
    throw error;
  }
}

/**
 * Fetches status reports from the last 2 weeks for the newsletter with configurable limits
 * Returns status reports with their associated groups
 *
 * @param settings - Optional newsletter settings to override default limits
 * @returns Promise resolving to status reports grouped by group
 */
export async function fetchNewsletterStatusReports(settings?: NewsletterSettings): Promise<{
  statusReportsByGroup: {
    group: Group,
    reports: StatusReport[]
  }[];
}> {
  try {
    // Get the date for status reports range
    const twoWeeksAgo = subWeeks(new Date(), NEWSLETTER_DATE_RANGES.STATUS_REPORTS_WEEKS_BACK);

    // Use default limits if settings not provided
    const maxGroups = settings?.maxGroupsWithReports ?? NEWSLETTER_LIMITS.GROUPS_WITH_REPORTS.DEFAULT;
    const maxReportsPerGroup = settings?.maxStatusReportsPerGroup ?? NEWSLETTER_LIMITS.STATUS_REPORTS_PER_GROUP.DEFAULT;

    // First, get groups that have status reports in the date range (more efficient)
    // We'll get slightly more than needed to account for groups with no reports
    const candidateLimit = Math.min(maxGroups * 2, 100); // Conservative buffer

    const groupsWithReports = await prisma.group.findMany({
      where: {
        status: 'ACTIVE',
        statusReports: {
          some: {
            status: 'ACTIVE',
            createdAt: {
              gte: twoWeeksAgo
            }
          }
        }
      },
      orderBy: {
        name: 'asc' // Sort groups alphabetically for consistency
      },
      take: candidateLimit, // Efficient database-level limiting
      include: {
        statusReports: {
          where: {
            status: 'ACTIVE',
            createdAt: {
              gte: twoWeeksAgo
            }
          },
          orderBy: {
            createdAt: 'desc' // Latest reports first
          },
          take: maxReportsPerGroup // Limit reports per group
        }
      }
    });

    // Apply final group limit (should rarely need to cut here due to efficient querying)
    const statusReportsByGroup = groupsWithReports
      .slice(0, maxGroups)
      .map(groupWithReports => ({
        group: groupWithReports,
        reports: groupWithReports.statusReports
      }));

    logger.debug('Newsletter status reports fetched', {
      module: 'newsletter-preview-service',
      context: {
        groupsCount: statusReportsByGroup.length,
        maxGroups,
        maxReportsPerGroup,
        dateRangeStart: twoWeeksAgo.toISOString()
      }
    });

    return { statusReportsByGroup };
  } catch (error) {
    logger.error(error as Error, {
      module: 'newsletter-preview-service',
      context: { operation: 'fetchNewsletterStatusReports' }
    });
    throw error;
  }
}

/**
 * Generates newsletter HTML based on settings, appointments, and status reports
 *
 * @param introductionText - Introduction text for the newsletter
 * @returns Promise resolving to newsletter HTML
 */
export async function generateNewsletter(introductionText: string): Promise<string> {
  try {
    // Get newsletter settings
    const newsletterSettings = await getNewsletterSettings();

    // Get appointments with limits from settings
    const { featuredAppointments, upcomingAppointments } = await fetchNewsletterAppointments(newsletterSettings);

    // Get status reports with limits from settings
    const { statusReportsByGroup } = await fetchNewsletterStatusReports(newsletterSettings);

    const baseUrl = getBaseUrl();

    logger.info('Generating newsletter', {
      module: 'newsletter-preview-service',
      context: {
        featuredCount: featuredAppointments.length,
        upcomingCount: upcomingAppointments.length,
        groupsCount: statusReportsByGroup.length,
        baseUrl
      }
    });

    // Generate HTML email
    return generateNewsletterHtml({
      newsletterSettings,
      introductionText,
      featuredAppointments,
      upcomingAppointments,
      statusReportsByGroup,
      baseUrl
    });
  } catch (error) {
    logger.error(error as Error, {
      module: 'newsletter-preview-service',
      context: { operation: 'generateNewsletter' }
    });
    throw error;
  }
}

/**
 * Fix URLs in newsletter HTML content to ensure they have proper protocol
 *
 * @param html - Newsletter HTML content
 * @returns Fixed HTML with proper protocol URLs
 */
export function fixUrlsInNewsletterHtml(html: string): string {
  if (!html) return html;

  const baseUrl = getBaseUrl();
  const domain = baseUrl.replace(/^https?:\/\//, '');

  // Fix URLs that are missing protocol
  // This regex finds href attributes with URLs that start with the domain but no protocol
  const urlPattern = new RegExp(`href=["']${domain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^"']*?)["']`, 'g');

  const fixedHtml = html.replace(urlPattern, `href="${baseUrl}$1"`);

  // Log if any URLs were fixed
  const matchCount = (html.match(urlPattern) || []).length;
  if (matchCount > 0) {
    logger.info('Fixed URLs in newsletter HTML', {
      module: 'newsletter-preview-service',
      context: {
        fixedCount: matchCount,
        baseUrl
      }
    });
  }

  return fixedHtml;
}
