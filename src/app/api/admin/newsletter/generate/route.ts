import { NextRequest, NextResponse } from 'next/server';
import { ApiHandler, SimpleRouteContext } from '@/types/api-types';
import { withAdminAuth } from '@/lib/auth';
import { apiErrorResponse, handleDatabaseError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import prisma from '@/lib/db/prisma';
import { generateNewsletterHtml } from '@/lib/newsletter';
import { getNewsletterSettings, generateNewsletter, fetchNewsletterAppointments, fetchNewsletterStatusReports } from '@/lib/newsletter';
import { getBaseUrl } from '@/lib/base-url';

/**
 * GET /api/admin/newsletter/generate
 * 
 * Admin endpoint for generating newsletter HTML preview.
 * Returns generated HTML without creating a newsletter record.
 * Authentication required.
 * 
 * Query parameters:
 * - introductionText: string (optional) - Introduction HTML content
 */
export const GET: ApiHandler<SimpleRouteContext> = withAdminAuth(async (request: NextRequest) => {
  try {
    // Get query parameters
    const url = new URL(request.url);
    const introductionText = url.searchParams.get('introductionText') || 
      '<p>Herzlich willkommen zum Newsletter der Linken Frankfurt!</p>';
    
    logger.debug('Generating newsletter preview', {
      module: 'api',
      context: {
        endpoint: '/api/admin/newsletter/generate',
        method: 'GET',
        hasIntroduction: !!introductionText
      }
    });

    // Generate the HTML
    const html = await generateNewsletter(introductionText);
    
    logger.info('Newsletter preview generated successfully', {
      module: 'api',
      context: {
        endpoint: '/api/admin/newsletter/generate',
        method: 'GET',
        htmlLength: html.length
      }
    });

    // Return the generated HTML
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    logger.error(error as Error, {
      module: 'api',
      context: {
        endpoint: '/api/admin/newsletter/generate',
        method: 'GET',
        operation: 'generateNewsletterPreview'
      }
    });

    return apiErrorResponse(error, 'Failed to generate newsletter preview');
  }
});

/**
 * POST /api/admin/newsletter/generate
 * 
 * Admin endpoint for generating a new newsletter with appointments and status reports.
 * Creates a draft newsletter with generated HTML content.
 * Returns the created newsletter object including its ID.
 * Authentication required.
 * 
 * Request body:
 * - subject: string (required) - Newsletter subject line
 * - introductionText: string (optional) - Introduction HTML content
 */
export const POST: ApiHandler<SimpleRouteContext> = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { subject, introductionText = '' } = body;

    logger.debug('Generating new newsletter', {
      module: 'api',
      context: {
        endpoint: '/api/admin/newsletter/generate',
        method: 'POST',
        hasSubject: !!subject,
        hasIntroduction: !!introductionText
      }
    });

    // Validate required fields
    if (!subject || subject.trim().length === 0) {
      logger.warn('Newsletter generation failed - missing subject', {
        module: 'api',
        context: {
          endpoint: '/api/admin/newsletter/generate',
          method: 'POST'
        }
      });

      return NextResponse.json(
        { error: 'Subject is required' },
        { status: 400 }
      );
    }

    // Validate subject length
    if (subject.length > 200) {
      logger.warn('Newsletter generation failed - subject too long', {
        module: 'api',
        context: {
          endpoint: '/api/admin/newsletter/generate',
          method: 'POST',
          subjectLength: subject.length
        }
      });

      return NextResponse.json(
        { error: 'Subject must be 200 characters or less' },
        { status: 400 }
      );
    }

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

    // Create newsletter with generated content
    const newsletter = await prisma.newsletterItem.create({
      data: {
        subject: subject.trim(),
        introductionText,
        content: newsletterHtml,
        status: 'draft',
      },
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
});