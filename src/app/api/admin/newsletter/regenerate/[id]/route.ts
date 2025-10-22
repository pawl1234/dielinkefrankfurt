import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AppError, apiErrorResponse } from '@/lib/errors';
import { generateNewsletterHtml } from '@/lib/newsletter';
import { getNewsletterSettings, fetchNewsletterAppointments, fetchNewsletterStatusReports } from '@/lib/newsletter';
import { getBaseUrl } from '@/lib/base-url';
import {
  getNewsletterById,
  updateNewsletterItem
} from '@/lib/db/newsletter-operations';
import type { IdRouteContext } from '@/types/api-types';

/**
 * PUT handler for regenerating newsletter content with new introduction text
 * Requires admin authentication
 */
export async function PUT(request: NextRequest, { params }: IdRouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return AppError.authentication('Nicht autorisiert').toResponse();
    }

    const { id } = await params;
    const body = await request.json();
    const { subject, introductionText } = body;

    if (!introductionText) {
      return AppError.validation('Einleitungstext ist erforderlich').toResponse();
    }

    if (!subject) {
      return AppError.validation('Betreff ist erforderlich').toResponse();
    }

    // Check if newsletter exists and is in draft status
    const existingNewsletter = await getNewsletterById(id);

    if (!existingNewsletter) {
      return AppError.notFound('Newsletter nicht gefunden').toResponse();
    }

    if (existingNewsletter.status !== 'draft') {
      return AppError.validation('Nur Entwürfe können bearbeitet werden').toResponse();
    }

    // Get newsletter settings first
    const newsletterSettings = await getNewsletterSettings();
    
    // Use the service layer functions with the configured limits
    const [
      { featuredAppointments, upcomingAppointments },
      { statusReportsByGroup: groupsWithReports }
    ] = await Promise.all([
      fetchNewsletterAppointments(newsletterSettings),
      fetchNewsletterStatusReports(newsletterSettings)
    ]);

    // Generate newsletter HTML
    const newsletterHtml = await generateNewsletterHtml({
      newsletterSettings,
      subject,
      introductionText,
      featuredAppointments,
      upcomingAppointments,
      statusReportsByGroup: groupsWithReports,
      baseUrl: getBaseUrl()
    });

    // Update newsletter with new content
    const newsletter = await updateNewsletterItem(id, {
      subject,
      introductionText,
      content: newsletterHtml,
    });

    return NextResponse.json(newsletter);
  } catch (error) {
    return apiErrorResponse(error, 'Fehler beim Regenerieren des Newsletters');
  }
}