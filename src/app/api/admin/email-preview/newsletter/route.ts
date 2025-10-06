import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth';
import { generateNewsletterHtml } from '@/lib/newsletter';
import { getNewsletterSettings } from '@/lib/newsletter';
import { getBaseUrl } from '@/lib/base-url';
import prisma from '@/lib/db/prisma';

/**
 * GET /api/admin/email-preview/newsletter
 * 
 * Generates a preview of the newsletter email using sample data.
 * Requires admin authentication.
 */
export const GET = withAdminAuth(async () => {
  try {

    // For preview, we'll use sample data or recent data from the database
    const baseUrl = getBaseUrl();
    const newsletterSettings = await getNewsletterSettings();

    // Get some sample appointments (featured and upcoming)
    const featuredAppointments = await prisma.appointment.findMany({
      where: { 
        featured: true,
        startDateTime: { gte: new Date() }
      },
      take: 2,
      orderBy: { startDateTime: 'asc' }
    });

    const upcomingAppointments = await prisma.appointment.findMany({
      where: { 
        featured: false,
        startDateTime: { gte: new Date() }
      },
      take: 3,
      orderBy: { startDateTime: 'asc' }
    });

    // Get some sample status reports
    const groupsWithReports = await prisma.group.findMany({
      where: { 
        status: 'ACTIVE',
        statusReports: { some: { status: 'ACTIVE' } }
      },
      include: {
        statusReports: {
          where: { status: 'ACTIVE' },
          take: 2,
          orderBy: { createdAt: 'desc' }
        }
      },
      take: 2
    });

    // Format groups with reports
    const statusReportsByGroup = groupsWithReports
      .filter(group => group.statusReports.length > 0)
      .map(group => ({
        group,
        reports: group.statusReports
      }));

    // Sample introduction text
    const introductionText = `
      <p>Liebe Genossinnen und Genossen,</p>
      <p>willkommen zur aktuellen Ausgabe unseres Newsletters! Hier findet ihr die wichtigsten Termine und Neuigkeiten aus unserer politischen Arbeit.</p>
      <p>Wir freuen uns auf euer Engagement und eure Teilnahme an unseren Veranstaltungen.</p>
    `;

    // Generate newsletter HTML
    const html = await generateNewsletterHtml({
      newsletterSettings,
      introductionText,
      featuredAppointments,
      upcomingAppointments,
      statusReportsByGroup,
      baseUrl
    });

    return NextResponse.json({
      success: true,
      html,
      message: 'Newsletter preview generated successfully'
    });

  } catch (error) {
    console.error('Newsletter preview generation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate newsletter preview',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});