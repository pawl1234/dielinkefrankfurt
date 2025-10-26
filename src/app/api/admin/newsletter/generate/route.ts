import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse, handleDatabaseError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { generateNewsletterHtml } from '@/lib/newsletter';
import { getNewsletterSettings, fetchNewsletterAppointments, fetchNewsletterStatusReports } from '@/lib/newsletter';
import { getBaseUrl } from '@/lib/base-url';
import { generateNewsletterSchema, zodToValidationResult } from '@/lib/validation';
import { createNewsletterItem } from '@/lib/db/newsletter-operations';

/**
 * POST /api/admin/newsletter/generate
 *
 * Admin endpoint for generating a new newsletter draft with appointments and status reports.
 * Creates a draft newsletter record in the database with generated HTML content.
 * Returns the created newsletter object including its ID.
 * Authentication handled by middleware.
 *
 * Request body:
 * - subject: string (required) - Newsletter subject line
 * - introductionText: string (optional) - Introduction HTML content
 *
 * Response:
 * - id: string - Newsletter ID
 * - subject: string - Newsletter subject
 * - introductionText: string - Introduction text
 * - status: string - Newsletter status (draft)
 * - createdAt: Date - Creation timestamp
 * - updatedAt: Date - Last update timestamp
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate with Zod schema
    const validation = await zodToValidationResult(generateNewsletterSchema, body);
    if (!validation.isValid) {
      logger.warn('Validation failed for newsletter generation', {
        module: 'api',
        context: {
          endpoint: '/api/admin/newsletter/generate',
          method: 'POST',
          errors: validation.errors
        }
      });

      return NextResponse.json(
        { error: 'Validierungsfehler', errors: validation.errors },
        { status: 400 }
      );
    }

    const { subject, introductionText } = validation.data!;

    logger.debug('Generating new newsletter', {
      module: 'api',
      context: {
        endpoint: '/api/admin/newsletter/generate',
        method: 'POST',
        hasSubject: !!subject,
        hasIntroduction: !!introductionText
      }
    });

    // Get newsletter settings first
    const newsletterSettings = await getNewsletterSettings();

    logger.info('Fetching data for newsletter generation', {
      module: 'api',
      context: {
        endpoint: '/api/admin/newsletter/generate',
        method: 'POST',
        maxFeaturedAppointments: newsletterSettings.maxFeaturedAppointments,
        maxUpcomingAppointments: newsletterSettings.maxUpcomingAppointments,
        maxStatusReportsPerGroup: newsletterSettings.maxStatusReportsPerGroup,
        maxGroupsWithReports: newsletterSettings.maxGroupsWithReports
      }
    });

    // Use the service layer functions with the configured limits
    const [
      { featuredAppointments, upcomingAppointments },
      { statusReportsByGroup: groupsWithReports }
    ] = await Promise.all([
      fetchNewsletterAppointments(newsletterSettings),
      fetchNewsletterStatusReports(newsletterSettings)
    ]);

    logger.debug('Data fetched for newsletter generation', {
      module: 'api',
      context: {
        endpoint: '/api/admin/newsletter/generate',
        method: 'POST',
        featuredAppointments: featuredAppointments.length,
        upcomingAppointments: upcomingAppointments.length,
        groupsWithReports: groupsWithReports.length,
        hasSettings: !!newsletterSettings
      }
    });

    logger.info('Generating newsletter HTML', {
      module: 'api',
      context: {
        endpoint: '/api/admin/newsletter/generate',
        method: 'POST',
        featuredAppointments: featuredAppointments.length,
        upcomingAppointments: upcomingAppointments.length,
        groupsWithReports: groupsWithReports.length
      }
    });

    // Generate newsletter HTML
    const newsletterHtml = await generateNewsletterHtml({
      newsletterSettings,
      introductionText,
      featuredAppointments,
      upcomingAppointments,
      statusReportsByGroup: groupsWithReports,
      baseUrl: getBaseUrl()
    });

    // Create newsletter with generated content using data access layer
    const newsletter = await createNewsletterItem({
      subject: subject.trim(),
      introductionText,
      content: newsletterHtml,
      status: 'draft',
    });

    logger.info('Newsletter generated successfully', {
      module: 'api',
      context: {
        endpoint: '/api/admin/newsletter/generate',
        method: 'POST',
        newsletterId: newsletter.id,
        subject: newsletter.subject,
        contentLength: newsletterHtml.length
      }
    });

    return NextResponse.json({
      id: newsletter.id,
      subject: newsletter.subject,
      introductionText: newsletter.introductionText,
      status: newsletter.status,
      createdAt: newsletter.createdAt,
      updatedAt: newsletter.updatedAt
    });
  } catch (error) {
    logger.error(error as Error, {
      module: 'api',
      context: {
        endpoint: '/api/admin/newsletter/generate',
        method: 'POST',
        operation: 'generateNewsletter'
      }
    });

    // Handle specific database errors
    if (error && typeof error === 'object' && 'code' in error) {
      return apiErrorResponse(
        handleDatabaseError(error, 'generateNewsletter'),
        'Failed to generate newsletter'
      );
    }

    return apiErrorResponse(error, 'Failed to generate newsletter');
  }
}