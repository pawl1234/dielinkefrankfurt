import { NextRequest, NextResponse } from 'next/server';
import prisma from './prisma';
import { Appointment, Group, StatusReport } from '@prisma/client';
import { 
  NewsletterSettings, 
  generateNewsletterHtml, 
  getDefaultNewsletterSettings 
} from './newsletter-template';
import { sendTestEmail } from './email';
import { serverErrorResponse } from './api-auth';
import { subWeeks } from 'date-fns';

const getBaseUrl = () => {
  // If NEXT_PUBLIC_BASE_URL is provided
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    const url = process.env.NEXT_PUBLIC_BASE_URL.trim();

    return `https://${url}`;
  }
  
  if (typeof window === 'undefined') { // Only log on server side
    console.error('Warning: NEXT_PUBLIC_BASE_URL environment variable is not set. Falling back to localhost:3000');
  }
  
  return 'http://localhost:3000';
};

/**
 * Fetches newsletter settings from the database
 * Creates default settings if none exist
 */
export async function getNewsletterSettings(): Promise<NewsletterSettings> {
  try {
    // Default newsletter settings
    const defaultSettings = getDefaultNewsletterSettings();
    
    // Get settings from database
    const dbSettings = await prisma.newsletter.findFirst();
    
    if (dbSettings) {
      return {
        headerLogo: dbSettings.headerLogo ?? defaultSettings.headerLogo,
        headerBanner: dbSettings.headerBanner ?? defaultSettings.headerBanner,
        footerText: dbSettings.footerText ?? defaultSettings.footerText,
        unsubscribeLink: dbSettings.unsubscribeLink ?? defaultSettings.unsubscribeLink,
        testEmailRecipients: dbSettings.testEmailRecipients ?? defaultSettings.testEmailRecipients,
        id: dbSettings.id,
        createdAt: dbSettings.createdAt,
        updatedAt: dbSettings.updatedAt
      };
    } else {
      // Try to create default settings
      try {
        const newSettings = await prisma.newsletter.create({
          data: defaultSettings
        });
        
        return newSettings as NewsletterSettings;
      } catch (createError) {
        console.warn('Could not create newsletter settings:', createError);
        // Return defaults if creation fails
        return defaultSettings;
      }
    }
  } catch (error) {
    console.error('Error fetching newsletter settings:', error);
    return getDefaultNewsletterSettings();
  }
}

/**
 * Updates newsletter settings in the database
 */
export async function updateNewsletterSettings(data: Partial<NewsletterSettings>): Promise<NewsletterSettings> {
  try {
    // Validate data
    if (!data) {
      throw new Error('Newsletter settings data is required');
    }
    
    // Get existing newsletter settings
    const newsletterSettings = await prisma.newsletter.findFirst();
    
    let updatedSettings;
    
    if (newsletterSettings) {
      // Update existing settings
      updatedSettings = await prisma.newsletter.update({
        where: { id: newsletterSettings.id },
        data: {
          headerLogo: data.headerLogo,
          headerBanner: data.headerBanner,
          footerText: data.footerText,
          unsubscribeLink: data.unsubscribeLink,
          testEmailRecipients: data.testEmailRecipients
        }
      });
    } else {
      // Create new settings with defaults for missing fields
      const defaultSettings = getDefaultNewsletterSettings();
      updatedSettings = await prisma.newsletter.create({
        data: {
          headerLogo: data.headerLogo || defaultSettings.headerLogo,
          headerBanner: data.headerBanner || defaultSettings.headerBanner,
          footerText: data.footerText || defaultSettings.footerText,
          unsubscribeLink: data.unsubscribeLink || defaultSettings.unsubscribeLink,
          testEmailRecipients: data.testEmailRecipients || defaultSettings.testEmailRecipients
        }
      });
    }
    
    return updatedSettings as NewsletterSettings;
  } catch (error) {
    console.error('Error updating newsletter settings:', error);
    throw error;
  }
}

/**
 * Fetches appointments for the newsletter
 * Returns only accepted appointments with future dates
 */
export async function fetchNewsletterAppointments(): Promise<{
  featuredAppointments: Appointment[];
  upcomingAppointments: Appointment[];
}> {
  try {
    // Get featured appointments
    const featuredAppointments = await prisma.appointment.findMany({
      where: {
        featured: true,
        status: 'accepted',
        startDateTime: {
          gte: new Date() // Only future events
        }
      },
      orderBy: {
        startDateTime: 'asc'
      }
    });
    
    // Get upcoming appointments (not featured)
    const upcomingAppointments = await prisma.appointment.findMany({
      where: {
        featured: false,
        status: 'accepted',
        startDateTime: {
          gte: new Date() // Only future events
        }
      },
      orderBy: {
        startDateTime: 'asc'
      }
    });
    
    return { featuredAppointments, upcomingAppointments };
  } catch (error) {
    console.error('Error fetching newsletter appointments:', error);
    throw error;
  }
}

/**
 * Fetches status reports from the last 2 weeks for the newsletter
 * Returns status reports with their associated groups
 */
export async function fetchNewsletterStatusReports(): Promise<{
  statusReportsByGroup: {
    group: Group,
    reports: StatusReport[]
  }[];
}> {
  try {
    // Get the date 2 weeks ago
    const twoWeeksAgo = subWeeks(new Date(), 2);
    
    // Get all active groups
    const groups = await prisma.group.findMany({
      where: {
        status: 'ACTIVE'
      },
      orderBy: {
        name: 'asc' // Sort groups alphabetically
      },
      include: {
        statusReports: {
          where: {
            status: 'ACTIVE',
            createdAt: {
              gte: twoWeeksAgo // Only reports from the last 2 weeks
            }
          },
          orderBy: {
            createdAt: 'desc' // Latest reports first
          }
        }
      }
    });
    
    // Filter out groups with no reports
    const statusReportsByGroup = groups
      .filter(group => group.statusReports.length > 0)
      .map(group => ({
        group: {
          id: group.id,
          name: group.name,
          slug: group.slug,
          description: group.description,
          logoUrl: group.logoUrl,
          metadata: group.metadata,
          status: group.status,
          createdAt: group.createdAt,
          updatedAt: group.updatedAt
        },
        reports: group.statusReports
      }));
    
    return { statusReportsByGroup };
  } catch (error) {
    console.error('Error fetching newsletter status reports:', error);
    throw error;
  }
}

/**
 * Generates newsletter HTML based on settings, appointments, and status reports
 */
export async function generateNewsletter(introductionText: string): Promise<string> {
  try {
    // Get newsletter settings
    const newsletterSettings = await getNewsletterSettings();
    
    // Get appointments
    const { featuredAppointments, upcomingAppointments } = await fetchNewsletterAppointments();
    
    // Get status reports
    const { statusReportsByGroup } = await fetchNewsletterStatusReports();
    
    const baseUrl = getBaseUrl();
    
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
    console.error('Error generating newsletter:', error);
    throw error;
  }
}

/**
 * Sends a test newsletter email
 */
export async function sendNewsletterTestEmail(html: string): Promise<{
  success: boolean;
  messageId?: string;
  error?: any;
  recipientCount: number;
}> {
  try {
    // Get the test email recipients from the database
    const newsletterSettings = await getNewsletterSettings();
    const testRecipients = newsletterSettings?.testEmailRecipients || undefined;
    
    // Send the test email
    return await sendTestEmail({ 
      html, 
      testRecipients 
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    throw error;
  }
}

/**
 * API handler for getting newsletter settings
 */
export async function handleGetNewsletterSettings(request: NextRequest): Promise<NextResponse> {
  try {
    const settings = await getNewsletterSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching newsletter settings:', error);
    return serverErrorResponse('Failed to fetch newsletter settings');
  }
}

/**
 * API handler for updating newsletter settings
 */
export async function handleUpdateNewsletterSettings(request: NextRequest): Promise<NextResponse> {
  try {
    const data = await request.json();
    const updatedSettings = await updateNewsletterSettings(data);
    return NextResponse.json(updatedSettings);
  } catch (error) {
    console.error('Error updating newsletter settings:', error);
    return serverErrorResponse('Failed to update newsletter settings');
  }
}

/**
 * API handler for generating newsletter HTML
 */
export async function handleGenerateNewsletter(request: NextRequest): Promise<NextResponse> {
  try {
    // Get query parameters
    const url = new URL(request.url);
    const introductionText = url.searchParams.get('introductionText') || 
      '<p>Herzlich willkommen zum Newsletter der Linken Frankfurt!</p>';
    
    // Generate the HTML
    const html = await generateNewsletter(introductionText);
    
    // Return the generated HTML
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error('Error generating newsletter:', error);
    return serverErrorResponse('Failed to generate newsletter');
  }
}

/**
 * API handler for sending a test newsletter
 */
export async function handleSendTestNewsletter(request: NextRequest): Promise<NextResponse> {
  try {
    const { html } = await request.json();
    
    if (!html) {
      return NextResponse.json(
        { error: 'Newsletter HTML content is required' },
        { status: 400 }
      );
    }
    
    const result = await sendNewsletterTestEmail(html);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Test emails sent successfully to ${result.recipientCount} recipient${result.recipientCount !== 1 ? 's' : ''}`,
        messageId: result.messageId,
        recipientCount: result.recipientCount
      });
    } else {
      console.error('Failed to send test email:', result.error);
      return NextResponse.json(
        { 
          error: 'Failed to send test email', 
          details: result.error instanceof Error ? result.error.message : 'Unknown error',
          recipientCount: result.recipientCount
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error sending test email:', error);
    return serverErrorResponse('Failed to send test email');
  }
}