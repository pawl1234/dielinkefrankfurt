import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/prisma';
import { generateNewsletterHtml, getDefaultNewsletterSettings, GroupWithReports } from '@/lib/newsletter-template';
import { getBaseUrl } from '@/lib/base-url';

// Helper function to get newsletter settings from database
async function getNewsletterSettingsFromDB() {
  try {
    const settings = await prisma.newsletter.findFirst();
    if (settings) {
      return {
        headerLogo: settings.headerLogo || '',
        headerBanner: settings.headerBanner || '',
        footerText: settings.footerText || '',
        unsubscribeLink: settings.unsubscribeLink || '',
        batchSize: settings.batchSize || 100,
        batchDelay: settings.batchDelay || 1000,
        fromEmail: settings.fromEmail || '',
        fromName: settings.fromName || '',
        replyToEmail: settings.replyToEmail || '',
        subjectTemplate: settings.subjectTemplate || '',
        emailSalt: settings.emailSalt || '',
        testEmailRecipients: settings.testEmailRecipients || ''
      };
    }
  } catch (error) {
    console.error('Error fetching newsletter settings:', error);
  }
  
  // Return default settings if none found
  return getDefaultNewsletterSettings();
}


// POST create new newsletter with generated content
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { subject, introductionText } = body;

    if (!subject || !introductionText) {
      return NextResponse.json(
        { error: 'Subject and introduction text are required' },
        { status: 400 }
      );
    }

    // Fetch appointments and status reports for newsletter generation
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    
    const [appointments, statusReports] = await Promise.all([
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
            gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) // Last 2 weeks
          }
        },
        include: {
          group: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
    ]);

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

    // Get newsletter settings from database
    const newsletterSettings = await getNewsletterSettingsFromDB();
    
    // For new newsletters created via the UI (which already uses the template), 
    // we use the subject as provided. The template is applied in the frontend.
    const finalSubject = subject;
    
    // Separate featured and regular appointments
    const featuredAppointments = appointments.filter(apt => apt.featured);
    const upcomingAppointments = appointments.filter(apt => !apt.featured);

    // Generate newsletter HTML
    const newsletterHtml = generateNewsletterHtml({
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
        subject: finalSubject,
        introductionText,
        content: newsletterHtml,
        status: 'draft',
      },
    });

    return NextResponse.json(newsletter);
  } catch (error) {
    console.error('Error creating newsletter:', error);
    return NextResponse.json(
      { error: 'Failed to create newsletter' },
      { status: 500 }
    );
  }
}