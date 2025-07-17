import { NextRequest, NextResponse } from 'next/server';
import { ApiHandler, SimpleRouteContext } from '@/types/api-types';
import { withAdminAuth } from '@/lib/api-auth';
import { apiErrorResponse, handleDatabaseError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { generateNewsletterHtml } from '@/lib/newsletter-template';
import { GroupWithReports } from '@/types/newsletter-types';
import { getNewsletterSettings, generateNewsletter } from '@/lib/newsletter-service';
import { getBaseUrl } from '@/lib/base-url';
import { subWeeks } from 'date-fns';

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

    // Fetch appointments and status reports for newsletter generation
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    const twoWeeksAgo = subWeeks(today, 2);

    logger.info('Fetching data for newsletter generation', {
      module: 'api',
      context: {
        endpoint: '/api/admin/newsletter/generate',
        method: 'POST',
        dateRange: {
          appointments: 'today onwards',
          statusReports: 'last 2 weeks'
        }
      }
    });

    const [appointments, statusReports, newsletterSettings] = await Promise.all([
      // Get featured appointments first, then other accepted appointments (only today or future)
      prisma.appointment.findMany({
        where: {
          status: 'accepted',
          startDateTime: {
            gte: today // Only appointments from today onwards
          }
        },
        orderBy: [
          { featured: 'desc' }, // Featured first
          { startDateTime: 'asc' } // Then by date
        ]
      }),
      
      // Get recent status reports (last 2 weeks) with group info
      prisma.statusReport.findMany({
        where: {
          status: 'ACTIVE',
          createdAt: {
            gte: twoWeeksAgo
          }
        },
        include: {
          group: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),

      // Get newsletter settings using the service method with caching
      getNewsletterSettings()
    ]);

    logger.debug('Data fetched for newsletter generation', {
      module: 'api',
      context: {
        endpoint: '/api/admin/newsletter/generate',
        method: 'POST',
        appointmentCount: appointments.length,
        statusReportCount: statusReports.length,
        hasSettings: !!newsletterSettings
      }
    });

    // Group status reports by group
    const groupedReports = statusReports.reduce((acc, report) => {
      const groupId = report.groupId;
      if (!acc[groupId]) {
        acc[groupId] = {
          group: report.group,
          reports: []
        };
      }
      acc[groupId].reports.push(report);
      return acc;
    }, {} as Record<string, GroupWithReports>);

    const groupsWithReports = Object.values(groupedReports);

    // Separate featured and regular appointments
    const featuredAppointments = appointments.filter(apt => apt.featured);
    const upcomingAppointments = appointments.filter(apt => !apt.featured);

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