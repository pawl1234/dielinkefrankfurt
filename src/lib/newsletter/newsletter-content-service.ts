/**
 * Newsletter Content Service
 *
 * Consolidated service handling all newsletter content generation:
 * - Fetching appointments and status reports with configurable limits
 * - Newsletter HTML generation using React Email
 * - Analytics integration for tracking
 *
 * This replaces: preview-service, template-generator
 */

import { Appointment, Group, StatusReport } from '@prisma/client';
import { subWeeks } from 'date-fns';
import { logger } from '@/lib/logger';
import { NEWSLETTER_LIMITS, NEWSLETTER_DATE_RANGES, STATUS_REPORT_LIMITS } from './constants';
import type { NewsletterSettings } from '@/types/newsletter-types';
import type { NewsletterEmailProps } from '@/types/newsletter-props';
import { getUpcomingAppointments, getActiveGroupsWithStatusReports } from '@/lib/db/newsletter-operations';

// ============================================================================
// PUBLIC API - Content Fetching
// ============================================================================

/**
 * Fetch appointments for the newsletter with configurable limits
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

    // Get featured and upcoming appointments using repository functions
    const featuredAppointments = await getUpcomingAppointments(true, maxFeatured, today);
    const upcomingAppointments = await getUpcomingAppointments(false, maxUpcoming, today);

    logger.debug('Newsletter appointments fetched', {
      module: 'newsletter-content-service',
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
      module: 'newsletter-content-service',
      context: { operation: 'fetchNewsletterAppointments' }
    });
    throw error;
  }
}

/**
 * Fetch status reports from the last 2 weeks for the newsletter with configurable limits
 * Returns status reports with their associated groups
 *
 * @param settings - Optional newsletter settings to override default limits
 * @returns Promise resolving to status reports grouped by group
 */
export async function fetchNewsletterStatusReports(settings?: NewsletterSettings): Promise<{
  statusReportsByGroup: {
    group: Group;
    reports: StatusReport[];
  }[];
}> {
  try {
    // Get the date for status reports range
    const twoWeeksAgo = subWeeks(new Date(), NEWSLETTER_DATE_RANGES.STATUS_REPORTS_WEEKS_BACK);

    // Use default limits if settings not provided
    const maxGroups = settings?.maxGroupsWithReports ?? NEWSLETTER_LIMITS.GROUPS_WITH_REPORTS.DEFAULT;
    const maxReportsPerGroup = settings?.maxStatusReportsPerGroup ?? NEWSLETTER_LIMITS.STATUS_REPORTS_PER_GROUP.DEFAULT;

    // Get groups with status reports using repository function
    const groupsWithReports = await getActiveGroupsWithStatusReports(
      twoWeeksAgo,
      maxGroups,
      maxReportsPerGroup
    );

    // Apply final group limit (should rarely need to cut here due to efficient querying)
    const statusReportsByGroup = groupsWithReports
      .slice(0, maxGroups)
      .map(groupWithReports => ({
        group: groupWithReports,
        reports: groupWithReports.statusReports
      }));

    logger.debug('Newsletter status reports fetched', {
      module: 'newsletter-content-service',
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
      module: 'newsletter-content-service',
      context: { operation: 'fetchNewsletterStatusReports' }
    });
    throw error;
  }
}

// ============================================================================
// PUBLIC API - Newsletter Generation
// ============================================================================

/**
 * Generate complete newsletter HTML using React Email
 * Returns clean HTML without analytics tracking
 * (Tracking is added at send time, not generation time)
 *
 * @param props - Newsletter email template props
 * @returns Promise resolving to newsletter HTML
 */
export async function generateNewsletterHtml(
  props: NewsletterEmailProps
): Promise<string> {
  try {
    const { render } = await import('@react-email/render');
    const Newsletter = (await import('@/emails/newsletter')).default;

    return await render(Newsletter(props));
  } catch (error) {
    throw new Error(`Newsletter generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============================================================================
// DEFAULT SETTINGS
// ============================================================================

/**
 * Get default newsletter settings
 * Provides fallback values for all newsletter configuration options
 *
 * @returns Default newsletter settings object
 */
export function getDefaultNewsletterSettings(): NewsletterSettings {
  return {
    headerLogo: '/images/logo.png',
    headerBanner: '/images/header-bg.jpg',
    footerText: 'Die Linke Frankfurt am Main',
    unsubscribeLink: '#',
    testEmailRecipients: 'buero@linke-frankfurt.de',

    // Default email sending configuration
    batchSize: 100,
    batchDelay: 1000,
    fromEmail: 'newsletter@linke-frankfurt.de',
    fromName: 'Die Linke Frankfurt',
    replyToEmail: 'buero@linke-frankfurt.de',
    subjectTemplate: 'Die Linke Frankfurt - Newsletter {date}',

    // Newsletter sending performance settings (BCC-only mode)
    chunkSize: 50,           // Number of BCC recipients per email
    chunkDelay: 200,         // Milliseconds between chunks (reduced for faster processing)
    emailTimeout: 30000,     // Email sending timeout in milliseconds (reduced for faster failures)

    // SMTP connection settings (optimized for single-connection usage)
    connectionTimeout: 20000, // SMTP connection timeout in milliseconds (faster connection)
    greetingTimeout: 20000,   // SMTP greeting timeout in milliseconds (faster greeting)
    socketTimeout: 30000,     // SMTP socket timeout in milliseconds (faster socket timeout)
    maxConnections: 1,        // Single connection per transporter (no pooling)
    maxMessages: 1,          // Single message per connection (clean lifecycle)

    // Retry logic settings (current optimized values)
    maxRetries: 3,            // Maximum verification retries
    maxBackoffDelay: 10000,   // Maximum backoff delay in milliseconds
    retryChunkSizes: '10,5,1', // Comma-separated retry chunk sizes

    // Newsletter content limits
    maxFeaturedAppointments: NEWSLETTER_LIMITS.FEATURED_APPOINTMENTS.DEFAULT,
    maxUpcomingAppointments: NEWSLETTER_LIMITS.UPCOMING_APPOINTMENTS.DEFAULT,
    maxStatusReportsPerGroup: NEWSLETTER_LIMITS.STATUS_REPORTS_PER_GROUP.DEFAULT,
    maxGroupsWithReports: NEWSLETTER_LIMITS.GROUPS_WITH_REPORTS.DEFAULT,

    // Status report limits
    statusReportTitleLimit: STATUS_REPORT_LIMITS.TITLE.DEFAULT,
    statusReportContentLimit: STATUS_REPORT_LIMITS.CONTENT.DEFAULT
  };
}
