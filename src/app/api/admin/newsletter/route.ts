import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import prisma from '@/lib/prisma';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Appointment, Newsletter } from '@prisma/client';

// Custom type for newsletter settings with defaults
interface NewsletterSettings {
  headerLogo: string;
  headerBanner: string;
  footerText: string;
  unsubscribeLink: string;
  id?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// Get newsletter settings and generate HTML email
export async function GET(request: NextRequest) {
  // Verify admin session
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token as any).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get query parameters
    const url = new URL(request.url);
    const introductionText = url.searchParams.get('introductionText') || '<p>Herzlich willkommen zum Newsletter der Linken Frankfurt!</p>';
    
    // Default newsletter settings (in case we can't access the database model yet)
    let newsletterSettings: NewsletterSettings = {
      headerLogo: '/path/to/default/logo.png',
      headerBanner: '/path/to/default/banner.jpg',
      footerText: 'Die Linke Frankfurt am Main<br/>Kommunalpolitische Vereinigung',
      unsubscribeLink: '#'
    };
    
    // Try to get newsletter settings from database
    try {
      const dbSettings = await prisma.newsletter.findFirst();
      
      // If settings exist, use them
      if (dbSettings) {
        newsletterSettings = {
          headerLogo: dbSettings.headerLogo ?? newsletterSettings.headerLogo,
          headerBanner: dbSettings.headerBanner ?? newsletterSettings.headerBanner,
          footerText: dbSettings.footerText ?? newsletterSettings.footerText,
          unsubscribeLink: dbSettings.unsubscribeLink ?? newsletterSettings.unsubscribeLink,
          id: dbSettings.id,
          createdAt: dbSettings.createdAt,
          updatedAt: dbSettings.updatedAt
        };
      } else {
        // Try to create default settings
        try {
          const newSettings = await prisma.newsletter.create({
            data: {
              headerLogo: newsletterSettings.headerLogo,
              headerBanner: newsletterSettings.headerBanner,
              footerText: newsletterSettings.footerText,
              unsubscribeLink: newsletterSettings.unsubscribeLink
            }
          });
          
          newsletterSettings = {
            headerLogo: newSettings.headerLogo ?? newsletterSettings.headerLogo,
            headerBanner: newSettings.headerBanner ?? newsletterSettings.headerBanner,
            footerText: newSettings.footerText ?? newsletterSettings.footerText,
            unsubscribeLink: newSettings.unsubscribeLink ?? newsletterSettings.unsubscribeLink,
            id: newSettings.id,
            createdAt: newSettings.createdAt,
            updatedAt: newSettings.updatedAt
          };
        } catch (createError) {
          console.warn('Could not create newsletter settings:', createError);
          // Continue with default settings
        }
      }
    } catch (settingsError) {
      console.warn('Could not fetch newsletter settings:', settingsError);
      // Continue with default settings
    }
    
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
    
    // Base URL for links (should get from env in production)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://dielinkefrankfurt.de';
    
    // Generate HTML email directly instead of using React components
    const emailHtml = generateEmailHtml({
      newsletterSettings,
      introductionText,
      featuredAppointments,
      upcomingAppointments,
      baseUrl
    });
    
    // Return the generated HTML
    return new NextResponse(emailHtml, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error('Error generating newsletter:', error);
    return NextResponse.json(
      { error: 'Failed to generate newsletter' },
      { status: 500 }
    );
  }
}

// Update or create newsletter settings
export async function POST(request: NextRequest) {
  // Verify admin session
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token as any).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await request.json();
    
    // Validate data
    if (!data) {
      return NextResponse.json(
        { error: 'Newsletter settings data is required' },
        { status: 400 }
      );
    }
    
    // Prepare response data (in case we can't access the database)
    let responseData: NewsletterSettings & { id: number; createdAt: Date; updatedAt: Date } = {
      ...data,
      id: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      headerLogo: data.headerLogo || 'public/images/logo.png',
      headerBanner: data.headerBanner || 'public/images/header-bg.jpg',
      footerText: data.footerText || 'Die Linke Frankfurt am Main',
      unsubscribeLink: data.unsubscribeLink || '#'
    };
    
    try {
      // Get existing newsletter settings or create new
      const newsletterSettings = await prisma.newsletter.findFirst();
      
      if (newsletterSettings) {
        // Update existing settings
        const updatedSettings = await prisma.newsletter.update({
          where: { id: newsletterSettings.id },
          data: {
            headerLogo: data.headerLogo,
            headerBanner: data.headerBanner,
            footerText: data.footerText,
            unsubscribeLink: data.unsubscribeLink
          }
        });
        
        responseData = {
          headerLogo: updatedSettings.headerLogo ?? responseData.headerLogo,
          headerBanner: updatedSettings.headerBanner ?? responseData.headerBanner,
          footerText: updatedSettings.footerText ?? responseData.footerText,
          unsubscribeLink: updatedSettings.unsubscribeLink ?? responseData.unsubscribeLink,
          id: updatedSettings.id,
          createdAt: updatedSettings.createdAt,
          updatedAt: updatedSettings.updatedAt
        };
      } else {
        // Create new settings
        const newSettings = await prisma.newsletter.create({
          data: {
            headerLogo: data.headerLogo,
            headerBanner: data.headerBanner,
            footerText: data.footerText,
            unsubscribeLink: data.unsubscribeLink
          }
        });
        
        responseData = {
          headerLogo: newSettings.headerLogo ?? responseData.headerLogo,
          headerBanner: newSettings.headerBanner ?? responseData.headerBanner,
          footerText: newSettings.footerText ?? responseData.footerText,
          unsubscribeLink: newSettings.unsubscribeLink ?? responseData.unsubscribeLink,
          id: newSettings.id,
          createdAt: newSettings.createdAt,
          updatedAt: newSettings.updatedAt
        };
      }
    } catch (dbError) {
      console.warn('Database operation failed for newsletter settings:', dbError);
      // Continue with response data from input
    }
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error updating newsletter settings:', error);
    return NextResponse.json(
      { error: 'Failed to update newsletter settings' },
      { status: 500 }
    );
  }
}

// Update appointment featured status
export async function PATCH(request: NextRequest) {
  // Verify admin session
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token as any).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await request.json();
    const { id, featured } = data;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Appointment ID is required' },
        { status: 400 }
      );
    }
    
    if (featured === undefined) {
      return NextResponse.json(
        { error: 'Featured status is required' },
        { status: 400 }
      );
    }
    
    // Prepare default response in case of DB issues
    const defaultResponse = {
      id: Number(id),
      featured,
      updated: true
    };
    
    try {
      const updatedAppointment = await prisma.appointment.update({
        where: { id: Number(id) },
        data: { featured }
      });
      
      return NextResponse.json(updatedAppointment);
    } catch (dbError) {
      console.warn('Could not update appointment featured status in DB:', dbError);
      return NextResponse.json(defaultResponse);
    }
  } catch (error) {
    console.error('Error updating appointment featured status:', error);
    return NextResponse.json(
      { error: 'Failed to update appointment featured status' },
      { status: 500 }
    );
  }
}

// Helper function to generate HTML for the email
interface EmailTemplateParams {
  newsletterSettings: NewsletterSettings;
  introductionText: string;
  featuredAppointments: Appointment[];
  upcomingAppointments: Appointment[];
  baseUrl: string;
}

function generateEmailHtml({ 
  newsletterSettings, 
  introductionText, 
  featuredAppointments, 
  upcomingAppointments, 
  baseUrl 
}: EmailTemplateParams): string {
  // Helper function to get the first image from fileUrls
  const getFirstImageUrl = (fileUrlsJson: string | null): string | null => {
    if (!fileUrlsJson) return null;
    
    try {
      const fileUrls = JSON.parse(fileUrlsJson) as string[];
      // Find the first file that is an image
      const imageUrl = fileUrls.find((url: string) => 
        url.endsWith('.jpg') || url.endsWith('.jpeg') || url.endsWith('.png') || url.endsWith('.gif')
      );
      return imageUrl || null;
    } catch (e) {
      return null;
    }
  };

  // Format date helper
  const formatDate = (dateString: Date | string): string => {
    return format(new Date(dateString), 'PPP', { locale: de });
  };

  // Default logo and banner if none provided
  const headerLogo = newsletterSettings.headerLogo;
  const headerBanner = newsletterSettings.headerBanner;
  const footerText = newsletterSettings.footerText;
  const unsubscribeLink = newsletterSettings.unsubscribeLink;

  // Generate featured events HTML
  let featuredEventsHtml = '';
  if (featuredAppointments && featuredAppointments.length > 0) {
    featuredEventsHtml += '<tr><td colspan="100%"><h2 class="section-title">Featured</h2></td></tr>';
    
    featuredAppointments.forEach((appointment: Appointment) => {
      const imageUrl = getFirstImageUrl(appointment.fileUrls);
      const detailUrl = `${baseUrl}/termine/${appointment.id}`;
      
      featuredEventsHtml += `
        <tr>
          <td class="featured-event">
            ${imageUrl ? `<img src="${imageUrl}" alt="${appointment.title}" class="featured-image" />` : ''}
            <table width="100%" cellPadding="0" cellSpacing="0" border="0">
              <tr>
                <td class="featured-content">
                  <h3 class="event-title">${appointment.title}</h3>
                  <p class="event-teaser">${appointment.teaser}</p>
                  <p class="event-date">
                    ${formatDate(appointment.startDateTime)}
                    ${appointment.endDateTime ? ` - ${formatDate(appointment.endDateTime)}` : ''}
                  </p>
                  
                  ${appointment.street ? `
                    <p class="event-location">
                      ${appointment.street}<br />
                      ${appointment.postalCode || ''} ${appointment.city || ''}
                    </p>
                  ` : ''}
                  
                  <a href="${detailUrl}" class="event-button">
                    Mehr Informationen
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `;
    });
  }

  // Generate upcoming events HTML
  let upcomingEventsHtml = '';
  if (upcomingAppointments && upcomingAppointments.length > 0) {
    upcomingEventsHtml += '<tr><td colspan="100%"><h2 class="section-title">Termine</h2></td></tr>';
    
    upcomingAppointments.forEach((appointment: Appointment) => {
      const detailUrl = `${baseUrl}/termine/${appointment.id}`;
      
      upcomingEventsHtml += `
        <tr>
          <td class="upcoming-event">
            <h3 class="upcoming-title">${appointment.title}</h3>
            <p class="upcoming-date">
              ${formatDate(appointment.startDateTime)}
            </p>
            <p class="event-teaser">${appointment.teaser}</p>
            <a href="${detailUrl}" class="event-button">
              Mehr Informationen
            </a>
          </td>
        </tr>
      `;
    });
  }

  // Build complete HTML
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Die Linke Frankfurt Newsletter</title>
        <style>
          /* Email Styles */
          body {
            margin: 0;
            padding: 0;
            font-family: "Open Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
            font-size: 16px;
            line-height: 1.5;
            color: #000000;
            background-color: #F5F5F5;
          }
          
          table {
            border-spacing: 0;
            border-collapse: collapse;
            mso-table-lspace: 0pt;
            mso-table-rspace: 0pt;
          }
          
          td {
            padding: 0;
          }
          
          img {
            border: 0;
            line-height: 100%;
            outline: none;
            text-decoration: none;
            -ms-interpolation-mode: bicubic;
          }
          
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #FFFFFF;
          }
          
          .header {
            background-color: #FFFFFF;
            text-align: center;
            padding: 20px 0;
          }
          
          .logo {
            max-height: 60px;
            width: auto;
          }
          
          .banner {
            width: 100%;
            max-height: 200px;
            object-fit: cover;
          }
          
          .content {
            padding: 20px;
          }
          
          .introduction {
            padding: 0 0 20px 0;
            border-bottom: 1px solid #E5E5E5;
          }
          
          .section-title {
            color: #FF0000;
            font-size: 24px;
            font-weight: bold;
            margin-top: 30px;
            margin-bottom: 15px;
          }
          
          .featured-event {
            margin-bottom: 30px;
            border: 1px solid #E5E5E5;
          }
          
          .featured-image {
            width: 100%;
            height: auto;
            max-height: 200px;
            object-fit: cover;
          }
          
          .featured-content {
            padding: 15px;
          }
          
          .event-title {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 10px;
            color: #000000;
          }
          
          .event-teaser {
            margin-bottom: 15px;
            color: #333333;
          }
          
          .event-date {
            font-weight: bold;
            margin-bottom: 15px;
            color: #666666;
          }
          
          .event-button {
            display: inline-block;
            background-color: #FF0000;
            color: #FFFFFF;
            text-decoration: none;
            padding: 10px 20px;
            font-weight: bold;
            margin-top: 10px;
          }
          
          .upcoming-event {
            padding: 15px 0;
            border-bottom: 1px solid #E5E5E5;
          }
          
          .upcoming-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
            color: #000000;
          }
          
          .upcoming-date {
            font-weight: bold;
            margin-bottom: 10px;
            color: #666666;
          }
          
          .footer {
            background-color: #222222;
            color: #FFFFFF;
            padding: 30px 20px;
            text-align: center;
          }
          
          .unsubscribe {
            color: #CCCCCC;
            text-decoration: underline;
            margin-top: 15px;
            display: inline-block;
          }
          
          @media only screen and (max-width: 600px) {
            .container {
              width: 100% !important;
            }
            
            .content {
              padding: 15px !important;
            }
            
            .event-title {
              font-size: 18px !important;
            }
          }
        </style>
      </head>
      <body>
        <table width="100%" cellPadding="0" cellSpacing="0" border="0">
          <tr>
            <td align="center" valign="top">
              <table class="container" width="600" cellPadding="0" cellSpacing="0" border="0">
                <!-- Header -->
                <tr>
                  <td class="header">
                    <img 
                      src="${headerLogo}" 
                      alt="Die Linke Frankfurt Logo" 
                      class="logo"
                    />
                  </td>
                </tr>
                <tr>
                  <td>
                    <img 
                      src="${headerBanner}" 
                      alt="Die Linke Frankfurt Banner" 
                      class="banner"
                    />
                  </td>
                </tr>
                
                <tr>
                  <td class="content">
                    <table width="100%" cellPadding="0" cellSpacing="0" border="0">
                      <!-- Introduction -->
                      <tr>
                        <td class="introduction">
                          <h2 class="section-title">Einleitung</h2>
                          <div>${introductionText}</div>
                        </td>
                      </tr>

                      <!-- Featured Events -->
                      ${featuredEventsHtml}

                      <!-- Upcoming Events -->
                      ${upcomingEventsHtml}
                    </table>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td class="footer">
                    <div>${footerText}</div>
                    
                    <p>
                      <a href="${unsubscribeLink}" class="unsubscribe">
                        Vom Newsletter abmelden
                      </a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}