import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/prisma';
import { generateNewsletterHtml } from '@/lib/newsletter-template';
import { getNewsletterSettings, fetchNewsletterAppointments, fetchNewsletterStatusReports } from '@/lib/newsletter-service';
import { getBaseUrl } from '@/lib/base-url';

interface Props {
  params: Promise<{
    id: string;
  }>;
}


// PUT regenerate newsletter content with new introduction text
export async function PUT(request: NextRequest, { params }: Props) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { subject, introductionText } = body;

    if (!introductionText) {
      return NextResponse.json(
        { error: 'Introduction text is required' },
        { status: 400 }
      );
    }

    if (!subject) {
      return NextResponse.json(
        { error: 'Subject is required' },
        { status: 400 }
      );
    }

    // Check if newsletter exists and is in draft status
    const existingNewsletter = await prisma.newsletterItem.findUnique({
      where: { id }
    });

    if (!existingNewsletter) {
      return NextResponse.json({ error: 'Newsletter not found' }, { status: 404 });
    }

    if (existingNewsletter.status !== 'draft') {
      return NextResponse.json({ error: 'Only draft newsletters can be edited' }, { status: 400 });
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
    const newsletter = await prisma.newsletterItem.update({
      where: { id },
      data: {
        subject,
        introductionText,
        content: newsletterHtml,
      },
    });

    return NextResponse.json(newsletter);
  } catch (error) {
    console.error('Error regenerating newsletter:', error);
    return NextResponse.json(
      { error: 'Failed to regenerate newsletter' },
      { status: 500 }
    );
  }
}